"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const events_1 = require("events");
class CallEndDetector extends stream_1.Transform {
    constructor() {
        super(...arguments);
        this.buffer = '';
        this.emitter = new events_1.EventEmitter();
    }
    _transform(chunk, encoding, callback) {
        let bufferedChunk = this.buffer + chunk.toString();
        this.buffer += chunk.toString();
        this.buffer = this.buffer.slice(-2);
        callback(null, chunk);
        if (/\+\+\+/.test(bufferedChunk)) {
            this.emitter.emit('end');
        }
    }
}
exports.default = CallEndDetector;
