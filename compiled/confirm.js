"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("./util/logging");
function confirm(socket, output, timeout) {
    return new Promise((resolve, reject) => {
        socket.write('@');
        function end(Resolve) {
            logging_1.logger.log('called "end"');
            socket.removeAllListeners('close');
            socket.unpipe(output);
            clearInterval(timeoutCheckInterval);
            clearTimeout(timeout);
            if (Resolve) {
                resolve();
            }
            else {
                reject();
            }
        }
        // always resolve after 7,5 secs
        let resolveTimeout;
        socket.pipe(output, { end: false });
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
        // resolve if client didn't send data for 1 sec
        let lastPackage = 0;
        socket.on('data', () => {
            lastPackage = Date.now();
        });
        let timeoutCheckInterval = setInterval(() => {
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
