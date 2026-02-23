declare module 'tcp-port-used' {
  export function check(port: number, host?: string): Promise<boolean>;
  export function waitUntilUsed(port: number, host?: string, retryTimeMs?: number, timeoutMs?: number): Promise<void>;
  export function waitUntilUsedOnHost(port: number, host: string, retryTimeMs?: number, timeoutMs?: number): Promise<void>;
  export function waitUntilFree(port: number, host?: string, retryTimeMs?: number, timeoutMs?: number): Promise<void>;
  export function waitUntilFreeOnHost(port: number, host: string, retryTimeMs?: number, timeoutMs?: number): Promise<void>;
  export function waitForStatus(port: number, host: string, inUse: boolean, retryTimeMs?: number, timeoutMs?: number): Promise<void>;
}
