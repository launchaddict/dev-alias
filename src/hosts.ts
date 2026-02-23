import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import sudoPrompt from 'sudo-prompt';
import { statePath } from './config';

const APP_NAME = 'alias-runner';

export async function ensureHostEntry(domain: string, address = '127.0.0.1'): Promise<void> {
  if (!requiresHostsChange(domain)) return;
  await updateHosts((lines) => {
    const filtered = removeLines(lines, domain);
    filtered.push(`${address}\t${domain}`);
    return filtered;
  });
}

export async function removeHostEntry(domain: string): Promise<void> {
  if (!requiresHostsChange(domain)) return;
  await updateHosts((lines) => removeLines(lines, domain));
}

async function updateHosts(mutator: (lines: string[]) => string[]): Promise<void> {
  const hostsPath = getHostsPath();
  await ensureBackup(hostsPath);
  const content = await fs.readFile(hostsPath, 'utf8');
  const lines = toLines(content);
  const nextLines = mutator(lines);
  if (linesEqual(lines, nextLines)) {
    return;
  }
  const finalContent = `${nextLines.join(os.EOL)}${os.EOL}`;
  await writeHostsContent(hostsPath, finalContent);
}

function toLines(content: string): string[] {
  return content.replace(/\r/g, '').split('\n').filter((line, index, arr) => !(index === arr.length - 1 && line === ''));
}

function removeLines(lines: string[], domain: string): string[] {
  const domainRegex = new RegExp(`(?:^|\s)${escapeRegex(domain)}(?:\s|$)`, 'i');
  return lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return true;
    }
    return !domainRegex.test(trimmed);
  });
}

function linesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getHostsPath(): string {
  if (process.platform === 'win32') {
    const systemRoot = process.env.SystemRoot ?? 'C:/Windows';
    return path.join(systemRoot, 'System32', 'drivers', 'etc', 'hosts');
  }
  return '/etc/hosts';
}

async function ensureBackup(hostsPath: string): Promise<void> {
  const backupPath = statePath('hosts.backup');
  if (await fs.pathExists(backupPath)) return;
  await fs.ensureDir(path.dirname(backupPath));
  await fs.copy(hostsPath, backupPath);
}

async function writeHostsContent(hostsPath: string, content: string): Promise<void> {
  try {
    await fs.writeFile(hostsPath, content, 'utf8');
  } catch (error) {
    if (isPermissionError(error)) {
      await writeWithPrivileges(hostsPath, content);
    } else {
      throw error;
    }
  }
}

function isPermissionError(error: unknown): boolean {
  return Boolean(
    typeof error === 'object' &&
      error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code &&
      ['EACCES', 'EPERM'].includes((error as NodeJS.ErrnoException).code as string)
  );
}

async function writeWithPrivileges(hostsPath: string, content: string): Promise<void> {
  const tempFile = path.join(os.tmpdir(), `alias-hosts-${Date.now()}.txt`);
  await fs.writeFile(tempFile, content, 'utf8');
  const command = buildCopyCommand(tempFile, hostsPath);
  await new Promise<void>((resolve, reject) => {
    sudoPrompt.exec(command, { name: APP_NAME }, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
  await fs.remove(tempFile).catch(() => undefined);
}

function buildCopyCommand(source: string, target: string): string {
  if (process.platform === 'win32') {
    return `powershell -Command "Copy-Item -Path '${source.replace(/'/g, "''")}' -Destination '${target.replace(/'/g, "''")}' -Force"`;
  }
  return `/bin/sh -c "cp '${source.replace(/'/g, "'\\''")}' '${target.replace(/'/g, "'\\''")}'"`;
}

function requiresHostsChange(domain: string): boolean {
  return !domain.endsWith('.localhost');
}
