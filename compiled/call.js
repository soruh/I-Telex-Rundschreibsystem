"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("./util/logging");
const callGroup_1 = require("./callGroup");
const CallEndDetector_1 = require("./CallEndDetector");
const BaudotInterface_1 = require("./interfaces/BaudotInterface/BaudotInterface");
const serialEachPromise_1 = require("./util/serialEachPromise");
const confirm_1 = require("./confirm");
const config_1 = require("./config");
function call(caller, numbers) {
    caller.interface.internal.write('\r\n');
    let output = callGroup_1.default(numbers, (error, connections) => {
        connections = connections.filter(x => x);
        output.unpipe(caller.interface.internal);
        // tslint:disable-next-line:max-line-length
        caller.interface.internal.write(`You are now connected to ${connections.length} peer${connections.length === 1 ? '' : 's'}. Type '+++' to end message\r\n`);
        for (let connection of connections) {
            connection.interface.internal.write('\r\n');
            caller.interface.internal.pipe(connection.interface.internal);
        }
        let detector = new CallEndDetector_1.default();
        caller.interface.internal.pipe(detector);
        detector.emitter.on('end', () => {
            caller.interface.internal.unpipe(detector);
            for (let connection of connections) {
                caller.interface.internal.pipe(connection.interface.internal);
            }
            caller.interface.internal.write(`\r\n\nStopped transmitting message\r\n`);
            logging_1.logger.log("message ended");
            // logger.log(connections);
            serialEachPromise_1.default(connections, (connection, index) => new Promise((resolve, reject) => {
                logging_1.logger.log(`confirming: ${connection.number} (${connection.name})`);
                caller.interface.internal.write(`confirming: ${connection.number} (${connection.name})\r\n`);
                caller.interface.internal.write(`${config_1.DELIMITER}\r\n`);
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
                        caller.interface.internal.write(`${config_1.DELIMITER}\r\n\n`);
                        connection.interface.internal.unpipe(caller.interface.internal);
                        connection.interface.end();
                        connection.socket.end();
                        resolve();
                    }
                    let timeout = setTimeout(() => {
                        caller.interface.internal.write('timeout\r\n');
                        close();
                    }, 10000);
                    confirm_1.default(connection.interface.internal, timeout, +index)
                        .then(result => {
                        caller.interface.internal.write(result);
                        caller.interface.internal.write('\r\n');
                        close();
                    })
                        .catch(err => {
                        logging_1.logger.log(logging_1.inspect `error: ${err}`);
                        caller.interface.internal.write('error\r\n');
                        close();
                    });
                }
            }))
                .then(() => {
                logging_1.logger.log("confirmed all peers");
                caller.interface.internal.write('\r\nconfirmed all peers\r\n\r\n');
                if (caller.interface instanceof BaudotInterface_1.default) {
                    caller.interface.sendEnd();
                    setTimeout(() => {
                        caller.interface.end();
                        caller.socket.end();
                    }, 2000);
                }
                else {
                    caller.interface.end();
                    caller.socket.end();
                }
            })
                .catch(err => logging_1.logger.log(logging_1.inspect `confirmation error: ${err}`));
        });
    });
    output.pipe(caller.interface.internal);
}
exports.default = call;