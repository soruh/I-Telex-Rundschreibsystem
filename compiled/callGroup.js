"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
if (module.parent != null) {
    let mod = module;
    let loadOrder = [mod.filename.split("/").slice(-1)[0]];
    while (mod.parent) {
        mod = mod.parent;
        loadOrder.push(mod.filename.split("/").slice(-1)[0]);
    }
    loadOrder = loadOrder.map((name, index) => { let color = "\x1b[33m"; if (index == 0)
        color = "\x1b[32m"; if (index == loadOrder.length - 1)
        color = "\x1b[36m"; return (`${color}${name}\x1b[0m`); }).reverse();
    console.log(loadOrder.join(" → "));
}
const stream_1 = require("stream");
const net_1 = require("net");
const ITelexServerCom_1 = require("./util/ITelexServerCom");
const BaudotInterface_1 = require("./interfaces/BaudotInterface/BaudotInterface");
const AsciiInterface_1 = require("./interfaces/AsciiInterface/AsciiInterface");
const logging_1 = require("./util/logging");
const serialEachPromise_1 = require("./util/serialEachPromise");
function callGroup(group, callback) {
    let output = new stream_1.PassThrough();
    serialEachPromise_1.default(group, (number, key) => new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        output.write(`calling: ${number}\r\n`);
        let peer = yield ITelexServerCom_1.peerQuery(number);
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
                    reject();
            }
            if (interFace) {
                // output.write('valid client type\r\n');
                let socket = new net_1.Socket();
                socket.pipe(interFace.external);
                interFace.external.pipe(socket);
                let timeout = setTimeout(() => {
                    output.write("\r\ntimeout\r\n\n");
                    interFace.end();
                    reject();
                }, 10000);
                socket.on('connect', () => {
                    interFace.call(peer.extension);
                    setTimeout(() => {
                        interFace.internal.write('@');
                    }, 1500);
                    interFace.internal.pipe(output);
                    interFace.internal.once('data', () => {
                        clearTimeout(timeout);
                        setTimeout(() => {
                            output.write('\r\n\n');
                            interFace.internal.unpipe(output);
                            let connection = {
                                socket,
                                name: peer.name,
                                number: peer.number,
                                interface: interFace,
                            };
                            resolve(connection);
                        }, 7500);
                    });
                });
                interFace.on('reject', reason => {
                    output.write(`\r\n${reason}\r\n\n`);
                    clearTimeout(timeout);
                    interFace.end();
                    reject();
                });
                socket.once('error', (err) => {
                    switch (err.code) {
                        case "EHOSTUNREACH":
                            clearTimeout(timeout);
                            output.write("\r\nderailed\r\n\n");
                            interFace.end();
                            reject();
                            break;
                        default:
                            logging_1.logger.log('error: ' + err.code);
                    }
                });
                socket.connect({
                    host: peer.hostname || peer.ipaddress,
                    port: parseInt(peer.port),
                });
            }
        }
        else {
            output.write("number not found\r\n\n");
            reject();
        }
    })))
        .then((clients) => callback(clients))
        .catch(err => {
        // 
    });
    return output;
}
exports.default = callGroup;
