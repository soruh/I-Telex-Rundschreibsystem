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
const events_1 = require("events");
const bridge_1 = require("../util/bridge");
class Interface extends events_1.EventEmitter {
    constructor() {
        super();
        // public internal   = new PassThrough(); //Readable  from outside -> Writeable  from inside
        // public internal  = new PassThrough(); //Writeable from outside -> Readable   from inside
        // public externalReadStream  = new PassThrough(); //Readable  from outside -> Writeable  from inside
        // public externalWriteStream = new PassThrough(); //Writeable from outside -> Readable   from inside
        this.inputBridge = new bridge_1.default();
        this.outputBridge = new bridge_1.default();
        this._external = this.inputBridge.A; // TODO: find better names
        this._internal = this.outputBridge.A;
        this.external = this.inputBridge.B;
        this.internal = this.outputBridge.B;
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
}
exports.default = Interface;
