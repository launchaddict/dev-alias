import { spawn, type ChildProcess } from 'child_process';
import { ensureStateDirectories } from './config';
import { ensureHostEntry, removeHostEntry } from './hosts';
import { PortDetector } from './port-detector';
import { ProxyService } from './proxy';
import type { RunnerContext } from './types';
import { ensureCertificate } from './tls-manager';
import { logHighlight } from './terminal';

export interface RunnerOptions extends RunnerContext {
  env?: Record<string, string>;
}

export async function runWithProxy(options: RunnerOptions): Promise<void> {
  await ensureStateDirectories();
  await ensureHostEntry(options.domain);

  const detector = new PortDetector({
    patterns: options.logPatterns,
    range: options.portScan,
    timeoutMs: 60_000
  });

  const proxy = new ProxyService();
  const httpsCredentials = options.https ? await ensureCertificate(options.domain) : undefined;
  await proxy.start({
    httpPort: options.proxyPort,
    fallbackHttpPort: options.proxyPort === 80 ? 8080 : options.proxyPort + 1,
    httpsPort: options.https ? options.httpsPort ?? 443 : undefined,
    fallbackHttpsPort: options.https ? ((options.httpsPort ?? 443) === 443 ? 8443 : (options.httpsPort ?? 443) + 1) : undefined,
    httpsCredentials: httpsCredentials ? { key: httpsCredentials.key, cert: httpsCredentials.cert } : undefined
  });

  detector.onPort((port) => {
    proxy.upsertRoute(options.domain, `http://127.0.0.1:${port}`);
    logHighlight(`mapped ${options.https ? 'https' : 'http'}://${options.domain} -> http://localhost:${port}`);
  });

  const child = spawnProcess(options, detector);
  const exitPromise = waitForExit(child);

  const cleanup = createCleanup(child, proxy, options);

  try {
    await detector.waitForPort(options.targetHint);
    await exitPromise;
  } finally {
    await cleanup();
  }
}

function spawnProcess(options: RunnerOptions, detector: PortDetector): ChildProcess {
  const child = spawn(options.command, options.args, {
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

function waitForExit(child: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Dev server exited with code ${code ?? 'unknown'}`));
      }
    });
    child.once('error', reject);
  });
}

function createCleanup(child: ChildProcess, proxy: ProxyService, options: RunnerOptions) {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
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
      await removeHostEntry(options.domain).catch(() => undefined);
    }
  };
}
