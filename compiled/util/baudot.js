"use strict";
// import * as util from "util";
Object.defineProperty(exports, "__esModule", { value: true });
const unknownBaudotChar = "#";
const invalidAsciiChar = 4;
const baudotBu = ["#", "t", "\r", "o", " ", "h", "n", "m", "\n", "l", "r", "g", "i", "p", "c", "v", "e", "z", "d", "b", "s", "y", "f", "x", "a", "w", "j", "\x0F", "u", "q", "k", "\x0E"];
const baudotZi = ["#", "5", "\r", "9", " ", "#", ",", ".", "\n", ")", "4", "#", "8", "0", ":", "=", "3", "+", "@", "?", "'", "6", "#", "/", "-", "2", "%", "\x0F", "7", "1", "(", "\x0E"];
const changeModeBu = 31;
exports.changeModeBu = changeModeBu;
const changeModeZi = 27;
exports.changeModeZi = changeModeZi;
const baudotModeZi = Symbol("zi");
exports.baudotModeZi = baudotModeZi;
const baudotModeBu = Symbol("bu");
exports.baudotModeBu = baudotModeBu;
const baudotModeUnknown = Symbol("unknown");
exports.baudotModeUnknown = baudotModeUnknown;
function baudotify(str, baudotMode = baudotModeUnknown) {
    // logger.log(inspect`${'>'.repeat(80)}\nbaudotifying ${util.inspect(str)} in mode ${baudotMode}`);
    // logger.log("mode: "+baudotMode.toString());
    // logger.log("baudotifying: "+util.inspect(str));
    let baudot = [];
    for (let char of str.toLowerCase()) {
        // logger.log("mode: "+baudotMode.toString());
        let baudotCodeZi = baudotZi.indexOf(char);
        let baudotCodeBu = baudotBu.indexOf(char);
        // logger.log("char: "+util.inspect(char));
        // logger.log("baudotCodeZi: "+baudotCodeZi);
        // logger.log("baudotCodeBu: "+baudotCodeBu);
        if (baudotCodeZi > -1 && baudotCodeBu > -1) {
            if (baudotMode === baudotModeBu) {
                baudot.push(baudotCodeBu);
                continue;
            }
            if (baudotMode === baudotModeZi) {
                baudot.push(baudotCodeZi);
                continue;
            }
            baudotMode = baudotModeBu;
            baudot.push(changeModeBu);
            baudot.push(baudotCodeBu);
            continue;
        }
        if (baudotCodeZi > -1) {
            if (baudotMode !== baudotModeZi) {
                baudot.push(changeModeZi);
                baudotMode = baudotModeZi;
            }
            baudot.push(baudotCodeZi);
            continue;
        }
        if (baudotCodeBu > -1) {
            if (baudotMode !== baudotModeBu) {
                baudot.push(changeModeBu);
                baudotMode = baudotModeBu;
            }
            baudot.push(baudotCodeBu);
            continue;
        }
        baudot.push(invalidAsciiChar);
    }
    // logger.log("baudotified: ",baudot);
    // logger.log("mode: "+baudotMode.toString());
    // logger.log(inspect`new mode ${baudotMode}\n${'<'.repeat(80)}`);
    return [baudot, baudotMode];
}
exports.baudotify = baudotify;
function asciify(data, baudotMode = baudotModeUnknown) {
    let ascii = "";
    // logger.log("mode: "+baudotMode.toString());
    // logger.log("asciifying: ", data);
    for (let char of Array.from(data)) {
        if (char === changeModeZi) {
            baudotMode = baudotModeZi;
            continue;
        }
        if (char === changeModeBu) {
            baudotMode = baudotModeBu;
            continue;
        }
        if (baudotMode === baudotModeBu) {
            ascii += baudotBu[char] || unknownBaudotChar;
            continue;
        }
        if (baudotMode === baudotModeZi) {
            ascii += baudotZi[char] || unknownBaudotChar;
            continue;
        }
        ascii += unknownBaudotChar;
    }
    // logger.log("asciified: "+ascii);
    // logger.log("mode: "+baudotMode.toString());
    return [ascii, baudotMode];
}
exports.asciify = asciify;
