"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
const stream_1 = require("stream");
const net_1 = require("net");
const util = require("util");
const ITelexServerCom_1 = require("./util/ITelexServerCom");
const BaudotInterface_1 = require("./interfaces/BaudotInterface/BaudotInterface");
const AsciiInterface_1 = require("./interfaces/AsciiInterface/AsciiInterface");
const logging_1 = require("./util/logging");
const confirm_1 = require("./confirm");
const serialEachPromise_1 = require("./util/serialEachPromise");
const config_1 = require("./config");
const blacklist_1 = require("./blacklist");
function callGroup(group, callback) {
    const output = new stream_1.PassThrough();
    serialEachPromise_1.default(group, (number, index) => new Promise(async (resolve, reject) => {
        output.write(`calling: ${number}\r\n`);
        let peer;
        try {
            peer = await ITelexServerCom_1.peerQuery(number);
        }
        catch (err) {
            logging_1.logger.log(`Error in peerQuery:\r\n${err}`);
        }
        let interFace;
        if (peer) {
            output.write(`number found: ${peer.name}\r\n`);
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
                    output.write("invalid client type\r\n\n");
                    reject('invalid type');
                    return;
            }
            if (blacklist_1.isBlacklisted(number)) {
                output.write(`${peer.name}(${peer.number}) has been blacklisted\r\n\n`);
                reject('blacklisted');
                return;
            }
            output.write(`${config_1.DELIMITER}\r\n`);
            if (interFace instanceof BaudotInterface_1.default) {
                interFace.asciifier.on('modeChange', (newMode) => {
                    logging_1.logger.log(logging_1.inspect `new called client mode: ${newMode}`);
                });
            }
            // output.write('valid client type\r\n');
            let socket = new net_1.Socket();
            socket.pipe(interFace.external);
            interFace.external.pipe(socket);
            let timeout = setTimeout(() => {
                output.write("timeout\r\n");
                interFace.end();
                output.write(`${config_1.DELIMITER}\r\n`);
                reject('timeout');
            }, 10000);
            socket.on('connect', () => {
                if (!(interFace instanceof AsciiInterface_1.default && peer.extension === null)) {
                    logging_1.logger.log('calling: ' + peer.extension);
                    interFace.call(peer.extension);
                }
                confirm_1.default(interFace.internal, timeout, +index)
                    .then(result => {
                    output.write(result);
                    output.write('\r\n');
                    interFace.internal.unpipe(output);
                    // if(interFace instanceof BaudotInterface) interFace.asciifier.setMode(baudotModeUnknown);
                    let connection = {
                        socket,
                        name: peer.name,
                        number: peer.number,
                        interface: interFace,
                    };
                    output.write(`\r\n${config_1.DELIMITER}\r\n`);
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
                output.write(`${reason}`); // \r\n is included in reject message
                output.write(`${config_1.DELIMITER}\r\n`);
                reject(reason);
            });
            socket.once('error', (err) => {
                switch (err.code) {
                    case "EHOSTUNREACH":
                        clearTimeout(timeout);
                        interFace.end();
                        output.write("derailed\r\n");
                        output.write(`${config_1.DELIMITER}\r\n`);
                        break;
                    default:
                        logging_1.logger.log('unexpected error: ' + err.code);
                }
            });
            socket.on('error', (err) => {
                socket.end();
                logging_1.logger.log(logging_1.inspect `socket error: ${err}`);
                reject(err);
            });
            socket.connect({
                host: peer.hostname || peer.ipaddress,
                port: parseInt(peer.port),
            });
        }
        else {
            // output.write("--- 404 ---\r\n");
            output.write("number not found\r\n\n");
            reject('not found');
        }
    }))
        .then((clients) => callback(null, clients))
        .catch(err => callback(err, null));
    return output;
}
exports.default = callGroup;
