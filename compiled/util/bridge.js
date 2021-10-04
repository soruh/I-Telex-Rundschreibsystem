"use strict";
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
        this.A = (0, duplexer_1.default)(A_WRITE, A_READ);
        this.B = (0, duplexer_1.default)(B_WRITE, B_READ);
        this.A.on('error', err => this.handleError(err, 'A'));
        this.B.on('error', err => this.handleError(err, 'B'));
        this.A.once('end', () => this.handleEnd('A'));
        this.B.once('end', () => this.handleEnd('B'));
    }
    handleError(err, stream) {
        switch ((err).code) {
            case "ERR_STREAM_WRITE_AFTER_END":
            case "ERR_STREAM_DESTROYED":
                return;
            default:
                logging_1.logger.log('Bridge stream ' + stream + ' error:', err);
        }
    }
    handleEnd(stream) {
        logging_1.logger.log('Bridge stream ' + stream + ' ended');
    }
}
exports.default = Bridge;
