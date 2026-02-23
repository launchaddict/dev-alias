"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.colorize = colorize;
exports.logInfo = logInfo;
exports.logWarn = logWarn;
exports.logError = logError;
exports.logHighlight = logHighlight;
exports.logCredit = logCredit;
const codes = {
    reset: '\u001B[0m',
    bold: '\u001B[1m',
    red: '\u001B[31m',
    green: '\u001B[32m',
    yellow: '\u001B[33m',
    cyan: '\u001B[36m',
    blue: '\u001B[34m',
    magenta: '\u001B[35m'
};
function colorize(text, color, bold = false) {
    return `${bold ? codes.bold : ''}${codes[color]}${text}${codes.reset}`;
}
function logInfo(message) {
    console.log(`${colorize('/alias', 'magenta', true)} ${colorize(message, 'green')}`);
}
function logWarn(message) {
    console.warn(`${colorize('/alias', 'magenta', true)} ${colorize(message, 'yellow')}`);
}
function logError(message) {
    console.error(`${colorize('/alias', 'magenta', true)} ${colorize(message, 'red')}`);
}
function logHighlight(message) {
    console.log(`${colorize('/alias', 'magenta', true)} ${colorize(message, 'cyan')}`);
}
function logCredit() {
    console.log(`\n${colorize('/alias', 'magenta', true)} by ${colorize('@launchaddict', 'blue', true)}\n`);
}
//# sourceMappingURL=terminal.js.map