"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const bridge_1 = require("../util/bridge");
class Interface extends events_1.EventEmitter {
    // public internal   = new PassThrough(); //Readable  from outside -> Writeable  from inside
    // public internal  = new PassThrough(); //Writeable from outside -> Readable   from inside
    // public externalReadStream  = new PassThrough(); //Readable  from outside -> Writeable  from inside
    // public externalWriteStream = new PassThrough(); //Writeable from outside -> Readable   from inside
    inputBridge = new bridge_1.default();
    outputBridge = new bridge_1.default();
    _external = this.inputBridge.A; // TODO: find better names
    _internal = this.outputBridge.A;
    external = this.inputBridge.B;
    internal = this.outputBridge.B;
    constructor() {
        super();
    }
    destroy() {
        this.external.unpipe();
        this.internal.unpipe();
        this._external.unpipe();
        this._internal.unpipe();
        this.external.destroy();
        this.internal.destroy();
        this._external.destroy();
        this._internal.destroy();
    }
    call(extension) {
        // overwrite in child class
    }
    end() {
        // overwrite in child class
    }
}
exports.default = Interface;
