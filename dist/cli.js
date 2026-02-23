#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const string_argv_1 = __importDefault(require("string-argv"));
const config_1 = require("./config");
const process_runner_1 = require("./process-runner");
const terminal_1 = require("./terminal");
async function main() {
    const { cliArgs, commandArgs } = splitArguments(process.argv);
    const program = new commander_1.Command();
    program
        .name('/alias')
        .description('Zero-touch local domain proxy by @launchaddict')
        .option('-s, --script <name>', 'script key inside alias.commands')
        .option('-d, --domain <domain>', 'domain override (defaults to alias.domain)')
        .option('--proxy-port <port>', 'http proxy port override')
        .option('--https-port <port>', 'https proxy port override')
        .option('--target-port <port>', 'hint for the dev server port')
        .option('--https', 'force HTTPS proxying')
        .option('--disable-https', 'disable HTTPS proxying even if config enables it')
        .option('--persist-hosts', 'keep hosts entries after exit')
        .option('--cleanup-hosts', 'remove hosts entries on exit')
        .option('-e, --env <pair...>', 'environment variables in KEY=VALUE format');
    program.parse(cliArgs);
    const options = program.opts();
    const { config, packagePath } = await (0, config_1.loadConfig)(process.cwd());
    const cwd = path_1.default.dirname(packagePath);
    const scriptName = options.script ?? process.env.npm_lifecycle_event ?? undefined;
    const scriptConfig = scriptName ? config.commands?.[scriptName] : undefined;
    const domain = (options.domain ?? scriptConfig?.domain ?? config.domain).toLowerCase();
    const https = resolveBoolean(options.https, options.disableHttps, scriptConfig?.https, config.https ?? false);
    const persistHosts = resolveBoolean(options.persistHosts, options.cleanupHosts, undefined, config.persistHosts ?? true);
    const proxyPort = parsePort(options.proxyPort ?? String(config.proxyPort ?? 80));
    const httpsPort = https ? parsePort(options.httpsPort ?? String(config.httpsPort ?? 443)) : undefined;
    const targetHint = parseOptionalPort(options.targetPort ?? scriptConfig?.targetPort);
    const portScan = scriptConfig?.portScan ?? config.portScan ?? { start: 3000, end: 3100 };
    const logPatterns = mergePatterns(config.logPatterns ?? [], scriptConfig?.logPatterns ?? []);
    const env = mergeEnv(scriptConfig?.env, options.env);
    const commandParts = commandArgs.length > 0 ? commandArgs : parseConfiguredCommand(scriptConfig);
    if (commandParts.length === 0) {
        throw new Error('No dev command provided. Append it after -- or set commands.<name>.command in package.json');
    }
    const [command, ...args] = commandParts;
    (0, terminal_1.logCredit)();
    const context = {
        cwd,
        domain,
        command,
        args,
        https,
        targetHint,
        logPatterns,
        portScan,
        proxyPort,
        httpsPort,
        persistHosts
    };
    await (0, process_runner_1.runWithProxy)({
        ...context,
        env
    });
}
function splitArguments(argv) {
    const index = argv.indexOf('--');
    if (index === -1) {
        return { cliArgs: argv, commandArgs: [] };
    }
    return {
        cliArgs: argv.slice(0, index),
        commandArgs: argv.slice(index + 1)
    };
}
function resolveBoolean(enable, disable, scriptValue, defaultValue = false) {
    if (enable === true)
        return true;
    if (disable === true)
        return false;
    if (typeof scriptValue === 'boolean')
        return scriptValue;
    return defaultValue;
}
function parsePort(value) {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(num) || num <= 0) {
        throw new Error(`Invalid port value: ${value}`);
    }
    return num;
}
function parseOptionalPort(value) {
    if (value === undefined || value === null)
        return undefined;
    return parsePort(value);
}
function mergePatterns(base, extra) {
    return Array.from(new Set([...base, ...extra]));
}
function mergeEnv(scriptEnv, cliEnv) {
    const env = { ...(scriptEnv ?? {}) };
    (cliEnv ?? []).forEach((entry) => {
        const [key, ...rest] = entry.split('=');
        if (!key || rest.length === 0) {
            throw new Error(`Invalid env entry: ${entry}. Use KEY=VALUE.`);
        }
        env[key] = rest.join('=');
    });
    return Object.keys(env).length > 0 ? env : undefined;
}
function parseConfiguredCommand(scriptConfig) {
    if (!scriptConfig?.command)
        return [];
    return (0, string_argv_1.default)(scriptConfig.command);
}
main().catch((error) => {
    console.error((0, terminal_1.colorize)(error.message, 'red'));
    if (process.env.DEBUG) {
        console.error(error);
    }
    process.exit(1);
});
//# sourceMappingURL=cli.js.map