"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = require("net");
const ChunkPackages_1 = require("./util/ChunkPackages");
const baudot_1 = require("./util/baudot");
const util = require("util");
const logging_1 = require("./util/logging");
Buffer.prototype.readNullTermString =
    function readNullTermString(encoding = "utf8", start = 0, end = this.length) {
        let firstZero = this.indexOf(0, start);
        let stop = firstZero >= start && firstZero <= end ? firstZero : end;
        return this.toString(encoding, start, stop);
    };
const logger = console;
const server = new net_1.Server(connection => {
    function handleDate(data, name) {
        switch (data[0]) {
            case 0:
                logger.log(logging_1.inspect `${name} Heartbeat`);
                break;
            case 1:
                logger.log(logging_1.inspect `${name} Call ${data[2]}`);
                break;
            case 2:
                let [text, newMode] = baudot_1.asciify(Buffer.from(Array.from(data).slice(2)), baudotMode);
                baudotMode = newMode;
                logger.log(logging_1.inspect `${name} Decoded Baudot ${util.inspect(text)}`);
                logger.log(logging_1.inspect `${name} Encoded Baudot ${data.slice(2)}`);
                break;
            case 3:
                logger.log(logging_1.inspect `${name} End`);
                break;
            case 4:
                logger.log(logging_1.inspect `${name} Reject ${data.readNullTermString('utf8', 2)}`);
                break;
            case 6:
                logger.log(logging_1.inspect `${name} Ack ${data.readIntLE(2, 1)}`);
                break;
            case 7:
                logger.log(logging_1.inspect `${name} Version ${data[2]} ${data.readNullTermString('utf8', 3)}`);
                break;
            default:
                logger.log(logging_1.inspect `${name} ${data}`);
        }
    }
    let socket = net_1.connect({ host: '192.168.1.75', port: 134 });
    socket.pipe(connection);
    connection.pipe(socket);
    let chunker_a = new ChunkPackages_1.default();
    let chunker_b = new ChunkPackages_1.default();
    socket.pipe(chunker_a);
    connection.pipe(chunker_b);
    let baudotMode = baudot_1.baudotModeUnknown;
    chunker_a.on('data', data => {
        handleDate(data, '\x1b[031mitelex');
    });
    chunker_b.on('data', data => {
        handleDate(data, '\x1b[034mclient');
    });
});
server.listen(5000);
