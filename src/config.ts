import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import type { AliasConfig, AliasCommandConfig, LoadedConfig, PortScanRange } from './types';

const DEFAULT_SCAN_RANGE: PortScanRange = { start: 3000, end: 3100 };
const DEFAULT_LOG_PATTERNS = [
  'http://(?:localhost|127\.0\.0\.1):(\\d+)',
  'https://(?:localhost|127\.0\.0\.1):(\\d+)',
  'ready in .*:(\\d+)',
  'listening on .*:(\\d+)',
  'dev server running at .*:(\\d+)'
];

const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
const ALLOWED_TLDS = ['local', 'localhost', 'test'];

export const STATE_DIR = path.join(os.homedir(), '.alias-runner');
export const CERTS_DIR = path.join(STATE_DIR, 'certs');

export async function loadConfig(cwd = process.cwd()): Promise<LoadedConfig> {
  const packagePath = await findPackageJson(cwd);
  if (!packagePath) {
    throw new Error('Could not locate package.json. Run this command inside a Node project.');
  }

  const pkg = await fs.readJson(packagePath);
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

  const config: AliasConfig = {
    domain: rawConfig.domain.trim().toLowerCase(),
    https: Boolean(rawConfig.https ?? false),
    proxyPort: rawConfig.proxyPort ?? 80,
    httpsPort: rawConfig.httpsPort ?? 443,
    persistHosts: rawConfig.persistHosts ?? true,
    portScan: normalizeRange(rawConfig.portScan),
    logPatterns: normalizePatterns(rawConfig.logPatterns),
    commands: normalizeCommands(rawConfig.commands)
  };

  config.portScan ??= { ...DEFAULT_SCAN_RANGE };
  config.logPatterns ??= [...DEFAULT_LOG_PATTERNS];

  return { packagePath, config };
}

export async function ensureStateDirectories(): Promise<void> {
  await fs.ensureDir(STATE_DIR);
  await fs.ensureDir(CERTS_DIR);
}

export function statePath(...segments: string[]): string {
  return path.join(STATE_DIR, ...segments);
}

export function isValidDomain(domain: string): boolean {
  const normalized = domain.trim().toLowerCase();
  if (!DOMAIN_REGEX.test(normalized)) {
    return false;
  }
  const tld = normalized.split('.').pop();
  return !!tld && ALLOWED_TLDS.includes(tld);
}

function normalizeRange(range?: unknown): PortScanRange | undefined {
  if (!range || typeof range !== 'object') return undefined;
  const start = Number((range as PortScanRange).start);
  const end = Number((range as PortScanRange).end);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end <= start) {
    throw new Error('alias.portScan must contain a valid numeric start/end.');
  }
  return { start, end };
}

function normalizePatterns(patterns?: unknown): string[] | undefined {
  if (!patterns) return undefined;
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

function normalizeCommands(commands?: unknown): Record<string, AliasCommandConfig> | undefined {
  if (!commands) return undefined;
  if (typeof commands !== 'object' || Array.isArray(commands)) {
    throw new Error('alias.commands must be an object keyed by script name.');
  }

  const normalized: Record<string, AliasCommandConfig> = {};
  Object.entries(commands as Record<string, AliasCommandConfig>).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') {
      throw new Error(`alias.commands.${key} must be an object.`);
    }
    const entry: AliasCommandConfig = { ...value };
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

async function findPackageJson(start: string): Promise<string | undefined> {
  let current = path.resolve(start);
  while (true) {
    const candidate = path.join(current, 'package.json');
    if (await fs.pathExists(candidate)) {
      return candidate;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}
