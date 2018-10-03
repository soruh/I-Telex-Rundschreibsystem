"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = require("net");
const BaudotInterface_1 = require("./interfaces/BaudotInterface/BaudotInterface");
const logging_1 = require("./util/logging");
const stream_1 = require("stream");
// tslint:disable-next-line:no-string-throw
if (!process.argv[2] || !process.argv[3])
    throw ('USAGE:\nnode client.js host port');
// tslint:disable-next-line:no-empty
logging_1.logger = { log: () => { } };
let socket = new net_1.Socket();
let baudotInterface = new BaudotInterface_1.default();
class noAutoCr extends stream_1.Transform {
    _transform(chunk, encoding, callback) {
        callback(null, chunk.toString().replace(/\n/g, '\x1b[1B'));
    }
}
// tslint:disable-next-line:max-classes-per-file
class addCr extends stream_1.Transform {
    _transform(chunk, encoding, callback) {
        callback(null, chunk.toString().replace(/\n/g, '\r\n'));
    }
}
socket
    .pipe(baudotInterface.external)
    .pipe(socket);
process.stdin
    .pipe(new addCr())
    .pipe(baudotInterface.internal)
    .pipe(new noAutoCr())
    .pipe(process.stdout);
socket.connect({ host: process.argv[2], port: parseInt(process.argv[3]) });
baudotInterface.call(null);
baudotInterface.on('end', () => {
    socket.end();
    process.exit();
});
