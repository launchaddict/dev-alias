import http, { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import type { Server } from 'http';
import httpProxy from 'http-proxy';
import { logError, logInfo, logWarn } from './terminal';

interface ProxyOptions {
  httpPort: number;
  fallbackHttpPort?: number;
  httpsPort?: number;
  fallbackHttpsPort?: number;
  httpsCredentials?: { key: Buffer; cert: Buffer };
}

export class ProxyService {
  private readonly proxy = httpProxy.createProxyServer({ xfwd: true, ws: true });
  private readonly routes = new Map<string, string>();
  private httpServer?: Server;
  private httpsServer?: https.Server;

  async start(options: ProxyOptions): Promise<void> {
    this.httpServer = await this.createHttpServer(options.httpPort, options.fallbackHttpPort);
    this.httpServer.on('upgrade', (req, socket, head) => this.handleUpgrade(req, socket, head));

    if (options.httpsPort && options.httpsCredentials) {
      this.httpsServer = await this.createHttpsServer(options, options.httpsPort, options.fallbackHttpsPort);
      this.httpsServer.on('upgrade', (req, socket, head) => this.handleUpgrade(req, socket, head));
    }
  }

  async stop(): Promise<void> {
    await Promise.all([
      this.httpServer ? this.closeServer(this.httpServer) : Promise.resolve(),
      this.httpsServer ? this.closeServer(this.httpsServer) : Promise.resolve()
    ]);
    this.routes.clear();
  }

  getBoundPorts(): { http?: number; https?: number } {
    return {
      http: extractPort(this.httpServer),
      https: extractPort(this.httpsServer)
    };
  }

  upsertRoute(domain: string, target: string): void {
    const normalized = domain.toLowerCase();
    this.routes.set(normalized, target);
  }

  removeRoute(domain: string): void {
    this.routes.delete(domain.toLowerCase());
  }

  private async createHttpServer(port: number, fallback?: number): Promise<Server> {
    try {
      return (await this.listen(port, (req, res) => this.handleRequest(req, res))) as Server;
    } catch (error) {
      if (fallback && fallback !== port && isPortError(error)) {
        logWarn(`Port ${port} unavailable. Falling back to ${fallback}.`);
        return (await this.listen(fallback, (req, res) => this.handleRequest(req, res))) as Server;
      }
      throw error;
    }
  }

  private async createHttpsServer(options: ProxyOptions, port: number, fallback?: number): Promise<https.Server> {
    const listener = () =>
      https.createServer(
        {
          key: options.httpsCredentials?.key,
          cert: options.httpsCredentials?.cert
        },
        (req, res) => this.handleRequest(req, res)
      );

    try {
      return (await this.listen(port, undefined, listener)) as https.Server;
    } catch (error) {
      if (fallback && fallback !== port && isPortError(error)) {
        logWarn(`HTTPS port ${port} unavailable. Falling back to ${fallback}.`);
        return (await this.listen(fallback, undefined, listener)) as https.Server;
      }
      throw error;
    }
  }

  private async listen(
    port: number,
    handler?: (req: IncomingMessage, res: ServerResponse) => void,
    factory?: () => Server | https.Server
  ): Promise<Server | https.Server> {
    const server = factory ? factory() : http.createServer(handler);
    return await new Promise<Server | https.Server>((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, () => {
        server.removeListener('error', reject);
        const actualPort = extractPort(server) ?? port;
        logInfo(`proxy listening on port ${actualPort}`);
        resolve(server);
      });
    });
  }

  private async closeServer(server: Server | https.Server): Promise<void> {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const domain = (req.headers.host ?? '').split(':')[0].toLowerCase();
    const route = this.routes.get(domain);
    if (!route) {
      res.statusCode = 502;
      res.end(`/alias: no route configured for ${domain}`);
      return;
    }
    this.proxy.web(req, res, { target: route }, (error) => {
      logError(`Proxy error for ${domain}: ${error.message}`);
      if (!res.headersSent) {
        res.statusCode = 502;
      }
      res.end('/alias proxy error');
    });
  }

  private handleUpgrade(req: IncomingMessage, socket: any, head: any): void {
    const domain = (req.headers.host ?? '').split(':')[0].toLowerCase();
    const route = this.routes.get(domain);
    if (!route) {
      socket.destroy();
      return;
    }
    this.proxy.ws(req, socket, head, { target: route }, (error) => {
      logError(`Proxy websocket error for ${domain}: ${error.message}`);
      socket.destroy();
    });
  }
}

function isPortError(error: unknown): boolean {
  return Boolean(
    typeof error === 'object' &&
      error &&
      'code' in error &&
      ['EACCES', 'EADDRINUSE'].includes((error as NodeJS.ErrnoException).code ?? '')
  );
}

function extractPort(server?: Server | https.Server): number | undefined {
  if (!server) return undefined;
  const address = server.address();
  if (typeof address === 'object' && address) {
    return address.port;
  }
  return undefined;
}
