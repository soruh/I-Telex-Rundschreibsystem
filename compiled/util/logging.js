"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const colors_1 = require("./colors");
const util = require("util");
const disableColors = false;
function isAnyError(error) {
    if (error instanceof Error)
        return true;
    return false;
}
function inspect(substrings, ...values) {
    let substringArray = Array.from(substrings);
    substringArray = substringArray.map(substring => colors_1.default.FgGreen + substring + colors_1.default.Reset);
    values = values.map(value => {
        if (typeof value === "string")
            return colors_1.default.FgCyan + value + colors_1.default.Reset;
        if (isAnyError(value))
            return colors_1.default.FgRed + util.inspect(value) + colors_1.default.Reset;
        let inspected = util.inspect(value, {
            colors: !disableColors,
            depth: 2,
        });
        if (!disableColors) {
            inspected = inspected.replace(/\u0001b\[39m/g, "\x1b[000m");
            // replace set color to black to reset color
        }
        return inspected;
    });
    let combined = [];
    while (values.length + substringArray.length > 0) {
        if (substringArray.length > 0)
            combined.push(substringArray.shift());
        if (values.length > 0)
            combined.push(values.shift());
    }
    return combined.join('');
}
exports.inspect = inspect;
class logStream {
    constructor(name, stream) {
        this.stream = stream;
        this.name = name;
        this.logger = (text) => {
            logger.log(inspect `${name}: ${util.inspect(text.toString())}`);
        };
        this.stream.on('data', this.logger);
    }
    end() {
        logger.log(`stopped logging for ${this.name}`);
        this.stream.removeListener('data', this.logger);
    }
}
exports.logStream = logStream;
const logger = console; // TODO implement winston;
exports.logger = logger;
