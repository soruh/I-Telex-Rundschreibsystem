"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const baudot_1 = require("../../util/baudot");
class BaudotToAscii extends stream_1.Transform {
    constructor() {
        super(...arguments);
        this.baudotMode = baudot_1.baudotModeUnknown;
    }
    _transform(chunk, encoding, callback) {
        let [ascii, newBaudotMode] = (0, baudot_1.asciify)(chunk, this.baudotMode);
        this.setMode(newBaudotMode);
        // this.push(ascii);
        // callback();
        callback(null, ascii);
    }
    setMode(baudotMode) {
        // logger.log(`BaudotToAscii setMode to ${baudotMode.toString()}`);
        if (baudotMode !== this.baudotMode) {
            this.baudotMode = baudotMode;
            this.emit("modeChange", baudotMode);
        }
    }
}
exports.default = BaudotToAscii;
