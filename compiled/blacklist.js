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
const path_1 = require("path");
const fs_1 = require("fs");
const logging_1 = require("./util/logging");
const ITelexServerCom_1 = require("./util/ITelexServerCom");
const UIConfig_1 = require("./ui/UIConfig");
const BaudotInterface_1 = require("./interfaces/BaudotInterface/BaudotInterface");
const AsciiInterface_1 = require("./interfaces/AsciiInterface/AsciiInterface");
const readline = require("readline");
const net_1 = require("net");
const UI_1 = require("./ui/UI");
const blackListPath = path_1.join(__dirname, '../blacklist.json');
function blacklist() {
    try {
        let file = fs_1.readFileSync(blackListPath).toString();
        let list = JSON.parse(file);
        if (list instanceof Array) {
            if (list.find(x => typeof x !== "string")) {
                throw new Error('the blacklist must only contain strings');
            }
            else {
                return list;
            }
        }
        else {
            throw new Error('the blacklist must contain an Array');
        }
    }
    catch (err) {
        logging_1.logger.log(logging_1.inspect `error reading blacklist: ${err}`);
        return [];
    }
}
exports.blacklist = blacklist;
function addToBlacklist(number) {
    let oldBlacklist = blacklist();
    if (oldBlacklist.indexOf(number) === -1) {
        oldBlacklist.push(number);
        fs_1.writeFileSync(blackListPath, JSON.stringify(oldBlacklist));
    }
}
exports.addToBlacklist = addToBlacklist;
function removeFromBlacklist(number) {
    let oldBlacklist = blacklist();
    let index = oldBlacklist.indexOf(number);
    if (index > -1) {
        oldBlacklist.splice(index, 1);
        fs_1.writeFileSync(blackListPath, JSON.stringify(oldBlacklist));
    }
}
exports.removeFromBlacklist = removeFromBlacklist;
function confirmBlacklistToggle(number) {
    return __awaiter(this, void 0, void 0, function* () {
        let peer;
        try {
            peer = yield ITelexServerCom_1.peerQuery(number);
        }
        catch (err) {
            logging_1.logger.log(`Error in peerQuery:\r\n${err}`);
        }
        if (!peer) {
            return;
        }
        setTimeout(() => {
            logging_1.logger.log(logging_1.inspect `calling ${number} to confirm their blacklisting`);
            let interFace;
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
                    return;
            }
            const rl = readline.createInterface({
                input: interFace.internal,
                output: interFace.internal,
            });
            let socket = new net_1.Socket();
            socket.pipe(interFace.external);
            interFace.external.pipe(socket);
            const ui = new UI_1.default(UIConfig_1.default, "confirmBlacklist");
            const client = {
                interface: interFace,
                socket,
                numbers: [number],
            };
            socket.on('error', err => {
                socket.end();
                logging_1.logger.log(logging_1.inspect `called client error: ${err}`);
            });
            socket.on('close', () => {
                rl.close();
                logging_1.logger.log(logging_1.inspect `called client disconnected`);
            });
            socket.setTimeout(60 * 1000);
            socket.on('timeout', () => {
                socket.end();
                logging_1.logger.log(logging_1.inspect `called client timed out`);
            });
            socket.connect({ host: peer.ipaddress || peer.hostname, port: +peer.port }, () => {
                client.interface.internal.write("Rundschreibsystem:\r\n");
                ui.start(rl, client);
            });
        }, 60 * 1000);
    });
}
exports.confirmBlacklistToggle = confirmBlacklistToggle;
// tslint:enable:no-string-throw
function isBlacklisted(number) {
    return blacklist().indexOf(number) > -1;
}
exports.isBlacklisted = isBlacklisted;
