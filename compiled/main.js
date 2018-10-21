"use strict";
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
Object.defineProperty(exports, "__esModule", { value: true });
const readline = require("readline");
const net = require("net");
const UI_1 = require("./ui/UI");
const UIConfig_1 = require("./ui/UIConfig");
const logging_1 = require("./util/logging");
const AsciiInterface_1 = require("./interfaces/AsciiInterface/AsciiInterface");
const BaudotInterface_1 = require("./interfaces/BaudotInterface/BaudotInterface");
Buffer.prototype.readNullTermString =
    function readNullTermString(encoding = "utf8", start = 0, end = this.length) {
        let firstZero = this.indexOf(0, start);
        let stop = firstZero >= start && firstZero <= end ? firstZero : end;
        return this.toString(encoding, start, stop);
    };
const server = new net.Server();
server.on('connection', socket => {
    const asciiInterFace = new AsciiInterface_1.default(false);
    const baudotInterFace = new BaudotInterface_1.default();
    asciiInterFace._external.pause();
    baudotInterFace._external.pause();
    socket.pipe(asciiInterFace.external);
    asciiInterFace.external.pipe(socket);
    socket.pipe(baudotInterFace.external);
    baudotInterFace.external.pipe(socket);
    let interFace;
    socket.once('data', data => {
        if ([0, 1, 2, 3, 4, 6, 7, 8, 9].indexOf(data[0]) === -1) {
            interFace = asciiInterFace;
            asciiInterFace._external.resume();
            baudotInterFace.internal.unpipe();
            baudotInterFace.external.unpipe();
            baudotInterFace.end();
        }
        else {
            interFace = baudotInterFace;
            baudotInterFace._external.resume();
            asciiInterFace.internal.unpipe();
            asciiInterFace.external.unpipe();
            asciiInterFace.end();
        }
        logging_1.logger.log(logging_1.inspect `${interFace instanceof BaudotInterface_1.default ? 'baudot' : 'ascii'} client calling`);
        interFace.on('end', () => {
            socket.end();
        });
        socket.on('error', err => {
            logging_1.logger.log('error', err);
            socket.end();
        });
        // interFace.on('timeout', (ext:number)=>{
        // });
        let logStreamIn = new logging_1.logStream(logging_1.inspect `calling client \x1b[033m in\x1b[0m`, interFace.internal);
        let logStreamOut = new logging_1.logStream(logging_1.inspect `calling client \x1b[034mout\x1b[0m`, interFace._internal);
        socket.on('close', () => {
            logStreamIn.end();
            logStreamOut.end();
            logging_1.logger.log(logging_1.inspect `calling client disconnected`);
        });
        const rl = readline.createInterface({
            input: interFace.internal,
            output: interFace.internal,
        });
        const ui = new UI_1.default(UIConfig_1.default, "start");
        const client = {
            interface: interFace,
            socket,
            numbers: [],
        };
        // ui.start(rl, client); // for ascii interface
        if (interFace instanceof BaudotInterface_1.default) {
            interFace.on('call', ext => {
                ui.start(rl, client);
                logging_1.logger.log(logging_1.inspect `baudot client calling extension: ${ext}`);
            });
        }
        else {
            ui.start(rl, client);
            logging_1.logger.log(logging_1.inspect `ascii client calling`);
        }
    });
});
server.listen(4000);
