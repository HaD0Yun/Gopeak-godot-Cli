import { createConnection, createServer, type Server, type Socket } from 'node:net';
import { unlink, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GodotFlowError } from '../errors.js';
import type { DAPConfig } from '../types/engine.js';

type JsonRecord = Record<string, unknown>;

type PendingRequest = {
  resolve: (value: JsonRecord) => void;
  reject: (reason?: unknown) => void;
  timer: NodeJS.Timeout;
  command: string;
};

export interface DaemonStatus {
  running: boolean;
  pid: number | null;
  pidFile: string;
  socketPath: string;
  host?: string;
  port?: number;
  connected?: boolean;
  startedAt?: number;
  stalePidCleaned?: boolean;
}

interface DAPDaemonProcess {
  config: DAPConfig;
  server: Server;
  dap: PersistentDAPClient;
  status: DaemonStatus;
  shuttingDown: boolean;
}

const PID_FILE = '/tmp/godot-flow-dap.pid';
const IPC_SOCKET_PATH = join(tmpdir(), 'godot-flow-dap.sock');
const IPC_TIMEOUT_MS = 5000;

let daemonState: DAPDaemonProcess | null = null;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function safeUnlink(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    const errno = error as NodeJS.ErrnoException;
    if (errno.code !== 'ENOENT') {
      throw error;
    }
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    /* intentionally swallowed - probe failed */
    return false;
  }
}

async function readPidFile(): Promise<number | null> {
  try {
    const raw = await readFile(PID_FILE, 'utf8');
    const pid = Number.parseInt(raw.trim(), 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    /* intentionally swallowed - pid file unavailable */
    return null;
  }
}

async function cleanupStalePidFile(): Promise<boolean> {
  const pid = await readPidFile();
  if (!pid) {
    return false;
  }

  if (isProcessAlive(pid)) {
    return false;
  }

  await safeUnlink(PID_FILE);
  return true;
}

async function cleanupStaleSocketFile(): Promise<void> {
  if (!existsSync(IPC_SOCKET_PATH)) {
    return;
  }

  await safeUnlink(IPC_SOCKET_PATH);
}

class PersistentDAPClient {
  private readonly host: string;
  private readonly port: number;
  private readonly timeoutMs: number;

  private socket: Socket | null = null;
  private connected = false;
  private initialized = false;
  private attached = false;
  private seq = 1;
  private buffer = '';
  private pendingRequests: Map<number, PendingRequest> = new Map();
  private lastThreadId = 1;
  private breakpoints: Map<string, Set<number>> = new Map();
  private reconnecting = false;

  constructor(config: DAPConfig) {
    this.host = config.host;
    this.port = config.port;
    this.timeoutMs = config.timeoutMs;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private frameMessage(content: string): string {
    return `Content-Length: ${Buffer.byteLength(content, 'utf8')}\r\n\r\n${content}`;
  }

  private failPendingRequests(error: GodotFlowError): void {
    this.pendingRequests.forEach((pending, id) => {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pendingRequests.delete(id);
    });
  }

  private handleSocketCloseOrError(reason: string): void {
    this.connected = false;
    this.initialized = false;
    this.attached = false;
    this.socket = null;
    this.failPendingRequests(
      new GodotFlowError('ENGINE_CONNECTION_FAILED', reason, {
        host: this.host,
        port: this.port,
      }),
    );
  }

  private parseMessages(): void {
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) {
        return;
      }

      const header = this.buffer.slice(0, headerEnd);
      const lines = header.split('\r\n');
      let contentLength = -1;

      for (const line of lines) {
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
        this.buffer = this.buffer.slice(headerEnd + 4);
        continue;
      }

      const totalLength = headerEnd + 4 + contentLength;
      if (this.buffer.length < totalLength) {
        return;
      }

      const bodyText = this.buffer.slice(headerEnd + 4, totalLength);
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
              { command: pending.command },
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

  async connect(): Promise<void> {
    if (this.connected && this.socket) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const socket = createConnection({ host: this.host, port: this.port });
      this.socket = socket;
      socket.setEncoding('utf8');

      const timer = setTimeout(() => {
        if (settled) {
          return;
        }

        settled = true;
        socket.destroy();
        this.socket = null;
        reject(
          new GodotFlowError('ENGINE_TIMEOUT', `DAP daemon connection timed out after ${this.timeoutMs}ms`, {
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
        clearTimeout(timer);
        this.connected = true;

        socket.on('data', (chunk: string) => {
          this.buffer += chunk;
          this.parseMessages();
        });

        socket.on('error', (error: Error) => {
          this.handleSocketCloseOrError(`Godot DAP socket error: ${error.message}`);
        });

        socket.on('close', () => {
          this.handleSocketCloseOrError('Godot DAP socket closed');
        });

        resolve();
      });

      socket.once('error', (error: Error) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);
        this.socket = null;
        reject(
          new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Failed to connect daemon to Godot DAP server', {
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
    this.socket = null;
    this.connected = false;
    this.initialized = false;
    this.attached = false;

    try {
      await this.sendRequest('disconnect', { restart: false });
    } catch {
      /* intentionally swallowed - best-effort disconnect */
    }

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

  private async sendRequest(command: string, args?: JsonRecord): Promise<JsonRecord> {
    await this.ensureConnected();

    if (!this.socket) {
      throw new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Daemon DAP socket unavailable', {
        command,
      });
    }

    const requestSeq = this.seq;
    this.seq += 1;
    const payload = this.frameMessage(
      JSON.stringify({ seq: requestSeq, type: 'request', command, arguments: args }),
    );

    return new Promise<JsonRecord>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestSeq);
        reject(
          new GodotFlowError('ENGINE_TIMEOUT', `DAP daemon request timed out after ${this.timeoutMs}ms`, {
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

      const socket = this.socket;
      if (!socket) {
        clearTimeout(timer);
        this.pendingRequests.delete(requestSeq);
        reject(
          new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Daemon DAP socket unavailable', {
            command,
          }),
        );
        return;
      }

      socket.write(payload, (error?: Error | null) => {
        if (!error) {
          return;
        }

        clearTimeout(timer);
        this.pendingRequests.delete(requestSeq);
        reject(
          new GodotFlowError('ENGINE_CONNECTION_FAILED', 'Failed to write daemon DAP request', {
            command,
            message: error.message,
          }),
        );
      });
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.sendRequest('initialize', {
      adapterID: 'godot',
      clientID: 'godot-flow-daemon',
      clientName: 'godot-flow-daemon',
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
  }

  async attach(): Promise<void> {
    if (this.attached) {
      return;
    }

    await this.ensureConnected();
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
        const first = threads[0];
        if (isRecord(first) && typeof first.id === 'number' && first.id > 0) {
          this.lastThreadId = first.id;
          return first.id;
        }
      }
    } catch {
      /* intentionally swallowed - thread fallback */
    }

    return 1;
  }

  private async ensureReadyForExecution(): Promise<void> {
    try {
      await this.attach();
    } catch (error) {
      if (this.reconnecting) {
        throw error;
      }

      this.reconnecting = true;
      try {
        await this.disconnect();
      } catch {
        /* intentionally swallowed - reconnect cleanup */
      }

      await this.connect();
      await this.attach();
      this.reconnecting = false;
    }
  }

  async execute(fnName: string, args: JsonRecord): Promise<JsonRecord> {
    await this.ensureReadyForExecution();

    switch (fnName) {
      case 'dap_set_breakpoint': {
        const scriptPath = typeof args.scriptPath === 'string' ? args.scriptPath : undefined;
        const line = typeof args.line === 'number' ? args.line : undefined;
        if (!scriptPath || typeof line !== 'number' || !Number.isInteger(line) || line <= 0) {
          throw new GodotFlowError('INVALID_ARGS', 'dap_set_breakpoint requires { scriptPath: string, line: number }');
        }

        const fileBreakpoints = this.breakpoints.get(scriptPath) ?? new Set<number>();
        fileBreakpoints.add(line);
        this.breakpoints.set(scriptPath, fileBreakpoints);
        const lines = Array.from(fileBreakpoints).sort((a, b) => a - b);
        return this.sendRequest('setBreakpoints', {
          source: { path: scriptPath },
          breakpoints: lines.map((bpLine) => ({ line: bpLine })),
        });
      }

      case 'dap_remove_breakpoint': {
        const scriptPath = typeof args.scriptPath === 'string' ? args.scriptPath : undefined;
        const line = typeof args.line === 'number' ? args.line : undefined;
        if (!scriptPath || typeof line !== 'number' || !Number.isInteger(line) || line <= 0) {
          throw new GodotFlowError('INVALID_ARGS', 'dap_remove_breakpoint requires { scriptPath: string, line: number }');
        }

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
          breakpoints: lines.map((bpLine) => ({ line: bpLine })),
        });
      }

      case 'dap_continue': {
        const threadId = await this.resolveThreadId(typeof args.threadId === 'number' ? args.threadId : undefined);
        return this.sendRequest('continue', { threadId });
      }
      case 'dap_step_over': {
        const threadId = await this.resolveThreadId(typeof args.threadId === 'number' ? args.threadId : undefined);
        return this.sendRequest('next', { threadId });
      }
      case 'dap_step_into': {
        const threadId = await this.resolveThreadId(typeof args.threadId === 'number' ? args.threadId : undefined);
        return this.sendRequest('stepIn', { threadId });
      }
      case 'dap_step_out': {
        const threadId = await this.resolveThreadId(typeof args.threadId === 'number' ? args.threadId : undefined);
        return this.sendRequest('stepOut', { threadId });
      }
      case 'dap_evaluate': {
        const expression = typeof args.expression === 'string' ? args.expression : undefined;
        if (!expression || expression.length === 0) {
          throw new GodotFlowError('INVALID_ARGS', 'dap_evaluate requires { expression: string }');
        }

        const threadId = await this.resolveThreadId(typeof args.threadId === 'number' ? args.threadId : undefined);
        const payload: JsonRecord = {
          expression,
          context: 'repl',
          threadId,
        };
        if (typeof args.frameId === 'number' && Number.isInteger(args.frameId) && args.frameId >= 0) {
          payload.frameId = args.frameId;
        }

        return this.sendRequest('evaluate', payload);
      }
      case 'dap_pause': {
        const threadId = await this.resolveThreadId(typeof args.threadId === 'number' ? args.threadId : undefined);
        return this.sendRequest('pause', { threadId });
      }
      default:
        throw new GodotFlowError('FUNCTION_NOT_FOUND', `Unsupported DAP function: ${fnName}`, { fnName });
    }
  }
}

async function sendIpcRequest(request: JsonRecord): Promise<JsonRecord> {
  return new Promise<JsonRecord>((resolve, reject) => {
    const socket = createConnection({ path: IPC_SOCKET_PATH });
    let buffer = '';
    let settled = false;

    const cleanup = (): void => {
      clearTimeout(timer);
      if (!socket.destroyed) {
        socket.destroy();
      }
    };

    const finishResolve = (value: JsonRecord): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(value);
    };

    const finishReject = (error: Error): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    const timer = setTimeout(() => {
      finishReject(new Error(`IPC request timed out after ${IPC_TIMEOUT_MS}ms`));
    }, IPC_TIMEOUT_MS);

    socket.setEncoding('utf8');

    socket.on('connect', () => {
      socket.write(`${JSON.stringify(request)}\n`);
    });

    socket.on('data', (chunk: string) => {
      buffer += chunk;
      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex === -1) {
        return;
      }

      const line = buffer.slice(0, newlineIndex).trim();
      if (!line) {
        finishReject(new Error('Empty IPC response'));
        return;
      }

      try {
        const parsed = JSON.parse(line) as unknown;
        if (!isRecord(parsed)) {
          finishReject(new Error('Invalid IPC response object'));
          return;
        }
        finishResolve(parsed);
      } catch (error) {
        finishReject(new Error(`Failed to parse IPC response: ${toErrorMessage(error)}`));
      }
    });

    socket.on('error', (error: Error) => {
      finishReject(error);
    });

    socket.on('end', () => {
      if (!settled) {
        finishReject(new Error('IPC socket closed before response')); 
      }
    });
  });
}

async function writeJsonLine(socket: Socket, payload: JsonRecord): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    socket.write(`${JSON.stringify(payload)}\n`, (error?: Error | null) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function handleClientMessage(processState: DAPDaemonProcess, socket: Socket, rawLine: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawLine);
  } catch (error) {
    await writeJsonLine(socket, {
      success: false,
      error: {
        code: 'INVALID_ARGS',
        message: `Invalid JSON request: ${toErrorMessage(error)}`,
      },
    });
    return;
  }

  if (!isRecord(parsed)) {
    await writeJsonLine(socket, {
      success: false,
      error: { code: 'INVALID_ARGS', message: 'IPC request must be a JSON object' },
    });
    return;
  }

  const action = typeof parsed.action === 'string' ? parsed.action : 'execute';

  try {
    if (action === 'status') {
      processState.status.connected = processState.dap.isConnected();
      await writeJsonLine(socket, { success: true, data: processState.status });
      return;
    }

    if (action === 'stop') {
      await writeJsonLine(socket, { success: true, data: { stopping: true } });
      setImmediate(() => {
        void shutdownDaemon(processState);
      });
      return;
    }

    if (action !== 'execute') {
      throw new GodotFlowError('FUNCTION_NOT_FOUND', `Unknown daemon action: ${action}`);
    }

    const fnName = typeof parsed.fnName === 'string' ? parsed.fnName : undefined;
    const args = isRecord(parsed.args) ? parsed.args : {};

    if (!fnName) {
      throw new GodotFlowError('INVALID_ARGS', 'Missing fnName for execute action');
    }

    const startedAt = Date.now();
    const data = await processState.dap.execute(fnName, args);
    processState.status.connected = processState.dap.isConnected();

    await writeJsonLine(socket, {
      success: true,
      data,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const normalized = error instanceof GodotFlowError
      ? error
      : new GodotFlowError('EXECUTION_FAILED', toErrorMessage(error));

    await writeJsonLine(socket, {
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details,
      },
    });
  }
}

async function shutdownDaemon(processState?: DAPDaemonProcess | null): Promise<void> {
  const state = processState ?? daemonState;
  if (!state || state.shuttingDown) {
    return;
  }

  state.shuttingDown = true;

  try {
    await state.dap.disconnect();
  } catch {
    /* intentionally swallowed - shutdown cleanup */
  }

  await new Promise<void>((resolve) => {
    state.server.close(() => resolve());
  });

  await Promise.all([safeUnlink(PID_FILE), safeUnlink(IPC_SOCKET_PATH)]);
  state.status.running = false;
  state.status.connected = false;

  if (daemonState === state) {
    daemonState = null;
  }
}

export async function startDaemon(config: DAPConfig): Promise<DaemonStatus> {
  if (daemonState) {
    daemonState.status.connected = daemonState.dap.isConnected();
    return { ...daemonState.status };
  }

  const existingPid = await readPidFile();
  if (existingPid && isProcessAlive(existingPid)) {
    try {
      const response = await sendIpcRequest({ action: 'status' });
      if (response.success === true && isRecord(response.data)) {
        const data = response.data;
        return {
          running: true,
          pid: typeof data.pid === 'number' ? data.pid : existingPid,
          pidFile: PID_FILE,
          socketPath: IPC_SOCKET_PATH,
          host: typeof data.host === 'string' ? data.host : config.host,
          port: typeof data.port === 'number' ? data.port : config.port,
          connected: typeof data.connected === 'boolean' ? data.connected : undefined,
          startedAt: typeof data.startedAt === 'number' ? data.startedAt : undefined,
          stalePidCleaned: false,
        };
      }
    } catch {
      /* intentionally swallowed - ipc probe fallback */
    }

    await safeUnlink(PID_FILE);
  }

  const stalePidCleaned = await cleanupStalePidFile();
  await cleanupStaleSocketFile();

  const dap = new PersistentDAPClient(config);
  try {
    await dap.connect();
    await dap.attach();
  } catch {
    /* intentionally swallowed - preattach may fail */
  }

  const server = createServer();
  const status: DaemonStatus = {
    running: true,
    pid: process.pid,
    pidFile: PID_FILE,
    socketPath: IPC_SOCKET_PATH,
    host: config.host,
    port: config.port,
    connected: dap.isConnected(),
    startedAt: Date.now(),
    stalePidCleaned,
  };

  const processState: DAPDaemonProcess = {
    config,
    server,
    dap,
    status,
    shuttingDown: false,
  };

  server.on('connection', (socket) => {
    socket.setEncoding('utf8');
    let buffer = '';

    socket.on('data', (chunk: string) => {
      buffer += chunk;

      while (true) {
        const newlineIndex = buffer.indexOf('\n');
        if (newlineIndex === -1) {
          return;
        }

        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (!line) {
          continue;
        }

        void handleClientMessage(processState, socket, line);
      }
    });
  });

  server.on('error', (error) => {
    void shutdownDaemon(processState).finally(() => {
      throw error;
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', (error) => {
      reject(error);
    });

    server.listen(IPC_SOCKET_PATH, () => {
      resolve();
    });
  });

  await writeFile(PID_FILE, `${process.pid}\n`, 'utf8');
  daemonState = processState;

  const shutdownSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of shutdownSignals) {
    process.once(signal, () => {
      void shutdownDaemon(processState).finally(() => {
        process.exit(0);
      });
    });
  }

  process.once('uncaughtException', (error) => {
    void shutdownDaemon(processState).finally(() => {
      process.stderr.write(`godot-flow dap-daemon uncaughtException: ${error.message}\n`);
      process.exit(1);
    });
  });

  process.once('unhandledRejection', (reason) => {
    void shutdownDaemon(processState).finally(() => {
      process.stderr.write(`godot-flow dap-daemon unhandledRejection: ${toErrorMessage(reason)}\n`);
      process.exit(1);
    });
  });

  return { ...status };
}

export async function stopDaemon(): Promise<{ stopped: boolean; viaIpc: boolean }> {
  if (daemonState) {
    await shutdownDaemon(daemonState);
    return { stopped: true, viaIpc: false };
  }

  const pid = await readPidFile();
  if (!pid) {
    await safeUnlink(IPC_SOCKET_PATH);
    return { stopped: false, viaIpc: false };
  }

  if (!isProcessAlive(pid)) {
    await Promise.all([safeUnlink(PID_FILE), safeUnlink(IPC_SOCKET_PATH)]);
    return { stopped: false, viaIpc: false };
  }

  try {
    const response = await sendIpcRequest({ action: 'stop' });
    if (response.success === true) {
      return { stopped: true, viaIpc: true };
    }
  } catch {
    /* intentionally swallowed - ipc fallback */
  }

  process.kill(pid, 'SIGTERM');
  return { stopped: true, viaIpc: false };
}

export async function getDaemonStatus(): Promise<DaemonStatus> {
  if (daemonState) {
    daemonState.status.connected = daemonState.dap.isConnected();
    return { ...daemonState.status };
  }

  const pid = await readPidFile();
  if (!pid) {
    return {
      running: false,
      pid: null,
      pidFile: PID_FILE,
      socketPath: IPC_SOCKET_PATH,
    };
  }

  if (!isProcessAlive(pid)) {
    await Promise.all([safeUnlink(PID_FILE), safeUnlink(IPC_SOCKET_PATH)]);
    return {
      running: false,
      pid: null,
      pidFile: PID_FILE,
      socketPath: IPC_SOCKET_PATH,
      stalePidCleaned: true,
    };
  }

  try {
    const response = await sendIpcRequest({ action: 'status' });
    if (response.success === true && isRecord(response.data)) {
      const data = response.data;
      return {
        running: true,
        pid: typeof data.pid === 'number' ? data.pid : pid,
        pidFile: PID_FILE,
        socketPath: IPC_SOCKET_PATH,
        host: typeof data.host === 'string' ? data.host : undefined,
        port: typeof data.port === 'number' ? data.port : undefined,
        connected: typeof data.connected === 'boolean' ? data.connected : undefined,
        startedAt: typeof data.startedAt === 'number' ? data.startedAt : undefined,
        stalePidCleaned: false,
      };
    }
  } catch {
    /* intentionally swallowed - ipc fallback */
  }

  return {
    running: true,
    pid,
    pidFile: PID_FILE,
    socketPath: IPC_SOCKET_PATH,
    stalePidCleaned: false,
  };
}
