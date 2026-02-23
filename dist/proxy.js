"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyService = void 0;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const http_proxy_1 = __importDefault(require("http-proxy"));
const terminal_1 = require("./terminal");
class ProxyService {
    constructor() {
        this.proxy = http_proxy_1.default.createProxyServer({ xfwd: true, ws: true });
        this.routes = new Map();
    }
    async start(options) {
        this.httpServer = await this.createHttpServer(options.httpPort, options.fallbackHttpPort);
        this.httpServer.on('upgrade', (req, socket, head) => this.handleUpgrade(req, socket, head));
        if (options.httpsPort && options.httpsCredentials) {
            this.httpsServer = await this.createHttpsServer(options, options.httpsPort, options.fallbackHttpsPort);
            this.httpsServer.on('upgrade', (req, socket, head) => this.handleUpgrade(req, socket, head));
        }
    }
    async stop() {
        await Promise.all([
            this.httpServer ? this.closeServer(this.httpServer) : Promise.resolve(),
            this.httpsServer ? this.closeServer(this.httpsServer) : Promise.resolve()
        ]);
        this.routes.clear();
    }
    getBoundPorts() {
        return {
            http: extractPort(this.httpServer),
            https: extractPort(this.httpsServer)
        };
    }
    upsertRoute(domain, target) {
        const normalized = domain.toLowerCase();
        this.routes.set(normalized, target);
    }
    removeRoute(domain) {
        this.routes.delete(domain.toLowerCase());
    }
    async createHttpServer(port, fallback) {
        try {
            return (await this.listen(port, (req, res) => this.handleRequest(req, res)));
        }
        catch (error) {
            if (fallback && fallback !== port && isPortError(error)) {
                (0, terminal_1.logWarn)(`Port ${port} unavailable. Falling back to ${fallback}.`);
                return (await this.listen(fallback, (req, res) => this.handleRequest(req, res)));
            }
            throw error;
        }
    }
    async createHttpsServer(options, port, fallback) {
        const listener = () => https_1.default.createServer({
            key: options.httpsCredentials?.key,
            cert: options.httpsCredentials?.cert
        }, (req, res) => this.handleRequest(req, res));
        try {
            return (await this.listen(port, undefined, listener));
        }
        catch (error) {
            if (fallback && fallback !== port && isPortError(error)) {
                (0, terminal_1.logWarn)(`HTTPS port ${port} unavailable. Falling back to ${fallback}.`);
                return (await this.listen(fallback, undefined, listener));
            }
            throw error;
        }
    }
    async listen(port, handler, factory) {
        const server = factory ? factory() : http_1.default.createServer(handler);
        return await new Promise((resolve, reject) => {
            server.once('error', reject);
            server.listen(port, () => {
                server.removeListener('error', reject);
                const actualPort = extractPort(server) ?? port;
                (0, terminal_1.logInfo)(`proxy listening on port ${actualPort}`);
                resolve(server);
            });
        });
    }
    async closeServer(server) {
        await new Promise((resolve) => server.close(() => resolve()));
    }
    handleRequest(req, res) {
        const domain = (req.headers.host ?? '').split(':')[0].toLowerCase();
        const route = this.routes.get(domain);
        if (!route) {
            res.statusCode = 502;
            res.end(`/alias: no route configured for ${domain}`);
            return;
        }
        this.proxy.web(req, res, { target: route }, (error) => {
            (0, terminal_1.logError)(`Proxy error for ${domain}: ${error.message}`);
            if (!res.headersSent) {
                res.statusCode = 502;
            }
            res.end('/alias proxy error');
        });
    }
    handleUpgrade(req, socket, head) {
        const domain = (req.headers.host ?? '').split(':')[0].toLowerCase();
        const route = this.routes.get(domain);
        if (!route) {
            socket.destroy();
            return;
        }
        this.proxy.ws(req, socket, head, { target: route }, (error) => {
            (0, terminal_1.logError)(`Proxy websocket error for ${domain}: ${error.message}`);
            socket.destroy();
        });
    }
}
exports.ProxyService = ProxyService;
function isPortError(error) {
    return Boolean(typeof error === 'object' &&
        error &&
        'code' in error &&
        ['EACCES', 'EADDRINUSE'].includes(error.code ?? ''));
}
function extractPort(server) {
    if (!server)
        return undefined;
    const address = server.address();
    if (typeof address === 'object' && address) {
        return address.port;
    }
    return undefined;
}
//# sourceMappingURL=proxy.js.map