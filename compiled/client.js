"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = require("net");
const BaudotInterface_1 = require("./interfaces/BaudotInterface/BaudotInterface");
const logging_1 = require("./util/logging");
const stream_1 = require("stream");
Buffer.prototype.readNullTermString =
    function readNullTermString(encoding = "utf8", start = 0, end = this.length) {
        let firstZero = this.indexOf(0, start);
        let stop = firstZero >= start && firstZero <= end ? firstZero : end;
        return this.toString(encoding, start, stop);
    };
// tslint:disable-next-line:no-string-throw
if (!process.argv[2] || !process.argv[3])
    throw ('USAGE:\nnode client.js host port');
// tslint:disable-next-line:no-empty
logging_1.logger = { log: () => { } };
let socket = new net_1.Socket();
let baudotInterface = new BaudotInterface_1.default(logging_1.logger, ["\x1b[32m", "client", "\x1b[0m"]);
class noAutoCr extends stream_1.Transform {
    padding = 0;
    _transform(chunk, encoding, callback) {
        let out = "";
        for (let char of chunk.toString()) {
            switch (char) {
                case '\r':
                    this.padding = 0;
                    out += '\r';
                    break;
                case '\n':
                    out += '\n';
                    out += ' '.repeat(this.padding);
                    break;
                default:
                    this.padding++;
                    out += char;
            }
        }
        callback(null, out);
    }
}
// tslint:disable-next-line:max-classes-per-file
class addCr extends stream_1.Transform {
    _transform(chunk, encoding, callback) {
        callback(null, chunk.toString().replace(/\n/g, '\r\n'));
    }
}
socket.once('close', () => {
    process.stdout.write("\n<connection closed>\n");
    process.exit();
});
socket.on('error', () => {
    //
});
socket
    .pipe(baudotInterface.external)
    .pipe(socket);
process.stdin
    .pipe(new addCr())
    .pipe(baudotInterface.internal)
    .pipe(new noAutoCr())
    .pipe(process.stdout);
socket.connect({ host: process.argv[2], port: parseInt(process.argv[3]) });
baudotInterface.call('42');
baudotInterface.on('request end', () => {
    process.stdout.write("\n<connection end requested>\n");
    socket.end();
});
baudotInterface.on('end', () => {
    process.stdout.write("\n<interface ended>\n");
    socket.end();
});
