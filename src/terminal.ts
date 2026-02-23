const codes: Record<string, string> = {
  reset: '\u001B[0m',
  bold: '\u001B[1m',
  red: '\u001B[31m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  cyan: '\u001B[36m',
  blue: '\u001B[34m',
  magenta: '\u001B[35m'
};

type Color = 'red' | 'green' | 'yellow' | 'cyan' | 'blue' | 'magenta';

export function colorize(text: string, color: Color, bold = false): string {
  return `${bold ? codes.bold : ''}${codes[color]}${text}${codes.reset}`;
}

export function logInfo(message: string): void {
  console.log(`${colorize('/alias', 'magenta', true)} ${colorize(message, 'green')}`);
}

export function logWarn(message: string): void {
  console.warn(`${colorize('/alias', 'magenta', true)} ${colorize(message, 'yellow')}`);
}

export function logError(message: string): void {
  console.error(`${colorize('/alias', 'magenta', true)} ${colorize(message, 'red')}`);
}

export function logHighlight(message: string): void {
  console.log(`${colorize('/alias', 'magenta', true)} ${colorize(message, 'cyan')}`);
}

export function logCredit(): void {
  console.log(`\n${colorize('/alias', 'magenta', true)} by ${colorize('@launchaddict', 'blue', true)}\n`);
}
