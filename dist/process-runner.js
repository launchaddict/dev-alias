"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWithProxy = runWithProxy;
const child_process_1 = require("child_process");
const config_1 = require("./config");
const hosts_1 = require("./hosts");
const port_detector_1 = require("./port-detector");
const proxy_1 = require("./proxy");
const tls_manager_1 = require("./tls-manager");
const terminal_1 = require("./terminal");
async function runWithProxy(options) {
    await (0, config_1.ensureStateDirectories)();
    await (0, hosts_1.ensureHostEntry)(options.domain);
    const detector = new port_detector_1.PortDetector({
        patterns: options.logPatterns,
        range: options.portScan,
        timeoutMs: 60000
    });
    const proxy = new proxy_1.ProxyService();
    const httpsCredentials = options.https ? await (0, tls_manager_1.ensureCertificate)(options.domain) : undefined;
    await proxy.start({
        httpPort: options.proxyPort,
        fallbackHttpPort: options.proxyPort === 80 ? 8080 : options.proxyPort + 1,
        httpsPort: options.https ? options.httpsPort ?? 443 : undefined,
        fallbackHttpsPort: options.https ? ((options.httpsPort ?? 443) === 443 ? 8443 : (options.httpsPort ?? 443) + 1) : undefined,
        httpsCredentials: httpsCredentials ? { key: httpsCredentials.key, cert: httpsCredentials.cert } : undefined
    });
    detector.onPort((port) => {
        proxy.upsertRoute(options.domain, `http://127.0.0.1:${port}`);
        (0, terminal_1.logHighlight)(`alias: mapped ${options.https ? 'https' : 'http'}://${options.domain} -> http://localhost:${port}`);
    });
    const child = spawnProcess(options, detector);
    const exitPromise = waitForExit(child);
    const cleanup = createCleanup(child, proxy, options);
    try {
        await detector.waitForPort(options.targetHint);
        await exitPromise;
    }
    finally {
        await cleanup();
    }
}
function spawnProcess(options, detector) {
    const child = (0, child_process_1.spawn)(options.command, options.args, {
        cwd: options.cwd,
        shell: process.platform === 'win32',
        env: { ...process.env, ...options.env },
        stdio: ['inherit', 'pipe', 'pipe']
    });
    detector.attach(child);
    child.stdout?.on('data', (chunk) => process.stdout.write(chunk));
    child.stderr?.on('data', (chunk) => process.stderr.write(chunk));
    return child;
}
function waitForExit(child) {
    return new Promise((resolve, reject) => {
        child.once('exit', (code) => {
            if (code === 0) {
                resolve();
            }
            else {
                reject(new Error(`Dev server exited with code ${code ?? 'unknown'}`));
            }
        });
        child.once('error', reject);
    });
}
function createCleanup(child, proxy, options) {
    const signals = ['SIGINT', 'SIGTERM'];
    const handlers = signals.map((signal) => {
        const handler = () => {
            if (!child.killed) {
                child.kill(signal);
            }
        };
        process.on(signal, handler);
        return { signal, handler };
    });
    return async () => {
        handlers.forEach(({ signal, handler }) => process.off(signal, handler));
        if (!child.killed) {
            child.kill();
        }
        await proxy.stop().catch(() => undefined);
        if (!options.persistHosts) {
            await (0, hosts_1.removeHostEntry)(options.domain).catch(() => undefined);
        }
    };
}
//# sourceMappingURL=process-runner.js.map