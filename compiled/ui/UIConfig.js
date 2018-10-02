"use strict";
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
const callGroup_1 = require("../callGroup");
const CallEndDetector_1 = require("./CallEndDetector");
const serialEachPromise_1 = require("../util/serialEachPromise");
const BaudotInterface_1 = require("../interfaces/BaudotInterface/BaudotInterface");
const logging_1 = require("../util/logging");
let uiConfig = {
    start: {
        text: "welcome!\r\n'1' for A1\r\n'2' for A2\r\n'end' to disconnect\r\n",
        responseHandler: (response, readline, client, questions, callback) => {
            if (response === "1") {
                callback(questions.A1);
            }
            else if (response === "2") {
                callback(questions.A2);
            }
            else if (response === "end") {
                client.interface.internal.write("bye!\r\n");
                readline.close();
                client.socket.end();
            }
            else {
                client.interface.internal.write("invalid input!\r\n");
                callback();
            }
        },
    },
    A1: {
        text: "A1!\r\n'start' to go back to the start\r\n'2' for A2\r\n'end' to disconnect\r\n",
        responseHandler: (response, readline, client, questions, callback) => {
            if (response === "2") {
                callback(questions.A2);
            }
            else if (response === "start") {
                callback(questions.start);
            }
            else if (response === "end") {
                client.interface.internal.write("bye!\r\n");
                readline.close();
                client.socket.end();
            }
            else {
                client.interface.internal.write("invalid input!\r\n");
                callback();
            }
        },
    },
    A2: {
        text: "A2!\r\n'start' to go back to the start\r\n'1' for A1\r\n'3' for call\r\n'end' to disconnect\r\n",
        responseHandler: (response, readline, client, questions, callback) => {
            if (response === "1") {
                callback(questions.A1);
            }
            else if (response === "3") {
                callback(questions.call);
            }
            else if (response === "start") {
                callback(questions.start);
            }
            else if (response === "end") {
                client.interface.internal.write("bye!\r\n");
                readline.close();
                client.socket.end();
            }
            else {
                client.interface.internal.write("invalid input!\r\n");
                callback();
            }
        },
    },
    call: {
        text: "Welcome!\r\nenter numbers seperated by ','\r\n",
        responseHandler: (response, readline, client, questions, callback) => {
            const internal = client.interface.internal;
            readline.close();
            let output = callGroup_1.default(response.split(","), (connections) => {
                output.unpipe(internal);
                // tslint:disable-next-line:max-line-length
                internal.write(`You are now connected to ${connections.length} peer${connections.length === 1 ? '' : 's'} '+++' to end message\r\n`);
                for (let connection of connections) {
                    internal.pipe(connection.interface.internal);
                }
                let detector = new CallEndDetector_1.default();
                internal.pipe(detector);
                detector.emitter.on('end', () => {
                    internal.unpipe(detector);
                    for (let connection of connections) {
                        internal.pipe(connection.interface.internal);
                    }
                    internal.write(`\r\n\r\nStopped transmitting message\r\n`);
                    serialEachPromise_1.default(connections, (connection, index) => new Promise((resolve, reject) => {
                        internal.write(`confirming: ${connection.name}(${connection.number})\r\n`);
                        if (connection.interface.drained !== false) {
                            logging_1.logger.log('was already drained');
                            connection.interface.internal.pipe(internal);
                            connection.interface.internal.write('@');
                            setTimeout(end, 10000);
                        }
                        else {
                            connection.interface.once('drain', () => {
                                logging_1.logger.log('drained');
                                connection.interface.internal.pipe(internal);
                                connection.interface.internal.write('@');
                                setTimeout(end, 10000);
                            });
                        }
                        function end() {
                            connection.interface.internal.unpipe(internal);
                            if (connection.interface instanceof BaudotInterface_1.default) {
                                connection.interface.sendEnd();
                                setTimeout(() => {
                                    connection.interface.end();
                                    connection.socket.end();
                                }, 2000);
                            }
                            else {
                                connection.interface.end();
                                connection.socket.end();
                            }
                            resolve();
                        }
                    }))
                        .then(() => {
                        internal.write('\r\nconfirmed all peers\r\n\r\n');
                        if (client.interface instanceof BaudotInterface_1.default) {
                            client.interface.sendEnd();
                            setTimeout(() => {
                                client.interface.end();
                                client.socket.end();
                            }, 2000);
                        }
                        else {
                            client.interface.end();
                            client.socket.end();
                        }
                    })
                        .catch(err => logging_1.logger.log(logging_1.inspect `error: ${err}`));
                });
            });
            output.pipe(internal);
        },
    },
};
exports.default = uiConfig;
