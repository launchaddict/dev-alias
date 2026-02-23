import type { RunnerContext } from './types';
export interface RunnerOptions extends RunnerContext {
    env?: Record<string, string>;
}
export declare function runWithProxy(options: RunnerOptions): Promise<void>;
