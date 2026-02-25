import { readFile } from 'node:fs/promises';
import { createConnection, type Socket } from 'node:net';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { GodotFlowError } from '../errors.js';
import type { ExecutionResult, LSPConfig } from '../types/engine.js';

type JsonRecord = Record<string, unknown>;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timer: NodeJS.Timeout;
};

type DiagnosticsWaiter = {
  resolve: (diagnostics: unknown[]) => void;
  timer: NodeJS.Timeout;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function hasCode(error: unknown, code: string): boolean {
  return isRecord(error) && typeof error.code === 'string' && error.code === code;
}

function parseNumber(value: unknown, name: string): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    throw new GodotFlowError('INVALID_ARGS', `Argument ${name} must be a number`, {
      name,
      value,
    });
  }
  return numeric;
}

function parseString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new GodotFlowError('INVALID_ARGS', `Argument ${name} must be a non-empty string`, {
      name,
      value,
    });
  }
  return value;
}

function getStringArg(args: JsonRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

async function loadDocumentContent(args: JsonRecord): Promise<{ filePath: string; content: string }> {
  const filePath = getStringArg(args, ['filePath', 'scriptPath', 'path', 'uriPath']);
  if (!filePath) {
    throw new GodotFlowError('INVALID_ARGS', 'Missing required argument: filePath', {
      acceptedKeys: ['filePath', 'scriptPath', 'path', 'uriPath'],
    });
  }

  const resolvedPath = resolve(filePath);
  const contentArg = args.content;
  if (typeof contentArg === 'string') {
    return {
      filePath: resolvedPath,
      content: contentArg,
    };
  }

  try {
    const content = await readFile(resolvedPath, 'utf8');
    return {
      filePath: resolvedPath,
      content,
    };
  } catch (error) {
    throw new GodotFlowError('EXECUTION_FAILED', 'Failed to read LSP target file', {
      filePath: resolvedPath,
      message: toErrorMessage(error),
    });
  }
}

class GodotLSPClient {
  private readonly host: string;
  private readonly port: number;
  private readonly timeoutMs: number;
  private socket: Socket | null = null;
  private connected = false;
  private initialized = false;
  private connectPromise: Promise<void> | null = null;
  private requestId = 0;
  private buffer: Buffer = Buffer.alloc(0);
  private pendingRequests: Map<number, PendingRequest> = new Map();
  private diagnosticsWaiters: Map<string, DiagnosticsWaiter> = new Map();
  private documentVersions: Map<string, number> = new Map();

  constructor(config: LSPConfig) {
    this.host = config.host;
    this.port = config.port;
    this.timeoutMs = config.timeoutMs;
  }

  async connect(): Promise<void> {
    if (this.connected && this.socket) {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise<void>((resolveConnect, rejectConnect) => {
      let settled = false;
      const socket = createConnection({ host: this.host, port: this.port }, () => {
        this.socket = socket;
        this.connected = true;
        this.buffer = Buffer.alloc(0);
        if (!settled) {
          settled = true;
          resolveConnect();
        }
      });

      socket.on('data', (chunk: Buffer) => {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        this.parseMessages();
      });

      socket.on('error', (error: Error) => {
        if (!settled && !this.connected) {
          settled = true;
          rejectConnect(
            new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Failed to connect to Godot LSP server', {
              host: this.host,
              port: this.port,
              message: error.message,
            }),
          );
        }
        this.handleSocketFailure(error);
      });

      socket.on('close', () => {
        this.handleSocketClose();
      });
    });

    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.socket) {
      this.connected = false;
      this.initialized = false;
      return;
    }

    const socketToClose = this.socket;
    this.socket = null;
    this.connected = false;
    this.initialized = false;

    await new Promise<void>((resolveClose) => {
      socketToClose.once('close', () => resolveClose());
      socketToClose.end();
      setTimeout(() => {
        if (!socketToClose.destroyed) {
          socketToClose.destroy();
        }
        resolveClose();
      }, 1000);
    });

    this.rejectAllPending(
      new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Disconnected from Godot LSP server', {
        host: this.host,
        port: this.port,
      }),
    );
    this.resolveAllDiagnosticsWaiters([]);
  }

  private async ensureConnected(): Promise<void> {
    if (!this.connected || !this.socket) {
      await this.connect();
    }
  }

  private async ensureInitializedForFile(filePath: string, projectPath?: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    const rootPath = projectPath ? resolve(projectPath) : dirname(resolve(filePath));
    await this.initialize(rootPath);
  }

  private frameMessage(content: string): string {
    const contentLength = Buffer.byteLength(content, 'utf8');
    return `Content-Length: ${contentLength}\r\n\r\n${content}`;
  }

  private parseMessages(): void {
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) {
        return;
      }

      const header = this.buffer.subarray(0, headerEnd).toString('utf8');
      const contentLengthMatch = header.match(/Content-Length:\s*(\d+)/i);
      if (!contentLengthMatch) {
        this.buffer = this.buffer.subarray(headerEnd + 4);
        continue;
      }

      const contentLength = Number.parseInt(contentLengthMatch[1], 10);
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + contentLength;
      if (this.buffer.length < bodyEnd) {
        return;
      }

      const body = this.buffer.subarray(bodyStart, bodyEnd).toString('utf8');
      this.buffer = this.buffer.subarray(bodyEnd);

      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        /* parse failed - fallback below */
        continue;
      }

      if (!isRecord(parsed)) {
        continue;
      }

      if (typeof parsed.id === 'number') {
        const pending = this.pendingRequests.get(parsed.id);
        if (pending) {
          clearTimeout(pending.timer);
          this.pendingRequests.delete(parsed.id);

          if (isRecord(parsed.error)) {
            const code = typeof parsed.error.code === 'number' ? parsed.error.code : 'unknown';
            const message = typeof parsed.error.message === 'string' ? parsed.error.message : 'Unknown LSP error';
            pending.reject(
              new GodotFlowError('EXECUTION_FAILED', `LSP error (${String(code)}): ${message}`, {
                code,
                lspMessage: message,
              }),
            );
          } else {
            pending.resolve(parsed.result);
          }
        }
      }

      if (parsed.method === 'textDocument/publishDiagnostics' && isRecord(parsed.params)) {
        const uri = typeof parsed.params.uri === 'string' ? parsed.params.uri : undefined;
        const diagnostics = Array.isArray(parsed.params.diagnostics) ? parsed.params.diagnostics : [];
        if (uri) {
          const waiter = this.diagnosticsWaiters.get(uri);
          if (waiter) {
            clearTimeout(waiter.timer);
            this.diagnosticsWaiters.delete(uri);
            waiter.resolve(diagnostics);
          }
        }
      }
    }
  }

  private rejectAllPending(error: GodotFlowError): void {
    this.pendingRequests.forEach((pending, id) => {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pendingRequests.delete(id);
    });
  }

  private resolveAllDiagnosticsWaiters(diagnostics: unknown[]): void {
    this.diagnosticsWaiters.forEach((waiter, uri) => {
      clearTimeout(waiter.timer);
      waiter.resolve(diagnostics);
      this.diagnosticsWaiters.delete(uri);
    });
  }

  private handleSocketFailure(error: Error): void {
    this.connected = false;
    this.initialized = false;
    this.socket = null;
    this.rejectAllPending(
      new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Godot LSP socket error', {
        host: this.host,
        port: this.port,
        message: error.message,
      }),
    );
    this.resolveAllDiagnosticsWaiters([]);
  }

  private handleSocketClose(): void {
    this.connected = false;
    this.initialized = false;
    this.socket = null;
    this.rejectAllPending(
      new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Godot LSP socket closed', {
        host: this.host,
        port: this.port,
      }),
    );
    this.resolveAllDiagnosticsWaiters([]);
  }

  private toFileUri(filePath: string): string {
    return pathToFileURL(resolve(filePath)).href;
  }

  private sendNotification(method: string, params?: unknown): void {
    if (!this.connected || !this.socket) {
      throw new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Not connected to Godot LSP server', {
        method,
      });
    }

    const payload = {
      jsonrpc: '2.0',
      method,
      params,
    };

    const framed = this.frameMessage(JSON.stringify(payload));
    this.socket.write(framed, 'utf8');
  }

  private async sendRequest(method: string, params?: unknown): Promise<unknown> {
    await this.ensureConnected();
    if (!this.socket) {
      throw new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Not connected to Godot LSP server', {
        method,
      });
    }

    this.requestId += 1;
    const id = this.requestId;

    const payload = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    const framed = this.frameMessage(JSON.stringify(payload));

    return new Promise<unknown>((resolveRequest, rejectRequest) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        rejectRequest(
          new GodotFlowError('ENGINE_TIMEOUT', `LSP request timed out after ${this.timeoutMs}ms`, {
            method,
            timeoutMs: this.timeoutMs,
          }),
        );
      }, this.timeoutMs);

      this.pendingRequests.set(id, {
        resolve: resolveRequest,
        reject: rejectRequest,
        timer,
      });

      const socket = this.socket;
      if (!socket) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        rejectRequest(
          new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Not connected to Godot LSP server', {
            method,
          }),
        );
        return;
      }

      socket.write(framed, 'utf8', (error?: Error | null) => {
        if (error) {
          clearTimeout(timer);
          this.pendingRequests.delete(id);
          rejectRequest(
            new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Failed to send LSP request', {
              method,
              message: error.message,
            }),
          );
        }
      });
    });
  }

  private syncDocument(filePath: string, content: string): string {
    const uri = this.toFileUri(filePath);
    const currentVersion = this.documentVersions.get(uri) ?? 0;
    const nextVersion = currentVersion + 1;
    this.documentVersions.set(uri, nextVersion);

    if (currentVersion === 0) {
      this.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri,
          languageId: 'gdscript',
          version: nextVersion,
          text: content,
        },
      });
      return uri;
    }

    this.sendNotification('textDocument/didChange', {
      textDocument: {
        uri,
        version: nextVersion,
      },
      contentChanges: [{ text: content }],
    });

    return uri;
  }

  async initialize(rootPath: string): Promise<void> {
    await this.ensureConnected();
    const resolvedRootPath = resolve(rootPath);
    const rootUri = pathToFileURL(resolvedRootPath).href;

    await this.sendRequest('initialize', {
      processId: process.pid,
      rootPath: resolvedRootPath,
      rootUri,
      capabilities: {
        textDocument: {
          publishDiagnostics: {},
          completion: {
            completionItem: {
              snippetSupport: true,
            },
          },
          hover: {
            contentFormat: ['markdown', 'plaintext'],
          },
          definition: {},
        },
      },
      workspaceFolders: [
        {
          uri: rootUri,
          name: resolvedRootPath,
        },
      ],
    });

    this.sendNotification('initialized', {});
    this.initialized = true;
  }

  async getDiagnostics(filePath: string, content: string, projectPath?: string): Promise<unknown[]> {
    await this.ensureConnected();
    await this.ensureInitializedForFile(filePath, projectPath);

    const uri = this.toFileUri(filePath);
    const diagnosticsPromise = new Promise<unknown[]>((resolveDiagnostics) => {
      const existing = this.diagnosticsWaiters.get(uri);
      if (existing) {
        clearTimeout(existing.timer);
      }

      const timer = setTimeout(() => {
        this.diagnosticsWaiters.delete(uri);
        resolveDiagnostics([]);
      }, this.timeoutMs);

      this.diagnosticsWaiters.set(uri, {
        resolve: resolveDiagnostics,
        timer,
      });
    });

    try {
      this.syncDocument(filePath, content);
      return await diagnosticsPromise;
    } catch (error) {
      const waiter = this.diagnosticsWaiters.get(uri);
      if (waiter) {
        clearTimeout(waiter.timer);
        this.diagnosticsWaiters.delete(uri);
      }
      throw error;
    }
  }

  async getCompletions(
    filePath: string,
    content: string,
    line: number,
    character: number,
    projectPath?: string,
  ): Promise<unknown[]> {
    await this.ensureConnected();
    await this.ensureInitializedForFile(filePath, projectPath);

    const uri = this.syncDocument(filePath, content);
    const result = await this.sendRequest('textDocument/completion', {
      textDocument: { uri },
      position: { line, character },
    });

    if (Array.isArray(result)) {
      return result;
    }
    if (isRecord(result) && Array.isArray(result.items)) {
      return result.items;
    }
    return [];
  }

  async getHover(
    filePath: string,
    content: string,
    line: number,
    character: number,
    projectPath?: string,
  ): Promise<unknown> {
    await this.ensureConnected();
    await this.ensureInitializedForFile(filePath, projectPath);

    const uri = this.syncDocument(filePath, content);
    return this.sendRequest('textDocument/hover', {
      textDocument: { uri },
      position: { line, character },
    });
  }

  async getDefinition(
    filePath: string,
    content: string,
    line: number,
    character: number,
    projectPath?: string,
  ): Promise<unknown> {
    await this.ensureConnected();
    await this.ensureInitializedForFile(filePath, projectPath);

    const uri = this.syncDocument(filePath, content);
    return this.sendRequest('textDocument/definition', {
      textDocument: { uri },
      position: { line, character },
    });
  }
}

export async function executeLSP(
  fnName: string,
  args: Record<string, unknown>,
  config: LSPConfig,
): Promise<ExecutionResult> {
  const startedAt = Date.now();
  const client = new GodotLSPClient(config);

  try {
    const parsedArgs: JsonRecord = isRecord(args) ? args : {};
    const { filePath, content } = await loadDocumentContent(parsedArgs);
    const projectPath = typeof config.projectPath === 'string' ? config.projectPath : undefined;

    let data: unknown;

    switch (fnName) {
      case 'lsp_diagnostics': {
        data = await client.getDiagnostics(filePath, content, projectPath);
        break;
      }

      case 'lsp_completion': {
        const line = parseNumber(parsedArgs.line, 'line');
        const character = parseNumber(parsedArgs.character, 'character');
        data = await client.getCompletions(filePath, content, line, character, projectPath);
        break;
      }

      case 'lsp_hover': {
        const line = parseNumber(parsedArgs.line, 'line');
        const character = parseNumber(parsedArgs.character, 'character');
        data = await client.getHover(filePath, content, line, character, projectPath);
        break;
      }

      case 'lsp_goto_definition': {
        const line = parseNumber(parsedArgs.line, 'line');
        const character = parseNumber(parsedArgs.character, 'character');
        data = await client.getDefinition(filePath, content, line, character, projectPath);
        break;
      }

      default:
        parseString(fnName, 'fnName');
        throw new GodotFlowError('FUNCTION_NOT_FOUND', `Unsupported LSP function: ${fnName}`, {
          fnName,
        });
    }

    return {
      success: true,
      data,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const detailsBase: Record<string, unknown> = {
      fnName,
      args,
      durationMs,
    };

    if (error instanceof GodotFlowError) {
      if (hasCode(error, 'ENGINE_CONNECTION_FAILED') || hasCode(error, 'ENGINE_TIMEOUT') || hasCode(error, 'EXECUTION_FAILED')) {
        throw error;
      }

      if (error.code === 'INVALID_ARGS' || error.code === 'FUNCTION_NOT_FOUND') {
        throw error;
      }

      throw new GodotFlowError('EXECUTION_FAILED', error.message, {
        ...detailsBase,
        ...(error.details ?? {}),
      });
    }

    const message = toErrorMessage(error);
    if (message.includes('timed out')) {
      throw new GodotFlowError('ENGINE_TIMEOUT', `LSP execution timed out: ${message}`, detailsBase);
    }

    if (
      message.includes('ECONNREFUSED')
      || message.includes('socket closed')
      || message.includes('connect')
      || message.includes('Not connected')
    ) {
      throw new GodotFlowError('ENGINE_CONNECTION_FAILED', `LSP connection failed: ${message}`, detailsBase);
    }

    throw new GodotFlowError('EXECUTION_FAILED', `LSP execution failed: ${message}`, detailsBase);
  } finally {
    await client.disconnect();
  }
}
