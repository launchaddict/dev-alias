#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import stringArgv from 'string-argv';
import { loadConfig } from './config';
import { runWithProxy } from './process-runner';
import type { AliasCommandConfig, RunnerContext } from './types';
import { colorize, logCredit } from './terminal';

interface CliOptions {
  script?: string;
  domain?: string;
  proxyPort?: string;
  httpsPort?: string;
  targetPort?: string;
  https?: boolean;
  disableHttps?: boolean;
  persistHosts?: boolean;
  cleanupHosts?: boolean;
  env?: string[];
}

async function main(): Promise<void> {
  const { cliArgs, commandArgs } = splitArguments(process.argv);
  const program = new Command();
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
  const options = program.opts<CliOptions>();

  const { config, packagePath } = await loadConfig(process.cwd());
  const cwd = path.dirname(packagePath);
  const scriptName = options.script ?? process.env.npm_lifecycle_event ?? undefined;
  const scriptConfig = scriptName ? config.commands?.[scriptName] : undefined;

  const domain = (options.domain ?? scriptConfig?.domain ?? config.domain).toLowerCase();
  const https = resolveBoolean(options.https, options.disableHttps, scriptConfig?.https, config.https ?? false);
  const persistHosts = resolveBoolean(
    options.persistHosts,
    options.cleanupHosts,
    undefined,
    config.persistHosts ?? true
  );
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

  logCredit();

  const context: RunnerContext = {
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

  await runWithProxy({
    ...context,
    env
  });
}

function splitArguments(argv: string[]): { cliArgs: string[]; commandArgs: string[] } {
  const index = argv.indexOf('--');
  if (index === -1) {
    return { cliArgs: argv, commandArgs: [] };
  }
  return {
    cliArgs: argv.slice(0, index),
    commandArgs: argv.slice(index + 1)
  };
}

function resolveBoolean(
  enable?: boolean,
  disable?: boolean,
  scriptValue?: boolean,
  defaultValue = false
): boolean {
  if (enable === true) return true;
  if (disable === true) return false;
  if (typeof scriptValue === 'boolean') return scriptValue;
  return defaultValue;
}

function parsePort(value: string | number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new Error(`Invalid port value: ${value}`);
  }
  return num;
}

function parseOptionalPort(value?: string | number): number | undefined {
  if (value === undefined || value === null) return undefined;
  return parsePort(value);
}

function mergePatterns(base: string[], extra: string[]): string[] {
  return Array.from(new Set([...base, ...extra]));
}

function mergeEnv(
  scriptEnv: AliasCommandConfig['env'],
  cliEnv?: string[]
): Record<string, string> | undefined {
  const env: Record<string, string> = { ...(scriptEnv ?? {}) };
  (cliEnv ?? []).forEach((entry) => {
    const [key, ...rest] = entry.split('=');
    if (!key || rest.length === 0) {
      throw new Error(`Invalid env entry: ${entry}. Use KEY=VALUE.`);
    }
    env[key] = rest.join('=');
  });
  return Object.keys(env).length > 0 ? env : undefined;
}

function parseConfiguredCommand(scriptConfig?: AliasCommandConfig): string[] {
  if (!scriptConfig?.command) return [];
  return stringArgv(scriptConfig.command);
}

main().catch((error) => {
  console.error(colorize(error.message, 'red'));
  if (process.env.DEBUG) {
    console.error(error);
  }
  process.exit(1);
});
