import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { loadConfig, isValidDomain } from '../src/config';

async function createTempProject(pkg: Record<string, unknown>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dev-alias-config-'));
  await fs.writeJson(path.join(dir, 'package.json'), pkg, { spaces: 2 });
  return dir;
}

describe('config loader', () => {
  it('hydrates defaults when only domain provided', async () => {
    const dir = await createTempProject({ alias: { domain: 'demo.local' } });
    try {
      const { config } = await loadConfig(dir);
      expect(config.domain).toBe('demo.local');
      expect(config.portScan).toEqual({ start: 3000, end: 3100 });
      expect(config.logPatterns?.length).toBeGreaterThan(0);
    } finally {
      await fs.remove(dir);
    }
  });

  it('throws when domain missing', async () => {
    const dir = await createTempProject({ alias: {} });
    await expect(loadConfig(dir)).rejects.toThrow('alias.domain is required');
    await fs.remove(dir);
  });

  it('validates allowed domains', () => {
    expect(isValidDomain('demo.local')).toBe(true);
    expect(isValidDomain('foo.test')).toBe(true);
    expect(isValidDomain('foo.com')).toBe(false);
  });
});
