"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CERTS_DIR = exports.STATE_DIR = void 0;
exports.loadConfig = loadConfig;
exports.ensureStateDirectories = ensureStateDirectories;
exports.statePath = statePath;
exports.isValidDomain = isValidDomain;
const fs_extra_1 = __importDefault(require("fs-extra"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const DEFAULT_SCAN_RANGE = { start: 3000, end: 3100 };
const DEFAULT_LOG_PATTERNS = [
    'http://(?:localhost|127\.0\.0\.1):(\\d+)',
    'https://(?:localhost|127\.0\.0\.1):(\\d+)',
    'ready in .*:(\\d+)',
    'listening on .*:(\\d+)',
    'dev server running at .*:(\\d+)'
];
const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
const ALLOWED_TLDS = ['local', 'localhost', 'test'];
exports.STATE_DIR = path_1.default.join(os_1.default.homedir(), '.alias-runner');
exports.CERTS_DIR = path_1.default.join(exports.STATE_DIR, 'certs');
async function loadConfig(cwd = process.cwd()) {
    const packagePath = await findPackageJson(cwd);
    if (!packagePath) {
        throw new Error('Could not locate package.json. Run this command inside a Node project.');
    }
    const pkg = await fs_extra_1.default.readJson(packagePath);
    const rawConfig = pkg.alias;
    if (!rawConfig || typeof rawConfig !== 'object') {
        throw new Error('Missing alias configuration inside package.json.');
    }
    if (!rawConfig.domain || typeof rawConfig.domain !== 'string') {
        throw new Error('alias.domain is required (e.g. "app.local").');
    }
    if (!isValidDomain(rawConfig.domain)) {
        throw new Error('alias.domain must be a .local, .localhost, or .test domain.');
    }
    const config = {
        domain: rawConfig.domain.trim().toLowerCase(),
        https: Boolean(rawConfig.https ?? false),
        proxyPort: rawConfig.proxyPort ?? 80,
        httpsPort: rawConfig.httpsPort ?? 443,
        persistHosts: rawConfig.persistHosts ?? true,
        portScan: normalizeRange(rawConfig.portScan),
        logPatterns: normalizePatterns(rawConfig.logPatterns),
        commands: normalizeCommands(rawConfig.commands)
    };
    config.portScan ?? (config.portScan = { ...DEFAULT_SCAN_RANGE });
    config.logPatterns ?? (config.logPatterns = [...DEFAULT_LOG_PATTERNS]);
    return { packagePath, config };
}
async function ensureStateDirectories() {
    await fs_extra_1.default.ensureDir(exports.STATE_DIR);
    await fs_extra_1.default.ensureDir(exports.CERTS_DIR);
}
function statePath(...segments) {
    return path_1.default.join(exports.STATE_DIR, ...segments);
}
function isValidDomain(domain) {
    const normalized = domain.trim().toLowerCase();
    if (!DOMAIN_REGEX.test(normalized)) {
        return false;
    }
    const tld = normalized.split('.').pop();
    return !!tld && ALLOWED_TLDS.includes(tld);
}
function normalizeRange(range) {
    if (!range || typeof range !== 'object')
        return undefined;
    const start = Number(range.start);
    const end = Number(range.end);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end <= start) {
        throw new Error('alias.portScan must contain a valid numeric start/end.');
    }
    return { start, end };
}
function normalizePatterns(patterns) {
    if (!patterns)
        return undefined;
    if (!Array.isArray(patterns)) {
        throw new Error('alias.logPatterns must be an array of strings.');
    }
    patterns.forEach((pattern) => {
        if (typeof pattern !== 'string') {
            throw new Error('alias.logPatterns entries must be strings.');
        }
    });
    return [...patterns];
}
function normalizeCommands(commands) {
    if (!commands)
        return undefined;
    if (typeof commands !== 'object' || Array.isArray(commands)) {
        throw new Error('alias.commands must be an object keyed by script name.');
    }
    const normalized = {};
    Object.entries(commands).forEach(([key, value]) => {
        if (!value || typeof value !== 'object') {
            throw new Error(`alias.commands.${key} must be an object.`);
        }
        const entry = { ...value };
        if (entry.domain && !isValidDomain(entry.domain)) {
            throw new Error(`alias.commands.${key}.domain must be a .local/.localhost/.test domain.`);
        }
        if (entry.targetPort && !Number.isInteger(entry.targetPort)) {
            throw new Error(`alias.commands.${key}.targetPort must be an integer.`);
        }
        if (entry.logPatterns) {
            entry.logPatterns = normalizePatterns(entry.logPatterns) ?? undefined;
        }
        if (entry.portScan) {
            entry.portScan = normalizeRange(entry.portScan) ?? undefined;
        }
        if (entry.env) {
            if (typeof entry.env !== 'object') {
                throw new Error(`alias.commands.${key}.env must be an object of key/value pairs.`);
            }
            Object.entries(entry.env).forEach(([envKey, envValue]) => {
                if (typeof envValue !== 'string') {
                    throw new Error(`alias.commands.${key}.env.${envKey} must be a string.`);
                }
            });
        }
        normalized[key] = entry;
    });
    return normalized;
}
async function findPackageJson(start) {
    let current = path_1.default.resolve(start);
    while (true) {
        const candidate = path_1.default.join(current, 'package.json');
        if (await fs_extra_1.default.pathExists(candidate)) {
            return candidate;
        }
        const parent = path_1.default.dirname(current);
        if (parent === current) {
            return undefined;
        }
        current = parent;
    }
}
//# sourceMappingURL=config.js.map