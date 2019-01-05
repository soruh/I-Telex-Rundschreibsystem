"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const fs_1 = require("fs");
const logging_1 = require("./util/logging");
const ITelexServerCom_1 = require("./util/ITelexServerCom");
const BaudotInterface_1 = require("./interfaces/BaudotInterface/BaudotInterface");
const AsciiInterface_1 = require("./interfaces/AsciiInterface/AsciiInterface");
const readline_1 = require("readline");
const net_1 = require("net");
const blackListPath = path_1.join(__dirname, '../blacklist.json');
let blackListLocked = false;
function getBlacklist() {
    try {
        let file = fs_1.readFileSync(blackListPath).toString();
        let list = JSON.parse(file);
        if (list instanceof Array) {
            if (list.find(x => typeof x !== "number")) {
                throw new Error('the blacklist must only contain numbers');
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
function changeBlacklist(callback) {
    if (blackListLocked) {
        setTimeout(changeBlacklist, 100, callback); // wait .1 seconds before trying again.
        return;
    }
    blackListLocked = true;
    fs_1.writeFile(blackListPath, JSON.stringify(callback(getBlacklist())), () => {
        blackListLocked = false;
        logging_1.logger.log(logging_1.inspect `wrote new blacklist`);
    });
}
function addToBlacklist(number) {
    changeBlacklist(blacklist => {
        if (blacklist.indexOf(number) === -1) {
            blacklist.push(number);
        }
        return blacklist;
    });
}
exports.addToBlacklist = addToBlacklist;
function removeFromBlacklist(number) {
    changeBlacklist(blacklist => {
        let index = blacklist.indexOf(number);
        if (index > -1) {
            blacklist.splice(index, 1);
        }
        return blacklist;
    });
}
exports.removeFromBlacklist = removeFromBlacklist;
async function updateBlacklistForNumber(number) {
    let peer;
    try {
        peer = await ITelexServerCom_1.peerQuery(number);
    }
    catch (err) {
        logging_1.logger.log(`Error in peerQuery:\r\n${err}`);
        throw (new Error('failed retrieve number from server.'));
    }
    if (!peer) {
        logging_1.logger.log(`Peer not found.`);
        throw new Error('Peer not found.');
    }
    setTimeout(() => {
        logging_1.logger.log(logging_1.inspect `calling ${number} to confirm their blacklisting`);
        let interFace;
        switch (peer.type) {
            case 1:
            case 2:
            case 5:
                interFace = new BaudotInterface_1.default(logging_1.logger, ["\x1b[90m", "blacklist", "\x1b[0m"]);
                break;
            case 3:
            case 4:
                interFace = new AsciiInterface_1.default(false);
                break;
            case 6:
            default:
                return;
        }
        const rl = readline_1.createInterface({
            input: interFace.internal,
            output: interFace.internal,
        });
        let socket = new net_1.Socket();
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
        function close() {
            interFace.once('end', () => socket.destroy());
            interFace.end();
        }
        function confirmBlacklisting() {
            rl.question(`do you (${number}) want to be blacklisted?\r\n (j/y/n) `, answer => {
                switch (answer.toLowerCase()) {
                    case 'y':
                    case 'j':
                        addToBlacklist(number);
                        interFace.internal.write("You are now blacklisted.\r\n");
                        clearTimeout(timeout);
                        close();
                        break;
                    case 'n':
                        removeFromBlacklist(number);
                        interFace.internal.write("You are now not blacklisted.\r\n");
                        clearTimeout(timeout);
                        close();
                        break;
                    default:
                        interFace.internal.write("Invalid input.\r\n");
                        confirmBlacklisting();
                }
            });
        }
        socket.connect({ host: peer.ipaddress || peer.hostname, port: +peer.port }, () => {
            socket.pipe(interFace.external);
            interFace.external.pipe(socket);
            interFace.call(peer.extension);
            interFace.internal.write("Rundschreibsystem:\r\n");
            confirmBlacklisting();
        });
        let timeout = setTimeout(() => {
            interFace.once('end', () => socket.destroy());
            interFace.end(); // end the interface
        }, 5 * 60 * 1000);
    }, 30 * 1000);
}
exports.updateBlacklistForNumber = updateBlacklistForNumber;
function isBlacklisted(number) {
    return getBlacklist().indexOf(number) > -1;
}
exports.isBlacklisted = isBlacklisted;
