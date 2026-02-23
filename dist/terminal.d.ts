type Color = 'red' | 'green' | 'yellow' | 'cyan' | 'blue' | 'magenta';
export declare function colorize(text: string, color: Color, bold?: boolean): string;
export declare function logInfo(message: string): void;
export declare function logWarn(message: string): void;
export declare function logError(message: string): void;
export declare function logHighlight(message: string): void;
export declare function logCredit(): void;
export {};
