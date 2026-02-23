"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortDetector = void 0;
const tcp_port_used_1 = __importDefault(require("tcp-port-used"));
const HOST = '127.0.0.1';
class PortDetector {
    constructor(options) {
        this.options = options;
        this.listeners = [];
        this.regexes = options.patterns.map((pattern) => new RegExp(pattern, 'i'));
    }
    attach(child) {
        child.stdout?.on('data', (data) => this.inspectBuffer(data.toString()));
        child.stderr?.on('data', (data) => this.inspectBuffer(data.toString()));
    }
    async waitForPort(portHint) {
        if (this.resolvedPort) {
            return this.resolvedPort;
        }
        return await new Promise((resolve, reject) => {
            this.resolveFn = resolve;
            this.rejectFn = reject;
            this.startTimeout();
            if (portHint) {
                this.awaitPortUsage(portHint).catch(() => this.scanRange());
            }
            else {
                this.scanRange();
            }
        });
    }
    onPort(listener) {
        this.listeners.push(listener);
        if (this.resolvedPort) {
            listener(this.resolvedPort);
        }
    }
    inspectBuffer(buffer) {
        for (const regex of this.regexes) {
            const match = buffer.match(regex);
            if (match && match[1]) {
                const detected = Number(match[1]);
                if (Number.isInteger(detected) && detected > 0) {
                    this.setPort(detected);
                    return;
                }
            }
        }
    }
    async awaitPortUsage(port) {
        try {
            await tcp_port_used_1.default.waitUntilUsedOnHost(port, HOST, 200, 15000);
            this.setPort(port);
        }
        catch (error) {
            if (!this.resolvedPort) {
                this.scanRange();
            }
        }
    }
    async scanRange() {
        const { start, end } = this.options.range;
        for (let port = start; port <= end; port += 1) {
            if (this.resolvedPort)
                return;
            const inUse = await tcp_port_used_1.default.check(port, HOST);
            if (inUse) {
                this.setPort(port);
                return;
            }
        }
        if (!this.resolvedPort) {
            setTimeout(() => this.scanRange(), 400);
        }
    }
    setPort(port) {
        const firstDetection = !this.resolvedPort;
        const changed = this.resolvedPort !== port;
        this.resolvedPort = port;
        if (firstDetection && this.timeout) {
            clearTimeout(this.timeout);
        }
        if (firstDetection) {
            this.resolveFn?.(port);
        }
        if (firstDetection || changed) {
            this.listeners.forEach((listener) => {
                try {
                    listener(port);
                }
                catch (error) {
                    console.error('Error inside port listener', error);
                }
            });
        }
    }
    startTimeout() {
        const timeoutMs = this.options.timeoutMs ?? 60000;
        this.timeout = setTimeout(() => {
            if (this.rejectFn && !this.resolvedPort) {
                this.rejectFn(new Error('Timed out waiting for dev server port.'));
            }
        }, timeoutMs);
    }
}
exports.PortDetector = PortDetector;
//# sourceMappingURL=port-detector.js.map