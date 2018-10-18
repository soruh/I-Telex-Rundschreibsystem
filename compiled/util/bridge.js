"use strict";
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
Object.defineProperty(exports, "__esModule", { value: true });
const stream = require("stream");
const duplexer_1 = require("./duplexer");
class Bridge {
    constructor() {
        const A_WRITE = new stream.PassThrough();
        const A_READ = new stream.PassThrough();
        const B_WRITE = new stream.PassThrough();
        const B_READ = new stream.PassThrough();
        A_WRITE.pipe(B_READ);
        B_WRITE.pipe(A_READ);
        this.A = duplexer_1.default(A_WRITE, A_READ);
        this.B = duplexer_1.default(B_WRITE, B_READ);
    }
}
exports.default = Bridge;
