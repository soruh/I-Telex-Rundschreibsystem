"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("./util/logging");
const callGroup_1 = require("./callGroup");
const CallEndDetector_1 = require("./CallEndDetector");
const confirm_1 = require("./confirm");
const fs_1 = require("fs");
const path_1 = require("path");
const zlib_1 = require("zlib");
function createLogStream(failed = false) {
    try {
        var logFileName = new Date().toISOString() + '.gz';
        var path = path_1.join(__dirname, '..', 'logs', logFileName);
        const fd = fs_1.openSync(path, 'w');
        const writeStream = fs_1.createWriteStream(null, { fd });
        logging_1.logger.log(logging_1.inspect `opened log file ${logFileName}`);
        writeStream.on('close', () => {
            logging_1.logger.log(logging_1.inspect `closed log file ${logFileName}`);
        });
        var logFile = zlib_1.createGzip();
        logFile.pipe(writeStream);
        return logFile;
    }
    catch (err) {
        logging_1.logger.log(logging_1.inspect `failed to create log file ${logFileName}`);
        if (err.code === 'ENOENT') {
            if (!failed) {
                fs_1.mkdirSync(path_1.dirname(path), { recursive: true });
                logging_1.logger.log(logging_1.inspect `created directory ${path_1.dirname(path)}`);
                return createLogStream(true);
            }
            else {
                throw err;
            }
        }
        else {
            throw err;
        }
    }
}
function call(caller, numbers) {
    caller.interface.internal.write('\r\n');
    caller.interface.internal.write(`calling ${numbers.length} number${numbers.length === 1 ? '' : 's'}:\r\n`);
    const status = callGroup_1.default(numbers, (error, connections) => {
        if (error) {
            logging_1.logger.log('error', error);
            throw error;
        }
        if (connections.length === 0) {
            caller.interface.internal.write('No peers could be reached.\r\n');
            caller.interface.once('end', () => caller.socket.destroy());
            caller.interface.end(); // end the interface
            return;
        }
        function handleAbort() {
            for (let connection of connections) {
                connection.socket.end('+++');
            }
        }
        const logFile = createLogStream();
        logFile.write(JSON.stringify(connections.map(x => [x.number, x.identifier])) + '\n');
        caller.interface.internal.pipe(logFile);
        caller.interface.once('end', handleAbort);
        caller.interface.internal.write(`Now connected to ${connections.length} peer${connections.length === 1 ? '' : 's'}. Type '+++' to end message\r\n`);
        for (let connection of connections) {
            connection.interface.internal.write('\r\n');
            caller.interface.internal.pipe(connection.interface.internal);
        }
        const detector = new CallEndDetector_1.default();
        caller.interface.internal.pipe(detector);
        detector.emitter.on('end', async () => {
            caller.interface.internal.unpipe(detector);
            for (let connection of connections) {
                caller.interface.internal.pipe(connection.interface.internal);
            }
            caller.interface.internal.write(`\r\n\ntransmission over. confirming ${connections.length} peer${connections.length === 1 ? '' : 's'}.\r\n`);
            logging_1.logger.log("message ended");
            // logger.log(connections);
            logFile.end();
            let promises = [];
            for (let index in connections) {
                let connection = connections[index];
                promises.push(new Promise((resolve, reject) => {
                    logging_1.logger.log(`confirming: ${connection.number} (${connection.name})`);
                    // caller.interface.internal.write(`confirming: ${connection.number} (${connection.name})\r\n`);
                    // caller.interface.internal.write(`${DELIMITER}\r\n`);
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
                            // caller.interface.internal.write(`${DELIMITER}\r\n\n`);
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
                            let changed = connection.identifier !== result;
                            caller.interface.internal.write(`${connection.number}: (${changed ? 'x' : '='}) ${result.replace(/[\r\n]/g, '')}\r\n`);
                            close();
                        })
                            .catch(err => {
                            logging_1.logger.log(logging_1.inspect `error: ${err}`);
                            caller.interface.internal.write(`${connection.number}: ${err}\r\n`);
                            close();
                        });
                    }
                }));
            }
            await Promise.all(promises);
            logging_1.logger.log("confirmed all peers");
            caller.interface.internal.write('confirmation finished\r\n\r\n');
            caller.interface.removeListener('end', handleAbort); // don't handle aborts if not aborted
            caller.interface.once('end', () => caller.socket.destroy());
            caller.interface.end(); // end the interface
        });
    });
    status.on('success', (number, res) => {
        // caller.interface.internal.write(`${number} succeeeded: ${res.identifier.replace(/[\r\n]/g, '')}\r\n`);
        caller.interface.internal.write(`${number}: ${res.identifier.replace(/[\r\n]/g, '')}\r\n`);
    });
    status.on('fail', (number, err) => {
        // caller.interface.internal.write(`${number} failed: ${err}\r\n`);
        caller.interface.internal.write(`${number}: ${err}\r\n`);
    });
}
exports.default = call;
