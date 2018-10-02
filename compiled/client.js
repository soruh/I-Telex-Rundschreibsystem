"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = require("net");
const BaudotInterface_1 = require("./interfaces/BaudotInterface/BaudotInterface");
const logging_1 = require("./util/logging");
const stream_1 = require("stream");
// tslint:disable-next-line:no-empty
logging_1.logger = { log: () => { } };
let socket = new net_1.Socket();
let baudotInterface = new BaudotInterface_1.default();
class noAutoCr extends stream_1.Transform {
    _transform(chunk, encoding, callback) {
        callback(null, chunk.toString().replace(/\n/g, '\x1b[1B'));
    }
}
socket
    .pipe(baudotInterface.external)
    .pipe(socket);
process.stdin
    .pipe(baudotInterface.internal)
    .pipe(new noAutoCr())
    .pipe(process.stdout);
socket.connect({ port: 4000 });
baudotInterface.call(0);
baudotInterface.on('end', () => {
    socket.end();
    process.exit();
});
