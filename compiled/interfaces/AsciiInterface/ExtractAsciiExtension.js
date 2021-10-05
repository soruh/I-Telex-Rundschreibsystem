"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const events_1 = require("events");
class ExtractAsciiExtension extends stream_1.Transform {
    constructor() {
        super(...arguments);
        this.gotExtension = false;
        this.extensionBuffer = '';
        this.emitter = new events_1.EventEmitter();
    }
    _transform(chunk, encoding, callback) {
        if (this.gotExtension) {
            callback(null, chunk);
        }
        else {
            this.extensionBuffer += chunk.toString();
            let res = /^\*([0-9]|[0-9][0-9]|10[0-9])\*/g.exec(this.extensionBuffer);
            if (res) {
                this.gotExtension = true;
                this.emitter.emit('extension', parseInt(res[1]));
                callback(null, this.extensionBuffer.slice(res[0].length));
            }
            else {
                let extensionFailed = false;
                switch (this.extensionBuffer.length) {
                    case 4:
                        if ((!/[0-9]/.test(this.extensionBuffer[3])) ||
                            this.extensionBuffer[2] !== '0' ||
                            this.extensionBuffer[1] !== '1') {
                            extensionFailed = true;
                            break;
                        }
                    case 3:
                        if (!/[0-9]/.test(this.extensionBuffer[2])) {
                            extensionFailed = true;
                            break;
                        }
                    case 2:
                        if (!/[0-9]/.test(this.extensionBuffer[1])) {
                            extensionFailed = true;
                            break;
                        }
                    case 1:
                        if (this.extensionBuffer[0] !== '*') {
                            extensionFailed = true;
                            break;
                        }
                    case 0:
                        break;
                    default:
                        extensionFailed = true;
                }
                if (extensionFailed) {
                    this.gotExtension = true;
                    this.emitter.emit('extension', 0);
                    callback(null, this.extensionBuffer);
                }
                else {
                    callback(null, null);
                }
            }
        }
    }
}
exports.default = ExtractAsciiExtension;
