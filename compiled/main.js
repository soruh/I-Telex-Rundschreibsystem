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
const stream_1 = require("stream");
const confirm_1 = require("./confirm");
const fs_1 = require("fs");
const path_1 = require("path");
const events_1 = require("events");
events_1.EventEmitter.defaultMaxListeners = Infinity; // allow infinite event listeners on all streams
Buffer.prototype.readNullTermString =
    function readNullTermString(encoding = "utf8", start = 0, end = this.length) {
        let firstZero = this.indexOf(0, start);
        let stop = firstZero >= start && firstZero <= end ? firstZero : end;
        return this.toString(encoding, start, stop);
    };
class RemoveCr extends stream_1.Transform {
    _transform(chunk, encoding, callback) {
        callback(null, chunk.toString().replace(/\r/g, ''));
    }
}
const server = new net.Server();
server.on('connection', socket => {
    let interFace;
    socket.on('error', err => {
        logging_1.logger.log('error', err);
        socket.end();
    });
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
            // interFace.internal.write('\r\n');
            // logger.log('confirming caller');
            let callerIdentifier = "";
            try {
                // interFace.internal.resume();
                callerIdentifier = await confirm_1.default(interFace.internal);
                logging_1.logger.log(logging_1.inspect `caller: ${require('util').inspect(callerIdentifier).slice(1, -1)}`);
                fs_1.appendFileSync(path_1.join(__dirname, '../caller_log.txt'), JSON.stringify({
                    time: new Date(),
                    caller: callerIdentifier,
                }) + '\n');
            }
            catch (err) {
                logging_1.logger.log(logging_1.inspect `caller confimation failed: ${err}`);
            }
            interFace.internal.write(config_1.IDENTIFIER);
            interFace.internal.write('\r\n\n');
            // interFace.internal.write(getText('german', 'welcome', [IDENTIFIER])+'\r\n\n');
            const removedCr = new RemoveCr();
            interFace.internal.pipe(removedCr);
            const rl = readline.createInterface({
                input: removedCr,
                output: interFace.internal,
            });
            try {
                var result = await ui_1.default(rl);
            }
            catch (err) {
                logging_1.logger.log(logging_1.inspect `ui failed: ${err}`);
                socket.end();
                return;
            }
            interFace.internal.unpipe(removedCr);
            switch (result.nextAction) {
                case 'call':
                    await call_1.default(result.language, {
                        interface: interFace,
                        socket,
                        identifier: callerIdentifier,
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
        function connectSocket(relayChunk = true) {
            if (relayChunk)
                interFace.external.write(chunk);
            socket.pipe(interFace.external);
            interFace.external.pipe(socket);
        }
        if (interFace instanceof BaudotInterface_1.default) {
            interFace.on('call', ext => {
                handleClient();
                logging_1.logger.log(logging_1.inspect `baudot client calling extension: ${ext}`);
            });
            connectSocket(true);
        }
        else {
            connectSocket(false);
            handleClient();
            logging_1.logger.log(logging_1.inspect `ascii client calling`);
        }
    });
});
server.listen(config_1.PORT, () => {
    logging_1.logger.log(logging_1.inspect `listening on port: ${config_1.PORT}`);
});
