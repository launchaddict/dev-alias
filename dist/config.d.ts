import type { LoadedConfig } from './types';
export declare const STATE_DIR: any;
export declare const CERTS_DIR: any;
export declare function loadConfig(cwd?: any): Promise<LoadedConfig>;
export declare function ensureStateDirectories(): Promise<void>;
export declare function statePath(...segments: string[]): string;
export declare function isValidDomain(domain: string): boolean;
