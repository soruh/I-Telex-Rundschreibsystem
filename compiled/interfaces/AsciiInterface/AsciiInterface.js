"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Interface_1 = require("../Interface");
const ExtractAsciiExtension_1 = require("./ExtractAsciiExtension");
class AsciiInterface extends Interface_1.default {
    constructor(caller) {
        super();
        this._external.once('close', () => {
            this.end();
        });
        if (caller) {
            this.extractor = new ExtractAsciiExtension_1.default();
            this.extractor.on('extension', ext => {
                // TODO
            });
            this._external.pipe(this.extractor).pipe(this._internal);
            this._internal.pipe(this._external);
        }
        else {
            this._external.pipe(this._internal);
            this._internal.pipe(this._external);
        }
    }
    call(extension) {
        this._external.write(`*${extension}*`);
    }
    end() {
        this.destroy();
        this.emit("end");
    }
}
exports.default = AsciiInterface;
