"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("./util/logging");
function confirm(socket, index) {
    return new Promise((resolve, reject) => {
        let timeout = setTimeout(() => {
            end(false, "df");
        }, 10000);
        logging_1.logger.log(logging_1.inspect `confirming client ${index == null ? 'caller' : 'client ' + index}`);
        // let loggingStream = new logStream(inspect`called client ${index}`, socket);
        socket.write('@');
        function end(success, message) {
            // loggingStream.end();
            logging_1.logger.log(logging_1.inspect `confirmation for ${index == null ? 'caller' : 'client ' + index} ${success ? 'succeeded' : 'failed'}`);
            socket.removeAllListeners('close');
            socket.removeAllListeners('data');
            try {
                socket.write('\r\n');
            }
            catch (err) { /**/ }
            clearInterval(timeoutCheckInterval);
            clearTimeout(timeout);
            clearTimeout(resolveTimeout);
            if (success) {
                resolve(buffer);
            }
            else {
                reject(message);
            }
        }
        let buffer = '';
        let lastPackage = 0;
        socket.on('data', chunk => {
            // logger.log("recieved data");
            buffer += chunk.toString();
            lastPackage = Date.now();
        });
        let resolveTimeout;
        // always resolve after 7,5 secs
        socket.once('data', () => {
            // logger.log("recieved initial data");
            clearTimeout(timeout);
            resolveTimeout = setTimeout(() => {
                end(true);
            }, 7500);
        });
        socket.once('close', () => {
            // logger.log("socket closed");
            end(false, 'sbk');
        });
        let timeoutCheckInterval = setInterval(() => {
            // logger.log("checking timeout");
            // logger.log("last package: "+lastPackage+" ("+(Date.now()-lastPackage)+"ms ago)");
            // resolve if client didn't send data for 1 sec
            if (!resolveTimeout) {
                // logger.log("!resolveTimeout");
                return;
            }
            if (resolveTimeout._destroyed) {
                // logger.log("resolveTimeout is destroyed");
                clearInterval(timeoutCheckInterval);
                return;
            }
            if (lastPackage !== 0 && Date.now() - lastPackage > 1000) {
                // logger.log("more than 1000 ago");
                end(true);
            }
        }, 500);
    });
}
exports.default = confirm;
