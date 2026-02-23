import { PassThrough } from 'stream';
import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';
import { PortDetector } from '../src/port-detector';

function createChildProcessMock(): ChildProcess {
  const emitter = new EventEmitter() as ChildProcess;
  (emitter as any).stdout = new PassThrough();
  (emitter as any).stderr = new PassThrough();
  return emitter;
}

describe('PortDetector', () => {
  it('extracts port from stdout logs', async () => {
    const detector = new PortDetector({
      patterns: ['localhost:(\\d{4})'],
      range: { start: 3000, end: 3005 },
      timeoutMs: 2000
    });
    const child = createChildProcessMock();
    detector.attach(child);
    const promise = detector.waitForPort();
    (child.stdout as PassThrough).write('Listening on http://localhost:4321');
    await expect(promise).resolves.toBe(4321);
  });
});
