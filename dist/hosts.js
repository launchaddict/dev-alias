"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureHostEntry = ensureHostEntry;
exports.removeHostEntry = removeHostEntry;
const fs_extra_1 = __importDefault(require("fs-extra"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const sudo_prompt_1 = __importDefault(require("sudo-prompt"));
const config_1 = require("./config");
const APP_NAME = 'alias-runner';
async function ensureHostEntry(domain, address = '127.0.0.1') {
    if (!requiresHostsChange(domain))
        return;
    await updateHosts((lines) => {
        const filtered = removeLines(lines, domain);
        filtered.push(`${address}\t${domain}`);
        return filtered;
    });
}
async function removeHostEntry(domain) {
    if (!requiresHostsChange(domain))
        return;
    await updateHosts((lines) => removeLines(lines, domain));
}
async function updateHosts(mutator) {
    const hostsPath = getHostsPath();
    await ensureBackup(hostsPath);
    const content = await fs_extra_1.default.readFile(hostsPath, 'utf8');
    const lines = toLines(content);
    const nextLines = mutator(lines);
    if (linesEqual(lines, nextLines)) {
        return;
    }
    const finalContent = `${nextLines.join(os_1.default.EOL)}${os_1.default.EOL}`;
    await writeHostsContent(hostsPath, finalContent);
}
function toLines(content) {
    return content.replace(/\r/g, '').split('\n').filter((line, index, arr) => !(index === arr.length - 1 && line === ''));
}
function removeLines(lines, domain) {
    const domainRegex = new RegExp(`(?:^|\s)${escapeRegex(domain)}(?:\s|$)`, 'i');
    return lines.filter((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            return true;
        }
        return !domainRegex.test(trimmed);
    });
}
function linesEqual(a, b) {
    if (a.length !== b.length)
        return false;
    return a.every((value, index) => value === b[index]);
}
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function getHostsPath() {
    if (process.platform === 'win32') {
        const systemRoot = process.env.SystemRoot ?? 'C:/Windows';
        return path_1.default.join(systemRoot, 'System32', 'drivers', 'etc', 'hosts');
    }
    return '/etc/hosts';
}
async function ensureBackup(hostsPath) {
    const backupPath = (0, config_1.statePath)('hosts.backup');
    if (await fs_extra_1.default.pathExists(backupPath))
        return;
    await fs_extra_1.default.ensureDir(path_1.default.dirname(backupPath));
    await fs_extra_1.default.copy(hostsPath, backupPath);
}
async function writeHostsContent(hostsPath, content) {
    try {
        await fs_extra_1.default.writeFile(hostsPath, content, 'utf8');
    }
    catch (error) {
        if (isPermissionError(error)) {
            await writeWithPrivileges(hostsPath, content);
        }
        else {
            throw error;
        }
    }
}
function isPermissionError(error) {
    return Boolean(typeof error === 'object' &&
        error &&
        'code' in error &&
        error.code &&
        ['EACCES', 'EPERM'].includes(error.code));
}
async function writeWithPrivileges(hostsPath, content) {
    const tempFile = path_1.default.join(os_1.default.tmpdir(), `alias-hosts-${Date.now()}.txt`);
    await fs_extra_1.default.writeFile(tempFile, content, 'utf8');
    const command = buildCopyCommand(tempFile, hostsPath);
    await new Promise((resolve, reject) => {
        sudo_prompt_1.default.exec(command, { name: APP_NAME }, (error) => {
            if (error) {
                reject(error);
            }
            else {
                resolve();
            }
        });
    });
    await fs_extra_1.default.remove(tempFile).catch(() => undefined);
}
function buildCopyCommand(source, target) {
    if (process.platform === 'win32') {
        return `powershell -Command "Copy-Item -Path '${source.replace(/'/g, "''")}' -Destination '${target.replace(/'/g, "''")}' -Force"`;
    }
    return `/bin/sh -c "cp '${source.replace(/'/g, "'\\''")}' '${target.replace(/'/g, "'\\''")}'"`;
}
function requiresHostsChange(domain) {
    return !domain.endsWith('.localhost');
}
//# sourceMappingURL=hosts.js.map