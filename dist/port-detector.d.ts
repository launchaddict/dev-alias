import type { ChildProcess } from 'child_process';
import type { PortScanRange } from './types';
export declare class PortDetector {
    private readonly options;
    private readonly regexes;
    private resolvedPort?;
    private resolveFn?;
    private rejectFn?;
    private timeout?;
    private readonly listeners;
    constructor(options: {
        patterns: string[];
        range: PortScanRange;
        timeoutMs?: number;
    });
    attach(child: ChildProcess): void;
    waitForPort(portHint?: number): Promise<number>;
    onPort(listener: (port: number) => void): void;
    private inspectBuffer;
    private awaitPortUsage;
    private scanRange;
    private setPort;
    private startTimeout;
}
