"use strict";
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
Object.defineProperty(exports, "__esModule", { value: true });
const readline = require("readline");
const net = require("net");
const logging_1 = require("./util/logging");
const AsciiInterface_1 = require("./interfaces/AsciiInterface/AsciiInterface");
const BaudotInterface_1 = require("./interfaces/BaudotInterface/BaudotInterface");
const ui_1 = require("./ui");
const call_1 = require("./call");
Buffer.prototype.readNullTermString =
    function readNullTermString(encoding = "utf8", start = 0, end = this.length) {
        let firstZero = this.indexOf(0, start);
        let stop = firstZero >= start && firstZero <= end ? firstZero : end;
        return this.toString(encoding, start, stop);
    };
const server = new net.Server();
server.on('connection', socket => {
    let interFace;
    socket.once('data', chunk => {
        if ([0, 1, 2, 3, 4, 6, 7, 8, 9].indexOf(chunk[0]) === -1) {
            interFace = new AsciiInterface_1.default(false);
        }
        else {
            interFace = new BaudotInterface_1.default();
        }
        interFace.external.write(chunk);
        socket.pipe(interFace.external);
        interFace.external.pipe(socket);
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
            interFace.end();
            logStreamIn.end();
            logStreamOut.end();
            logging_1.logger.log(logging_1.inspect `calling client disconnected`);
        });
        const rl = readline.createInterface({
            input: interFace.internal,
            output: interFace.internal,
        });
        async function handleClient() {
            const result = await ui_1.default(rl);
            switch (result.nextAction) {
                case 'call':
                    call_1.default({
                        interface: interFace,
                        socket,
                    }, result.callList);
                    break;
                case 'end':
                default:
                // TODO: end the connection
            }
        }
        if (interFace instanceof BaudotInterface_1.default) {
            interFace.on('call', ext => {
                handleClient();
                logging_1.logger.log(logging_1.inspect `baudot client calling extension: ${ext}`);
            });
        }
        else {
            handleClient();
            logging_1.logger.log(logging_1.inspect `ascii client calling`);
        }
    });
});
server.listen(4000);
