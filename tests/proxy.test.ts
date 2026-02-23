import http from 'http';
import { ProxyService } from '../src/proxy';

function listen(server: http.Server, port = 0): Promise<number> {
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      if (typeof address === 'object' && address) {
        resolve(address.port);
      }
    });
  });
}

function request(options: http.RequestOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk.toString()));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.end();
  });
}

describe('ProxyService', () => {
  it('routes traffic based on host header', async () => {
    const target = http.createServer((req, res) => {
      res.end('proxied');
    });
    const targetPort = await listen(target);

    const proxy = new ProxyService();
    await proxy.start({ httpPort: 0 });
    const proxyPort = proxy.getBoundPorts().http;
    if (!proxyPort) {
      throw new Error('Proxy did not start');
    }

    proxy.upsertRoute('demo.local', `http://127.0.0.1:${targetPort}`);

    const body = await request({
      hostname: '127.0.0.1',
      port: proxyPort,
      path: '/',
      headers: { host: 'demo.local' }
    });

    expect(body).toBe('proxied');

    await proxy.stop();
    await new Promise<void>((resolve) => target.close(() => resolve()));
  });
});
