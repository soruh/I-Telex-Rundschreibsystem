"use strict";
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
Object.defineProperty(exports, "__esModule", { value: true });
const callGroup_1 = require("../callGroup");
const CallEndDetector_1 = require("./CallEndDetector");
const serialEachPromise_1 = require("../util/serialEachPromise");
const BaudotInterface_1 = require("../interfaces/BaudotInterface/BaudotInterface");
const logging_1 = require("../util/logging");
const confirm_1 = require("../confirm");
const config_1 = require("../config");
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
            internal.write('\r\n');
            readline.close();
            let output = callGroup_1.default(response.split(","), (connections) => {
                connections = connections.filter(x => x);
                output.unpipe(internal);
                // tslint:disable-next-line:max-line-length
                internal.write(`You are now connected to ${connections.length} peer${connections.length === 1 ? '' : 's'}. Type '+++' to end message\r\n`);
                for (let connection of connections) {
                    connection.interface.internal.write('\r\n');
                    internal.pipe(connection.interface.internal);
                }
                let detector = new CallEndDetector_1.default();
                internal.pipe(detector);
                detector.emitter.on('end', () => {
                    internal.unpipe(detector);
                    for (let connection of connections) {
                        internal.pipe(connection.interface.internal);
                    }
                    internal.write(`\r\n\nStopped transmitting message\r\n`);
                    logging_1.logger.log("message ended");
                    // logger.log(connections);
                    serialEachPromise_1.default(connections, (connection, index) => new Promise((resolve, reject) => {
                        logging_1.logger.log(`confirming: ${connection.number} (${connection.name})`);
                        internal.write(`confirming: ${connection.number} (${connection.name})\r\n`);
                        internal.write(`${config_1.DELIMITER}\r\n`);
                        if (connection.interface.drained !== false) {
                            // drained == true or drained == undefined (for Ascii clients)
                            logging_1.logger.log('was already drained');
                            confirmClient();
                        }
                        else {
                            logging_1.logger.log("wasn't already drained");
                            connection.interface.once('drain', () => {
                                logging_1.logger.log('is now drained');
                                confirmClient();
                            });
                        }
                        function confirmClient() {
                            function close() {
                                internal.write(`${config_1.DELIMITER}\r\n\n`);
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
                            let timeout = setTimeout(() => {
                                internal.write('timeout\r\n');
                                close();
                            }, 10000);
                            confirm_1.default(connection.interface.internal, internal, timeout, +index)
                                .then(() => {
                                internal.write('\r\n');
                                close();
                            })
                                .catch(err => {
                                logging_1.logger.log(logging_1.inspect `error: ${err}`);
                                internal.write('error\r\n');
                                close();
                            });
                        }
                    }))
                        .then(() => {
                        logging_1.logger.log("confirmed all peers");
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
                        .catch(err => logging_1.logger.log(logging_1.inspect `confirmation error: ${err}`));
                });
            });
            output.pipe(internal);
        },
    },
};
exports.default = uiConfig;
