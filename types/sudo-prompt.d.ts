declare module 'sudo-prompt' {
  interface Options {
    name?: string;
    icns?: string;
    env?: Record<string, string>;
  }

  type Callback = (error: Error | null, stdout?: string, stderr?: string) => void;

  export function exec(command: string, options: Options, callback: Callback): void;
}
