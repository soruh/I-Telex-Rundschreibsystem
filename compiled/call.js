"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("./util/logging");
const callGroup_1 = require("./callGroup");
const CallEndDetector_1 = require("./CallEndDetector");
const confirm_1 = require("./confirm");
const fs_1 = require("fs");
const path_1 = require("path");
const zlib_1 = require("zlib");
const config_1 = require("./config");
const texts_1 = require("./texts");
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
async function call(language, caller, numbers) {
    let confimedCaller = false;
    let resolveCallerConfirmation = () => { };
    caller.interface.internal.write('\r\n');
    caller.interface.internal.write(texts_1.getText(language, 'calling', [
        numbers.length,
        numbers.length === 1 ?
            texts_1.getText(language, 'peer') :
            texts_1.getText(language, 'peers'),
    ]) + '\r\n');
    const status = callGroup_1.default(numbers, async (error, connections) => {
        if (error) {
            logging_1.logger.log('error', error);
            throw error;
        }
        logging_1.logger.log('waiting for caller confirmation');
        await new Promise((resolve, reject) => {
            if (confimedCaller) {
                logging_1.logger.log('already confirmed caller');
                resolve();
            }
            else {
                logging_1.logger.log('readied confirmation resolve');
                resolveCallerConfirmation = resolve;
            }
        });
        logging_1.logger.log('recieved caller confirmation');
        if (connections.length === 0) {
            caller.interface.internal.write(texts_1.getText(language, 'none reachable') + '\r\n');
            caller.interface.once('end', () => caller.socket.end());
            caller.interface.end(); // end the interface
            return;
        }
        function handleAbort() {
            for (let connection of connections) {
                connection.socket.end('+++');
            }
        }
        const logFile = createLogStream();
        logFile.write(JSON.stringify({
            caller: caller.identifier,
            // timestamp: new Date(),
            called: connections.map(x => [x.number, x.identifier, x.name]),
        }) + '\n');
        caller.interface.internal.pipe(logFile);
        caller.interface.once('end', handleAbort);
        caller.interface.internal.write(texts_1.getText(language, 'now connected', [
            connections.length,
            connections.length === 1 ?
                texts_1.getText(language, 'peer') :
                texts_1.getText(language, 'peers'),
        ]) + '\r\n');
        for (let connection of connections) {
            connection.socket.on('end', () => {
                logging_1.logger.log('called end');
            });
            connection.socket.on('close', () => {
                logging_1.logger.log('called close');
            });
            connection.interface.internal.write('\r\n');
            connection.interface.internal.write(config_1.IDENTIFIER);
            connection.interface.internal.write('\r\nRundsenden');
            if (caller.identifier)
                connection.interface.internal.write(' von ' + caller.identifier.replace(/[\r\n]/g, ''));
            connection.interface.internal.write('\r\n');
            caller.interface.internal.pipe(connection.interface.internal);
        }
        const detector = new CallEndDetector_1.default();
        caller.interface.internal.pipe(detector);
        detector.emitter.on('end', async () => {
            caller.interface.internal.unpipe(detector);
            for (let connection of connections) {
                caller.interface.internal.pipe(connection.interface.internal, { end: false });
            }
            caller.interface.internal.write('\r\n\n' + texts_1.getText(language, 'transmission over', [
                connections.length,
                connections.length === 1 ?
                    texts_1.getText(language, 'peer') :
                    texts_1.getText(language, 'peers'),
            ]) + '\r\n');
            logging_1.logger.log("message ended");
            // logger.log(connections);
            logFile.end();
            let promises = [];
            for (let index in connections) {
                let connection = connections[index];
                caller.interface.internal.unpipe(connection.interface.internal);
                // connection.interface.internal.resume();
                promises.push(new Promise((resolve, reject) => {
                    logging_1.logger.log(logging_1.inspect `confirming: ${connection.number} (${connection.name})`);
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
                    async function confirmClient() {
                        function close() {
                            try {
                                connection.interface.internal.write('\r\n' + config_1.IDENTIFIER + '\r\n\n');
                            }
                            catch (err) { /**/ }
                            connection.interface.once('end', () => { connection.socket.end(); });
                            connection.interface.end();
                            resolve();
                        }
                        try {
                            let result = await confirm_1.default(connection.interface.internal, +index);
                            let changed = connection.identifier !== result;
                            caller.interface.internal.write(`${connection.number}: (${changed ? 'x' : '='}) ${result.replace(/[\r\n]/g, '')}\r\n`);
                            close();
                        }
                        catch (err) {
                            logging_1.logger.log(logging_1.inspect `error: ${err}`);
                            caller.interface.internal.write(`${connection.number}: ${err}\r\n`);
                            close();
                        }
                    }
                }));
            }
            await Promise.all(promises);
            logging_1.logger.log("confirmed all peers");
            caller.interface.internal.write(texts_1.getText(language, "confirmation finished") + '\r\n\r\n');
            caller.interface.removeListener('end', handleAbort); // don't handle aborts if not aborted
            caller.interface.once('end', () => caller.socket.end());
            caller.interface.end(); // end the interface
        });
    });
    function printRes(number, res) {
        caller.interface.internal.write(`${number}: ${res.identifier.replace(/[\r\n]/g, '')}\r\n`);
    }
    function printErr(number, err) {
        caller.interface.internal.write(`${number}: ${err}\r\n`);
    }
    let statusBuffer = [];
    status.on('success', (number, res) => {
        if (confimedCaller) {
            printRes(number, res);
        }
        else {
            statusBuffer.push([true, number, res]);
        }
    });
    status.on('fail', (number, err) => {
        if (confimedCaller) {
            printErr(number, err);
        }
        else {
            statusBuffer.push([false, number, err]);
        }
    });
    logging_1.logger.log('confirming caller');
    try {
        caller.interface.internal.resume();
        caller.identifier = await confirm_1.default(caller.interface.internal);
    }
    catch (err) {
        logging_1.logger.log(logging_1.inspect `confimation failed: ${err}`);
    }
    while (statusBuffer.length > 0) {
        try {
            let [success, number, res] = statusBuffer.shift();
            if (success) {
                printRes(number, res);
            }
            else {
                printErr(number, res);
            }
        }
        catch (err) { /**/ }
    }
    caller.interface.internal.write('\r\n');
    confimedCaller = true;
    resolveCallerConfirmation();
}
exports.default = call;
