import { createConnection, type Socket } from 'node:net';
import { GodotFlowError } from '../errors.js';
import type { DAPConfig, ExecutionResult } from '../types/engine.js';

type JsonRecord = Record<string, unknown>;

type PendingRequest = {
  resolve: (value: JsonRecord) => void;
  reject: (reason?: unknown) => void;
  timer: NodeJS.Timeout;
  command: string;
};

interface DAPMessage {
  seq: number;
  type: 'request' | 'response' | 'event';
  command?: string;
  arguments?: unknown;
  request_seq?: number;
  success?: boolean;
  message?: string;
  body?: JsonRecord;
  event?: string;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function parseStringArg(args: JsonRecord, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new GodotFlowError('INVALID_ARGS', `Argument ${key} must be a non-empty string`, {
      key,
      value,
    });
  }

  return value;
}

function parseLineArg(args: JsonRecord, key: string): number {
  const value = args[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new GodotFlowError('INVALID_ARGS', `Argument ${key} must be a positive integer`, {
      key,
      value,
    });
  }

  return value;
}

function parseOptionalThreadId(args: JsonRecord): number | undefined {
  const value = args.threadId;
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new GodotFlowError('INVALID_ARGS', 'Argument threadId must be a positive integer', {
      threadId: value,
    });
  }

  return value;
}

function parseOptionalFrameId(args: JsonRecord): number | undefined {
  const value = args.frameId;
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new GodotFlowError('INVALID_ARGS', 'Argument frameId must be a non-negative integer', {
      frameId: value,
    });
  }

  return value;
}

class GodotDAPClient {
  private readonly host: string;
  private readonly port: number;
  private readonly timeoutMs: number;

  private socket: Socket | null = null;
  private connected = false;
  private initialized = false;
  private attached = false;
  private seq = 1;
  private pendingRequests: Map<number, PendingRequest> = new Map();
  private buffer = '';
  private lastThreadId = 1;
  private breakpoints: Map<string, Set<number>> = new Map();

  constructor(config: DAPConfig) {
    this.host = config.host;
    this.port = config.port;
    this.timeoutMs = config.timeoutMs;
  }

  async connect(): Promise<void> {
    if (this.connected && this.socket) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const socket = createConnection({ host: this.host, port: this.port });
      this.socket = socket;
      socket.setEncoding('utf8');

      const connectTimer = setTimeout(() => {
        if (settled) {
          return;
        }

        settled = true;
        socket.destroy();
        this.socket = null;
        reject(
          new GodotFlowError('ENGINE_TIMEOUT', `DAP connection timed out after ${this.timeoutMs}ms`, {
            host: this.host,
            port: this.port,
            timeoutMs: this.timeoutMs,
          }),
        );
      }, this.timeoutMs);

      socket.once('connect', () => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(connectTimer);
        this.connected = true;

        socket.on('data', (chunk: string) => {
          this.buffer += chunk;
          this.parseMessages();
        });

        socket.on('error', (error: Error) => {
          this.handleSocketFailure(error);
        });

        socket.on('close', () => {
          this.handleSocketClose();
        });

        resolve();
      });

      socket.once('error', (error: Error) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(connectTimer);
        this.socket = null;
        reject(
          new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Failed to connect to Godot DAP server', {
            host: this.host,
            port: this.port,
            message: error.message,
          }),
        );
      });
    });
  }

  async disconnect(): Promise<void> {
    if (!this.socket) {
      this.connected = false;
      this.initialized = false;
      this.attached = false;
      return;
    }

    const socketToClose = this.socket;

    if (this.connected) {
      try {
        await this.sendRequest('disconnect', { restart: false });
      } catch {
        /* intentionally swallowed - best-effort disconnect */
      }
    }

    this.socket = null;
    this.connected = false;
    this.initialized = false;
    this.attached = false;

    await new Promise<void>((resolve) => {
      socketToClose.once('close', () => resolve());
      socketToClose.end();
      setTimeout(() => {
        if (!socketToClose.destroyed) {
          socketToClose.destroy();
        }
        resolve();
      }, 500);
    });
  }

  private async ensureConnected(): Promise<void> {
    if (!this.connected || !this.socket) {
      await this.connect();
    }
  }

  private handleSocketFailure(error: Error): void {
    this.connected = false;
    this.initialized = false;
    this.attached = false;
    this.socket = null;
    this.failPendingRequests(
      new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Godot DAP socket error', {
        host: this.host,
        port: this.port,
        message: error.message,
      }),
    );
  }

  private handleSocketClose(): void {
    this.connected = false;
    this.initialized = false;
    this.attached = false;
    this.socket = null;
    this.failPendingRequests(
      new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Godot DAP socket closed', {
        host: this.host,
        port: this.port,
      }),
    );
  }

  private failPendingRequests(error: GodotFlowError): void {
    this.pendingRequests.forEach((pending, seq) => {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pendingRequests.delete(seq);
    });
  }

  private frameMessage(content: string): string {
    return `Content-Length: ${Buffer.byteLength(content, 'utf8')}\r\n\r\n${content}`;
  }

  private parseMessages(): void {
    while (true) {
      const headerEndIndex = this.buffer.indexOf('\r\n\r\n');
      if (headerEndIndex === -1) {
        return;
      }

      const headerText = this.buffer.slice(0, headerEndIndex);
      const headerLines = headerText.split('\r\n');

      let contentLength = -1;
      for (const line of headerLines) {
        const [rawKey, rawValue] = line.split(':');
        if (!rawKey || !rawValue) {
          continue;
        }

        if (rawKey.trim().toLowerCase() === 'content-length') {
          const parsed = Number.parseInt(rawValue.trim(), 10);
          if (!Number.isNaN(parsed) && parsed >= 0) {
            contentLength = parsed;
          }
        }
      }

      if (contentLength < 0) {
        this.buffer = this.buffer.slice(headerEndIndex + 4);
        continue;
      }

      const totalLength = headerEndIndex + 4 + contentLength;
      if (this.buffer.length < totalLength) {
        return;
      }

      const bodyText = this.buffer.slice(headerEndIndex + 4, totalLength);
      this.buffer = this.buffer.slice(totalLength);

      let parsed: unknown;
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        /* parse failed - fallback below */
        continue;
      }

      if (!isRecord(parsed)) {
        continue;
      }

      const messageType = typeof parsed.type === 'string' ? parsed.type : undefined;

      if (messageType === 'response') {
        const requestSeq = typeof parsed.request_seq === 'number' ? parsed.request_seq : undefined;
        if (typeof requestSeq !== 'number') {
          continue;
        }

        const pending = this.pendingRequests.get(requestSeq);
        if (!pending) {
          continue;
        }

        clearTimeout(pending.timer);
        this.pendingRequests.delete(requestSeq);

        const success = parsed.success === true;
        if (success) {
          const body = isRecord(parsed.body) ? parsed.body : {};
          pending.resolve(body);
        } else {
          const messageText = typeof parsed.message === 'string' ? parsed.message : undefined;
          pending.reject(
            new GodotFlowError(
              'EXECUTION_FAILED',
              messageText ?? `DAP request failed: ${pending.command}`,
              {
                command: pending.command,
                requestSeq,
              },
            ),
          );
        }

        continue;
      }

      if (messageType === 'event') {
        const eventName = typeof parsed.event === 'string' ? parsed.event : undefined;
        const eventBody = isRecord(parsed.body) ? parsed.body : undefined;

        if (eventName === 'stopped') {
          const threadId = eventBody?.threadId;
          if (typeof threadId === 'number' && threadId > 0) {
            this.lastThreadId = threadId;
          }
        }

        if (eventName === 'terminated' || eventName === 'exited') {
          this.attached = false;
        }
      }
    }
  }

  private async sendRequest(command: string, args?: JsonRecord): Promise<JsonRecord> {
    await this.ensureConnected();

    if (!this.socket) {
      throw new GodotFlowError('ENGINE_CONNECTION_FAILED', 'DAP socket unavailable', {
        command,
      });
    }

    const requestSeq = this.seq;
    this.seq += 1;

    const request: DAPMessage = {
      seq: requestSeq,
      type: 'request',
      command,
      arguments: args,
    };

    const payload = this.frameMessage(JSON.stringify(request));

    return new Promise<JsonRecord>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestSeq);
        reject(
          new GodotFlowError('ENGINE_TIMEOUT', `DAP request timed out after ${this.timeoutMs}ms`, {
            command,
            timeoutMs: this.timeoutMs,
          }),
        );
      }, this.timeoutMs);

      this.pendingRequests.set(requestSeq, {
        resolve,
        reject,
        timer,
        command,
      });

      this.socket?.write(payload, (error?: Error | null) => {
        if (!error) {
          return;
        }

        clearTimeout(timer);
        this.pendingRequests.delete(requestSeq);
        reject(
          new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Failed to send DAP request', {
            command,
            message: error.message,
          }),
        );
      });
    });
  }

  async initialize(): Promise<JsonRecord> {
    await this.ensureConnected();

    if (this.initialized) {
      return {};
    }

    const response = await this.sendRequest('initialize', {
      adapterID: 'godot',
      clientID: 'godot-flow',
      clientName: 'godot-flow',
      locale: 'en',
      linesStartAt1: true,
      columnsStartAt1: true,
      pathFormat: 'path',
      supportsVariableType: true,
      supportsRunInTerminalRequest: false,
      supportsProgressReporting: false,
      supportsInvalidatedEvent: false,
      supportsMemoryReferences: false,
    });

    this.initialized = true;
    return response;
  }

  async attach(): Promise<void> {
    await this.ensureConnected();

    if (this.attached) {
      return;
    }

    await this.initialize();
    await this.sendRequest('attach', {});
    await this.sendRequest('configurationDone', {});
    this.attached = true;
  }

  private async resolveThreadId(threadId?: number): Promise<number> {
    if (typeof threadId === 'number' && threadId > 0) {
      this.lastThreadId = threadId;
      return threadId;
    }

    if (this.lastThreadId > 0) {
      return this.lastThreadId;
    }

    try {
      const response = await this.sendRequest('threads');
      const threads = response.threads;
      if (Array.isArray(threads) && threads.length > 0) {
        const firstThread = threads[0];
        if (isRecord(firstThread) && typeof firstThread.id === 'number' && firstThread.id > 0) {
          this.lastThreadId = firstThread.id;
          return firstThread.id;
        }
      }
    } catch {
      /* intentionally swallowed - thread fallback */
    }

    return 1;
  }

  async setBreakpoint(scriptPath: string, line: number): Promise<JsonRecord> {
    await this.attach();

    const fileBreakpoints = this.breakpoints.get(scriptPath) ?? new Set<number>();
    fileBreakpoints.add(line);
    this.breakpoints.set(scriptPath, fileBreakpoints);

    const lines = Array.from(fileBreakpoints).sort((a, b) => a - b);
    return this.sendRequest('setBreakpoints', {
      source: { path: scriptPath },
      breakpoints: lines.map((breakpointLine) => ({ line: breakpointLine })),
    });
  }

  async removeBreakpoint(scriptPath: string, line: number): Promise<JsonRecord> {
    await this.attach();

    const fileBreakpoints = this.breakpoints.get(scriptPath) ?? new Set<number>();
    fileBreakpoints.delete(line);

    if (fileBreakpoints.size === 0) {
      this.breakpoints.delete(scriptPath);
    } else {
      this.breakpoints.set(scriptPath, fileBreakpoints);
    }

    const lines = Array.from(fileBreakpoints).sort((a, b) => a - b);
    return this.sendRequest('setBreakpoints', {
      source: { path: scriptPath },
      breakpoints: lines.map((breakpointLine) => ({ line: breakpointLine })),
    });
  }

  async continueExecution(threadId?: number): Promise<JsonRecord> {
    await this.attach();
    const resolvedThreadId = await this.resolveThreadId(threadId);
    return this.sendRequest('continue', { threadId: resolvedThreadId });
  }

  async stepOver(threadId?: number): Promise<JsonRecord> {
    await this.attach();
    const resolvedThreadId = await this.resolveThreadId(threadId);
    return this.sendRequest('next', { threadId: resolvedThreadId });
  }

  async stepInto(threadId?: number): Promise<JsonRecord> {
    await this.attach();
    const resolvedThreadId = await this.resolveThreadId(threadId);
    return this.sendRequest('stepIn', { threadId: resolvedThreadId });
  }

  async stepOut(threadId?: number): Promise<JsonRecord> {
    await this.attach();
    const resolvedThreadId = await this.resolveThreadId(threadId);
    return this.sendRequest('stepOut', { threadId: resolvedThreadId });
  }

  async evaluate(expression: string, threadId?: number, frameId?: number): Promise<JsonRecord> {
    await this.attach();

    const resolvedThreadId = await this.resolveThreadId(threadId);
    const payload: JsonRecord = {
      expression,
      context: 'repl',
      threadId: resolvedThreadId,
    };

    if (typeof frameId === 'number') {
      payload.frameId = frameId;
    }

    return this.sendRequest('evaluate', payload);
  }

  async pause(threadId?: number): Promise<JsonRecord> {
    await this.attach();
    const resolvedThreadId = await this.resolveThreadId(threadId);
    return this.sendRequest('pause', { threadId: resolvedThreadId });
  }
}

export async function executeDAP(
  fnName: string,
  args: Record<string, unknown>,
  config: DAPConfig,
): Promise<ExecutionResult> {
  const startedAt = Date.now();
  const client = new GodotDAPClient(config);
  const safeArgs: JsonRecord = isRecord(args) ? args : {};

  try {
    let data: unknown;

    switch (fnName) {
      case 'dap_set_breakpoint': {
        data = await client.setBreakpoint(
          parseStringArg(safeArgs, 'scriptPath'),
          parseLineArg(safeArgs, 'line'),
        );
        break;
      }
      case 'dap_remove_breakpoint': {
        data = await client.removeBreakpoint(
          parseStringArg(safeArgs, 'scriptPath'),
          parseLineArg(safeArgs, 'line'),
        );
        break;
      }
      case 'dap_continue': {
        data = await client.continueExecution(parseOptionalThreadId(safeArgs));
        break;
      }
      case 'dap_step_over': {
        data = await client.stepOver(parseOptionalThreadId(safeArgs));
        break;
      }
      case 'dap_step_into': {
        data = await client.stepInto(parseOptionalThreadId(safeArgs));
        break;
      }
      case 'dap_step_out': {
        data = await client.stepOut(parseOptionalThreadId(safeArgs));
        break;
      }
      case 'dap_evaluate': {
        data = await client.evaluate(
          parseStringArg(safeArgs, 'expression'),
          parseOptionalThreadId(safeArgs),
          parseOptionalFrameId(safeArgs),
        );
        break;
      }
      case 'dap_pause': {
        data = await client.pause(parseOptionalThreadId(safeArgs));
        break;
      }
      default:
        throw new GodotFlowError('FUNCTION_NOT_FOUND', `Unsupported DAP function: ${fnName}`, {
          fnName,
        });
    }

    return {
      success: true,
      data,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    if (error instanceof GodotFlowError) {
      if (
        error.code === 'ENGINE_CONNECTION_FAILED'
        || error.code === 'ENGINE_TIMEOUT'
        || error.code === 'FUNCTION_NOT_FOUND'
        || error.code === 'INVALID_ARGS'
      ) {
        throw error;
      }

      throw new GodotFlowError('EXECUTION_FAILED', error.message, {
        fnName,
        args: safeArgs,
        ...(isRecord(error.details) ? error.details : { cause: error.details }),
      });
    }

    const message = toErrorMessage(error);
    if (message.includes('timed out')) {
      throw new GodotFlowError('ENGINE_TIMEOUT', `DAP execution timed out: ${message}`, {
        fnName,
        args: safeArgs,
      });
    }

    if (
      message.includes('ECONNREFUSED')
      || message.includes('socket')
      || message.includes('connect')
      || message.includes('DAP connection')
    ) {
      throw new GodotFlowError('ENGINE_CONNECTION_FAILED', `DAP connection failed: ${message}`, {
        fnName,
        args: safeArgs,
      });
    }

    throw new GodotFlowError('EXECUTION_FAILED', `DAP execution failed: ${message}`, {
      fnName,
      args: safeArgs,
    });
  } finally {
    await client.disconnect();
  }
}
