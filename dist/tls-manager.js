"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureCertificate = ensureCertificate;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const selfsigned_1 = __importDefault(require("selfsigned"));
const config_1 = require("./config");
async function ensureCertificate(domain) {
    await (0, config_1.ensureStateDirectories)();
    const safeName = domain.replace(/[^a-z0-9.-]/gi, '_');
    const keyPath = path_1.default.join(config_1.CERTS_DIR, `${safeName}.key.pem`);
    const certPath = path_1.default.join(config_1.CERTS_DIR, `${safeName}.cert.pem`);
    if (await fs_extra_1.default.pathExists(keyPath) && await fs_extra_1.default.pathExists(certPath)) {
        const [key, cert] = await Promise.all([fs_extra_1.default.readFile(keyPath), fs_extra_1.default.readFile(certPath)]);
        return { key, cert, keyPath, certPath };
    }
    const attrs = [{ name: 'commonName', value: domain }];
    const pems = selfsigned_1.default.generate(attrs, {
        days: 30,
        keySize: 2048,
        algorithm: 'sha256'
    });
    await fs_extra_1.default.writeFile(keyPath, pems.private, 'utf8');
    await fs_extra_1.default.writeFile(certPath, pems.cert, 'utf8');
    return { key: Buffer.from(pems.private), cert: Buffer.from(pems.cert), keyPath, certPath };
}
//# sourceMappingURL=tls-manager.js.map