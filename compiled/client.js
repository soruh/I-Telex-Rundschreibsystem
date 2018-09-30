"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = require("net");
const BaudotInterface_1 = require("./interfaces/BaudotInterface/BaudotInterface");
const logging_1 = require("./util/logging");
// tslint:disable-next-line:no-empty
logging_1.logger = { log: () => { } };
let socket = new net_1.Socket();
let baudotInterface = new BaudotInterface_1.default();
socket.pipe(baudotInterface.external);
baudotInterface.external.pipe(socket);
process.stdin.pipe(baudotInterface.internal);
baudotInterface.internal.pipe(process.stdout);
socket.connect({ port: 4000 });
baudotInterface.call(0);
baudotInterface.on('end', () => {
    socket.end();
    process.exit();
});
