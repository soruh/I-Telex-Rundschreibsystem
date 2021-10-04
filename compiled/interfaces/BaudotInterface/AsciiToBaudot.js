"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const baudot_1 = require("../../util/baudot");
class AsciiToBaudot extends stream_1.Transform {
    baudotMode = baudot_1.baudotModeUnknown;
    constructor(options) {
        super(options);
    }
    _transform(chunk, encoding, callback) {
        let [baudot, newBaudotMode] = (0, baudot_1.baudotify)(chunk.toString(), this.baudotMode);
        this.setMode(newBaudotMode);
        // this.push(baudot);
        // callback();
        callback(null, Buffer.from(baudot));
    }
    setMode(baudotMode) {
        // logger.log(`AsciiToBaudot setMode to ${baudotMode.toString()}`);
        if (baudotMode !== this.baudotMode) {
            this.baudotMode = baudotMode;
            this.emit("modeChange", baudotMode);
        }
    }
}
exports.default = AsciiToBaudot;
