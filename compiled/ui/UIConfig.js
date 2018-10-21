"use strict";
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
Object.defineProperty(exports, "__esModule", { value: true });
const call_1 = require("../call");
const BaudotInterface_1 = require("../interfaces/BaudotInterface/BaudotInterface");
const blacklist_1 = require("../blacklist");
function close(readline, client) {
    readline.close();
    if (client.interface instanceof BaudotInterface_1.default)
        client.interface.sendEnd();
    setTimeout(() => {
        client.interface.end();
        client.socket.end();
    }, 1500);
}
let uiConfig = {
    start: {
        text: "welcome!\r\n1) call numbers\r\n2) (un)blacklist a number\r\n3) check blacklist-status of a number\r\n",
        responseHandler: (response, readline, client, questions, callback) => {
            if (response === "1") {
                client.interface.internal.write("enter numbers and confirm with LF\r\ntype '+++' to finish\r\n");
                callback(questions.addNumber);
            }
            else if (response === "2") {
                callback(questions.blacklist);
            }
            else if (response === "3") {
                callback(questions.blacklistStatus);
            }
            else {
                client.interface.internal.write("invalid input!\r\n");
                callback();
            }
        },
    },
    blacklist: {
        text: "enter a number to add to/remove from the blacklist\r\n- ",
        responseHandler: (response, readline, client, questions, callback) => {
            if (isNaN(parseInt(response))) {
                client.interface.internal.write("not a number!\r\n");
                callback(questions.start);
            }
            else {
                blacklist_1.confirmBlacklistToggle(response);
                // tslint:disable-next-line:max-line-length
                client.interface.internal.write(`${response} will be called in one minute,\r\nto confirm they want to be ${blacklist_1.isBlacklisted(response) ? 'un' : ''}blacklisted\r\n`);
                close(readline, client);
            }
        },
    },
    blacklistStatus: {
        text: "enter a number to getthe blacklist status for\r\n- ",
        responseHandler: (response, readline, client, questions, callback) => {
            if (isNaN(parseInt(response))) {
                client.interface.internal.write("not a number!\r\n");
                callback(questions.start);
            }
            else {
                // tslint:disable-next-line:max-line-length
                client.interface.internal.write(`${response} is ${blacklist_1.isBlacklisted(response) ? '' : 'not'} blacklisted\r\n`);
                callback(questions.start);
            }
        },
    },
    addNumber: {
        text: "\r- ",
        responseHandler: (response, readline, client, questions, callback) => {
            if (response === "+++") {
                callback(questions.confirm);
            }
            else {
                if (isNaN(parseInt(response))) {
                    client.interface.internal.write("not a number!\r\n");
                }
                else {
                    client.numbers.push(response);
                }
                callback(questions.addNumber);
            }
        },
    },
    removeNumber: {
        text: "\r\n- ",
        responseHandler: (response, readline, client, questions, callback) => {
            let index = client.numbers.indexOf(response);
            if (index > -1) {
                client.numbers.splice(index, 1);
                client.interface.internal.write(`\r\nremoved ${response}\r\n`);
                callback(questions.confirm);
            }
            else {
                client.interface.internal.write('\r\nnot a selected number\r\n');
                callback(questions.confirm);
            }
        },
    },
    confirm: {
        text: "1) call these numbers\r\n2) list numbers\r\n3) remove a number\r\n4) add more numbers\r\n",
        responseHandler: (response, readline, client, questions, callback) => {
            switch (response) {
                case "1":
                    readline.close();
                    call_1.default(client, client.numbers);
                    break;
                case "2":
                    // tslint:disable-next-line:max-line-length
                    client.interface.internal.write(`numbers:\r\n${'-'.repeat(10)}\r\n${client.numbers.join('\r\n')}\r\n${'-'.repeat(10)}\r\n`);
                    callback();
                    break;
                case "3":
                    callback(questions.removeNumber);
                    break;
                case "4":
                    callback(questions.addNumber);
                    break;
                default:
                    callback();
            }
        },
    },
    confirmBlacklist: {
        text: "\r\nDo you want to be blacklisted? (j/y/n)\r\n- ",
        responseHandler: (response, readline, client, questions, callback) => {
            response = response.toLowerCase();
            if (response === 'y' || response === 'j') {
                blacklist_1.addToBlacklist(client.numbers[0]);
                client.interface.internal.write('\r\nyou are now blacklisted\r\n');
                close(readline, client);
            }
            else if (response === 'n') {
                blacklist_1.removeFromBlacklist(client.numbers[0]);
                client.interface.internal.write('\r\nyou are now not blacklisted\r\n');
                close(readline, client);
            }
            else {
                callback();
            }
        },
    },
};
exports.default = uiConfig;
