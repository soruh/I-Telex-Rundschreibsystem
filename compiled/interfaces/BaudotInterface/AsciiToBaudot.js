"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
if (module.parent != null) {
    let mod = module;
    let loadOrder = [mod.filename.split("/").slice(-1)[0]];
    while (mod.parent) {
        mod = mod.parent;
        loadOrder.push(mod.filename.split("/").slice(-1)[0]);
    }
    loadOrder = loadOrder.map((name, index) => { let color = "\x1b[33m"; if (index == 0)
        color = "\x1b[32m"; if (index == loadOrder.length - 1)
        color = "\x1b[36m"; return (`${color}${name}\x1b[0m`); }).reverse();
    console.log(loadOrder.join(" → "));
}
const stream_1 = require("stream");
const baudot_1 = require("../../util/baudot");
class AsciiToBaudot extends stream_1.Transform {
    constructor(options) {
        super(options);
        this.baudotMode = baudot_1.baudotModeUnknown;
    }
    _transform(chunk, encoding, callback) {
        let [baudot, newBaudotMode] = baudot_1.baudotify(chunk.toString(), this.baudotMode);
        this.setMode(newBaudotMode);
        // this.push(baudot);
        // callback();
        callback(null, Buffer.from(baudot));
    }
    setMode(baudotMode) {
        // logger.log('debug', `AsciiToBaudot setMode to ${baudotMode.toString()}`);
        if (baudotMode !== this.baudotMode) {
            this.baudotMode = baudotMode;
            this.emit("modeChange", baudotMode);
        }
    }
}
exports.default = AsciiToBaudot;
