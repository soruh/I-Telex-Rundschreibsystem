"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
