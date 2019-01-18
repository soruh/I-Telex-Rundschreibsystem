"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readline = require("readline");
const net = require("net");
const logging_1 = require("./util/logging");
const AsciiInterface_1 = require("./interfaces/AsciiInterface/AsciiInterface");
const BaudotInterface_1 = require("./interfaces/BaudotInterface/BaudotInterface");
const ui_1 = require("./ui");
const call_1 = require("./call");
const config_1 = require("./config");
const baudot_1 = require("./util/baudot");
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
            interFace = new BaudotInterface_1.default(logging_1.logger, ["\x1b[35m", "caller", "\x1b[0m"]);
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
        // let logStreamIn = new logStream(inspect`calling client \x1b[033m in\x1b[0m`, interFace.internal);
        // let logStreamOut = new logStream(inspect`calling client \x1b[034mout\x1b[0m`, interFace._internal);
        socket.on('close', () => {
            interFace.end(true);
            // logStreamIn.end();
            // logStreamOut.end();
            logging_1.logger.log(logging_1.inspect `calling client disconnected`);
        });
        async function handleClient() {
            interFace.internal.write('\r\n\n');
            interFace.internal.write("Type commands followed by an argument if needed.\r\n(LF) to confirm, h for help\r\n");
            interFace.internal.resume();
            if (interFace instanceof BaudotInterface_1.default) {
                if (!interFace.drained) {
                    // logger.log('waiting for drain');
                    await new Promise((resolve, reject) => {
                        interFace.on('drain', resolve);
                    });
                    // logger.log('drained');
                    interFace.asciifier.setMode(baudot_1.baudotModeUnknown);
                    interFace.baudotifier.setMode(baudot_1.baudotModeUnknown);
                }
                // else{
                // 	logger.log('was already drained');
                // }
            }
            const rl = readline.createInterface({
                input: interFace.internal,
                output: interFace.internal,
            });
            const result = await ui_1.default(rl);
            switch (result.nextAction) {
                case 'call':
                    await call_1.default({
                        interface: interFace,
                        socket,
                    }, result.callList);
                    break;
                case 'end':
                default:
                    rl.close();
                    interFace.once('end', () => socket.end());
                    interFace.end();
            }
            logging_1.logger.log(logging_1.inspect `ui actions finished`);
        }
        if (interFace instanceof BaudotInterface_1.default) {
            interFace.on('call', ext => {
                handleClient();
                // logger.log(inspect`baudot client calling extension: ${ext}`);
            });
        }
        else {
            handleClient();
            logging_1.logger.log(logging_1.inspect `ascii client calling`);
        }
        interFace.external.write(chunk);
        socket.pipe(interFace.external);
        interFace.external.pipe(socket);
    });
});
server.listen(config_1.PORT, () => {
    logging_1.logger.log(logging_1.inspect `listening on port: ${config_1.PORT}`);
});
