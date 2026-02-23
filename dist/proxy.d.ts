interface ProxyOptions {
    httpPort: number;
    fallbackHttpPort?: number;
    httpsPort?: number;
    fallbackHttpsPort?: number;
    httpsCredentials?: {
        key: Buffer;
        cert: Buffer;
    };
}
export declare class ProxyService {
    private readonly proxy;
    private readonly routes;
    private httpServer?;
    private httpsServer?;
    start(options: ProxyOptions): Promise<void>;
    stop(): Promise<void>;
    getBoundPorts(): {
        http?: number;
        https?: number;
    };
    upsertRoute(domain: string, target: string): void;
    removeRoute(domain: string): void;
    private createHttpServer;
    private createHttpsServer;
    private listen;
    private closeServer;
    private handleRequest;
    private handleUpgrade;
}
export {};
