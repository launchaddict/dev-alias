import fs from 'fs-extra';
import path from 'path';
import selfsigned from 'selfsigned';
import { CERTS_DIR, ensureStateDirectories } from './config';

export interface CertificateBundle {
  key: Buffer;
  cert: Buffer;
  keyPath: string;
  certPath: string;
}

export async function ensureCertificate(domain: string): Promise<CertificateBundle> {
  await ensureStateDirectories();
  const safeName = domain.replace(/[^a-z0-9.-]/gi, '_');
  const keyPath = path.join(CERTS_DIR, `${safeName}.key.pem`);
  const certPath = path.join(CERTS_DIR, `${safeName}.cert.pem`);

  if (await fs.pathExists(keyPath) && await fs.pathExists(certPath)) {
    const [key, cert] = await Promise.all([fs.readFile(keyPath), fs.readFile(certPath)]);
    return { key, cert, keyPath, certPath };
  }

  const attrs = [{ name: 'commonName', value: domain }];
  const pems = selfsigned.generate(attrs, {
    days: 30,
    keySize: 2048,
    algorithm: 'sha256'
  });

  await fs.writeFile(keyPath, pems.private, 'utf8');
  await fs.writeFile(certPath, pems.cert, 'utf8');

  return { key: Buffer.from(pems.private), cert: Buffer.from(pems.cert), keyPath, certPath };
}
