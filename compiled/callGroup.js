"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = require("net");
const util = require("util");
const ITelexServerCom_1 = require("./util/ITelexServerCom");
const BaudotInterface_1 = require("./interfaces/BaudotInterface/BaudotInterface");
const AsciiInterface_1 = require("./interfaces/AsciiInterface/AsciiInterface");
const logging_1 = require("./util/logging");
const confirm_1 = require("./confirm");
const blacklist_1 = require("./blacklist");
const events_1 = require("events");
function explainErrorCode(code) {
    switch (code) {
        case 'EHOSTUNREACH':
        case 'ECONNREFUSED':
            return 'nc';
        default:
            return code;
    }
}
function callOne(number, index, numbers) {
    return new Promise(async (resolve, reject) => {
        // output.write(`calling: ${number}\r\n`);
        let peer;
        try {
            peer = await (0, ITelexServerCom_1.peerQuery)(number);
        }
        catch (err) {
            logging_1.logger.log(`Error in peerQuery:\r\n${err}`);
        }
        let interFace;
        if (peer) {
            // output.write(`number found: ${peer.name}\r\n`);
            const padding = (numbers.length - 1).toString().length;
            switch (peer.type) {
                case 1:
                case 2:
                case 5:
                    interFace = new BaudotInterface_1.default(logging_1.logger, ["\x1b[34m", `called ${index.toString().padStart(padding)}`, "\x1b[0m"]);
                    break;
                case 3:
                case 4:
                    interFace = new AsciiInterface_1.default(false);
                    break;
                case 6:
                default:
                    // output.write("invalid client type\r\n\n");
                    reject('invalid type');
                    return;
            }
            // const logStreamIn  = new logStream(inspect`called client ${index.toString().padStart(padding)} \x1b[033m in\x1b[0m`, interFace.internal);
            // const logStreamOut = new logStream(inspect`called client ${index.toString().padStart(padding)} \x1b[034mout\x1b[0m`, interFace._internal);
            if ((0, blacklist_1.isBlacklisted)(number)) {
                // output.write(`${peer.name}(${peer.number}) has been blacklisted\r\n\n`);
                reject('blacklisted');
                return;
            }
            // output.write(`${DELIMITER}\r\n`);
            // if(interFace instanceof BaudotInterface){
            // 	interFace.asciifier.on('modeChange', (newMode)=>{
            // 		logger.log(inspect`new called client mode: ${newMode}`);
            // 	});
            // }
            // output.write('valid client type\r\n');
            let socket = new net_1.Socket();
            socket.pipe(interFace.external);
            interFace.external.pipe(socket);
            socket.on('connect', async () => {
                if (!(interFace instanceof AsciiInterface_1.default && peer.extension === null)) {
                    logging_1.logger.log('calling: ' + peer.extension);
                    interFace.call(peer.extension);
                }
                if (interFace instanceof BaudotInterface_1.default) {
                    interFace.internal.resume();
                    await new Promise((resolve, reject) => {
                        interFace.once('ack', (x) => {
                            logging_1.logger.log(`initial ack: ${x}`);
                            if (interFace.drained) {
                                // logger.log('was already drained');
                                resolve();
                            }
                            else {
                                logging_1.logger.log('waiting for drain');
                                interFace.on('drain', () => {
                                    resolve();
                                    // logger.log('drained');
                                });
                            }
                        });
                    });
                }
                try {
                    const result = await (0, confirm_1.default)(interFace.internal, +index);
                    // output.write(result+'\r\n');
                    // interFace.internal.unpipe(output);
                    // if(interFace instanceof BaudotInterface) interFace.asciifier.setMode(baudotModeUnknown);
                    let connection = {
                        socket,
                        name: peer.name,
                        number: peer.number,
                        interface: interFace,
                        identifier: result,
                    };
                    // output.write(`\r\n${DELIMITER}\r\n`);
                    resolve(connection);
                }
                catch (err) {
                    logging_1.logger.log((0, logging_1.inspect) `confimation failed: ${err}`);
                    if (err.message === 'timeout') {
                        interFace.end();
                        reject('timeout');
                    }
                    else {
                        reject(err.message || err || 'unknown error');
                    }
                }
            });
            interFace.on('reject', reason => {
                interFace.end();
                logging_1.logger.log(util.inspect(reason));
                // output.write(`${reason}`); // \r\n is included in reject message
                // output.write(`${DELIMITER}\r\n`);
                reject(reason);
            });
            socket.on('error', (err) => {
                if (err.code === "ERR_STREAM_WRITE_AFTER_END")
                    return;
                socket.end();
                const explainedError = explainErrorCode(err.code);
                const expectedError = explainedError === 'nc';
                logging_1.logger.log((0, logging_1.inspect) `client socket for ${peer.number} had an ${expectedError ? 'expected' : 'unexpected'} error${expectedError ? '' : ': '}${expectedError ? '' : err}`);
                reject(explainedError);
            });
            socket.on('close', () => {
                interFace.end();
                // logStreamIn.end();
                // logStreamOut.end();
                logging_1.logger.log((0, logging_1.inspect) `called client disconnected`);
            });
            socket.connect({
                host: peer.hostname || peer.ipaddress,
                port: parseInt(peer.port),
            });
        }
        else {
            // output.write("--- 404 ---\r\n");
            // output.write("number not found\r\n\n");
            reject('not found');
        }
    });
}
function callGroup(group, callback) {
    const status = new events_1.EventEmitter();
    Promise.all(group.map(async (number, index) => {
        try {
            const result = await callOne(number, index, group);
            status.emit('success', number, result);
            return result;
        }
        catch (err) {
            status.emit('fail', number, err);
        }
    }))
        .then(clients => {
        status.emit('end');
        callback(null, clients.filter(x => x));
    })
        .catch(err => {
        status.emit('end');
        callback(err, null);
    });
    return status;
}
exports.default = callGroup;
