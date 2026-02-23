"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.colorize = colorize;
exports.logInfo = logInfo;
exports.logWarn = logWarn;
exports.logError = logError;
exports.logHighlight = logHighlight;
const codes = {
    reset: '\u001B[0m',
    red: '\u001B[31m',
    green: '\u001B[32m',
    yellow: '\u001B[33m',
    cyan: '\u001B[36m'
};
function colorize(text, color) {
    return `${codes[color]}${text}${codes.reset}`;
}
function logInfo(message) {
    console.log(colorize(message, 'green'));
}
function logWarn(message) {
    console.warn(colorize(message, 'yellow'));
}
function logError(message) {
    console.error(colorize(message, 'red'));
}
function logHighlight(message) {
    console.log(colorize(message, 'cyan'));
}
//# sourceMappingURL=terminal.js.map