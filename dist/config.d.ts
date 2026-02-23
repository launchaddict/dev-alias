import type { LoadedConfig } from './types';
export declare const STATE_DIR: string;
export declare const CERTS_DIR: string;
export declare function loadConfig(cwd?: string): Promise<LoadedConfig>;
export declare function ensureStateDirectories(): Promise<void>;
export declare function statePath(...segments: string[]): string;
export declare function isValidDomain(domain: string): boolean;
