import type { ChildProcess } from 'child_process';
import tcpPortUsed from 'tcp-port-used';
import type { PortScanRange } from './types';

const HOST = '127.0.0.1';

export class PortDetector {
  private readonly regexes: RegExp[];
  private resolvedPort?: number;
  private resolveFn?: (port: number) => void;
  private rejectFn?: (error: Error) => void;
  private timeout?: NodeJS.Timeout;
  private readonly listeners: Array<(port: number) => void> = [];

  constructor(private readonly options: { patterns: string[]; range: PortScanRange; timeoutMs?: number }) {
    this.regexes = options.patterns.map((pattern) => new RegExp(pattern, 'i'));
  }

  attach(child: ChildProcess): void {
    child.stdout?.on('data', (data) => this.inspectBuffer(data.toString()));
    child.stderr?.on('data', (data) => this.inspectBuffer(data.toString()));
  }

  async waitForPort(portHint?: number): Promise<number> {
    if (this.resolvedPort) {
      return this.resolvedPort;
    }

    return await new Promise<number>((resolve, reject) => {
      this.resolveFn = resolve;
      this.rejectFn = reject;
      this.startTimeout();
      if (portHint) {
        this.awaitPortUsage(portHint).catch(() => this.scanRange());
      } else {
        this.scanRange();
      }
    });
  }

  onPort(listener: (port: number) => void): void {
    this.listeners.push(listener);
    if (this.resolvedPort) {
      listener(this.resolvedPort);
    }
  }

  private inspectBuffer(buffer: string): void {
    for (const regex of this.regexes) {
      const match = buffer.match(regex);
      if (match && match[1]) {
        const detected = Number(match[1]);
        if (Number.isInteger(detected) && detected > 0) {
          this.setPort(detected);
          return;
        }
      }
    }
  }

  private async awaitPortUsage(port: number): Promise<void> {
    try {
      await tcpPortUsed.waitUntilUsedOnHost(port, HOST, 200, 15000);
      this.setPort(port);
    } catch (error) {
      if (!this.resolvedPort) {
        this.scanRange();
      }
    }
  }

  private async scanRange(): Promise<void> {
    const { start, end } = this.options.range;
    for (let port = start; port <= end; port += 1) {
      if (this.resolvedPort) return;
      const inUse = await tcpPortUsed.check(port, HOST);
      if (inUse) {
        this.setPort(port);
        return;
      }
    }
    if (!this.resolvedPort) {
      setTimeout(() => this.scanRange(), 400);
    }
  }

  private setPort(port: number): void {
    const firstDetection = !this.resolvedPort;
    const changed = this.resolvedPort !== port;
    this.resolvedPort = port;
    if (firstDetection && this.timeout) {
      clearTimeout(this.timeout);
    }
    if (firstDetection) {
      this.resolveFn?.(port);
    }
    if (firstDetection || changed) {
      this.listeners.forEach((listener) => {
        try {
          listener(port);
        } catch (error) {
          console.error('Error inside port listener', error);
        }
      });
    }
  }

  private startTimeout(): void {
    const timeoutMs = this.options.timeoutMs ?? 60000;
    this.timeout = setTimeout(() => {
      if (this.rejectFn && !this.resolvedPort) {
        this.rejectFn(new Error('Timed out waiting for dev server port.')); 
      }
    }, timeoutMs);
  }
}
