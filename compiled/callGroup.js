"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
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
            return 'derailed';
        default:
            return code;
    }
}
function callOne(number, index) {
    return new Promise(async (resolve, reject) => {
        // output.write(`calling: ${number}\r\n`);
        let peer;
        try {
            peer = await ITelexServerCom_1.peerQuery(number);
        }
        catch (err) {
            logging_1.logger.log(`Error in peerQuery:\r\n${err}`);
        }
        let interFace;
        if (peer) {
            // output.write(`number found: ${peer.name}\r\n`);
            switch (peer.type) {
                case 1:
                case 2:
                case 5:
                    interFace = new BaudotInterface_1.default();
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
            if (blacklist_1.isBlacklisted(number)) {
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
            let timeout = setTimeout(() => {
                // output.write("timeout\r\n");
                interFace.end();
                // output.write(`${DELIMITER}\r\n`);
                reject('timeout');
            }, 10000);
            socket.on('connect', async () => {
                if (!(interFace instanceof AsciiInterface_1.default && peer.extension === null)) {
                    logging_1.logger.log('calling: ' + peer.extension);
                    interFace.call(peer.extension);
                }
                if (interFace instanceof BaudotInterface_1.default) {
                    interFace.internal.resume();
                    await new Promise((resolve, reject) => {
                        setTimeout(resolve, 100);
                    });
                    if (interFace.drained) {
                        logging_1.logger.log('was already drained');
                    }
                    else {
                        logging_1.logger.log('waiting for drain');
                        await new Promise((resolve, reject) => {
                            interFace.on('drain', () => {
                                resolve();
                            });
                        });
                        logging_1.logger.log('drained');
                    }
                }
                confirm_1.default(interFace.internal, timeout, +index)
                    .then(result => {
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
                })
                    .catch(err => {
                    logging_1.logger.log(logging_1.inspect `error: ${err}`);
                });
            });
            interFace.on('reject', reason => {
                clearTimeout(timeout);
                interFace.end();
                logging_1.logger.log(util.inspect(reason));
                // output.write(`${reason}`); // \r\n is included in reject message
                // output.write(`${DELIMITER}\r\n`);
                reject(reason);
            });
            socket.once('error', (err) => {
                switch (err.code) {
                    case "EHOSTUNREACH":
                        clearTimeout(timeout);
                        interFace.end();
                        // output.write("derailed\r\n");
                        // output.write(`${DELIMITER}\r\n`);
                        break;
                    default:
                        logging_1.logger.log('unexpected error: ' + err.code);
                }
            });
            socket.on('error', (err) => {
                if (err.message === "ERR_STREAM_WRITE_AFTER_END")
                    return;
                socket.end();
                logging_1.logger.log(logging_1.inspect `socket error: ${err}`);
                reject(explainErrorCode(err.code));
            });
            socket.on('close', () => {
                interFace.end();
                logging_1.logger.log(logging_1.inspect `called client disconnected`);
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
            const result = await callOne(number, index);
            status.emit('success', number, result);
            return result;
        }
        catch (err) {
            status.emit('fail', number, err);
        }
    }))
        .then(clients => callback(null, clients.filter(x => x)))
        .catch(err => callback(err, null));
    return status;
}
exports.default = callGroup;
