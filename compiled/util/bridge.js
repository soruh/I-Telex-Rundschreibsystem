"use strict";
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
Object.defineProperty(exports, "__esModule", { value: true });
const stream = require("stream");
const duplexer_1 = require("./duplexer");
const logging_1 = require("./logging");
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
        this.A.on('error', err => {
            logging_1.logger.log('Bridge stream A error:', err);
        });
        this.B.on('error', err => {
            logging_1.logger.log('Bridge stream B error:', err);
        });
    }
}
exports.default = Bridge;
