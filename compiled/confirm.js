"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("./util/logging");
function confirm(socket, timeout, index) {
    return new Promise((resolve, reject) => {
        logging_1.logger.log(`confirming client ${index}`);
        // let loggingStream = new logStream(inspect`called client ${index}`, socket);
        socket.write('@');
        function end(success) {
            // loggingStream.end();
            logging_1.logger.log(`${success ? 'confirmed' : 'failed to confirm'} client ${index}`);
            socket.removeAllListeners('close');
            socket.removeAllListeners('data');
            clearInterval(timeoutCheckInterval);
            clearTimeout(timeout);
            clearTimeout(resolveTimeout);
            if (success) {
                resolve(buffer);
            }
            else {
                reject();
            }
        }
        let buffer = '';
        let lastPackage = 0;
        socket.on('data', chunk => {
            buffer += chunk.toString();
            lastPackage = Date.now();
        });
        let resolveTimeout;
        // always resolve after 7,5 secs
        socket.once('data', () => {
            clearTimeout(timeout);
            resolveTimeout = setTimeout(() => {
                end(true);
            }, 7500);
        });
        socket.once('close', () => {
            logging_1.logger.log('closed');
            end(false);
        });
        let timeoutCheckInterval = setInterval(() => {
            // resolve if client didn't send data for 1 sec
            if (!resolveTimeout) {
                return;
            }
            if (resolveTimeout._destroyed) {
                clearInterval(timeoutCheckInterval);
                return;
            }
            if (lastPackage !== 0 && Date.now() - lastPackage > 1000) {
                end(true);
            }
        }, 100);
    });
}
exports.default = confirm;
