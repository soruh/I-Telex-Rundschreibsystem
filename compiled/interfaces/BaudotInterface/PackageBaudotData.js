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
const constants_1 = require("../../constants");
class PackageBaudotData extends stream_1.Transform {
    constructor(options) {
        super(options);
    }
    _transform(chunk, encoding, callback) {
        while (chunk.length > 0) {
            let data = chunk.slice(0, constants_1.MAX_BAUDOT_DATA_SIZE);
            this.push(Buffer.concat([Buffer.from([2, data.length]), data]));
            chunk = chunk.slice(constants_1.MAX_BAUDOT_DATA_SIZE);
        }
        callback();
    }
}
exports.default = PackageBaudotData;
