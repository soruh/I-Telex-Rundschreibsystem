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
const Interface_1 = require("../Interface");
const ExtractAsciiExtension_1 = require("./ExtractAsciiExtension");
class AsciiInterface extends Interface_1.default {
    constructor(caller) {
        super();
        if (caller) {
            this.extractor = new ExtractAsciiExtension_1.default();
            this.extractor.on('extension', (ext) => {
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
}
exports.default = AsciiInterface;
