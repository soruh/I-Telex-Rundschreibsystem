"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https = require("https");
const logging_1 = require("./logging");
const servercert = require('fs').readFileSync(require('path').join(__dirname, '../..', 'servercert.pem'));
function APIcall(method, host, port, path, data = {}) {
    return new Promise((resolve, reject) => {
        logging_1.logger.log('admin', `making ${method} request to ${host}:${port}${path[0] === '/' ? '' : '/'}${path}`);
        let headers = {};
        let stringifiedData;
        if (data) {
            try {
                stringifiedData = JSON.stringify({ data });
            }
            catch (err) {
                reject(err);
                return;
            }
            headers = {
                'content-type': 'application/json; charset=utf-8',
                'content-length': Buffer.byteLength(stringifiedData),
            };
        }
        const req = https.request({
            method,
            host,
            port,
            path,
            headers,
            rejectUnauthorized: true,
            ca: [servercert],
            checkServerIdentity: () => undefined,
        }, res => {
            logging_1.logger.log('debug', 'made API request');
            let buffer = "";
            res.on('data', resData => {
                buffer += resData.toString();
            });
            res.once('end', () => {
                logging_1.logger.log('debug', 'API request ended');
                logging_1.logger.log('silly', logging_1.inspect `ApiCall recieved data: ${buffer}`);
                if (res.statusCode !== 200) {
                    logging_1.logger.log('debug', logging_1.inspect `API call failed with error code: ${res.statusCode} (${res.statusMessage})`);
                    try {
                        const { error } = JSON.parse(buffer);
                        if (error)
                            logging_1.logger.log('error', logging_1.inspect `API call failed with error message: ${error}`);
                    }
                    catch (err) {
                        console.error(err);
                        console.log(buffer);
                        /*fail silently*/
                    }
                    reject(logging_1.inspect `${res.statusCode} (${res.statusMessage})`);
                    return;
                }
                try {
                    const parsed = JSON.parse(buffer);
                    if (parsed.success) {
                        resolve(parsed.data);
                    }
                    else {
                        reject(parsed.error);
                    }
                }
                catch (err) {
                    reject(err);
                }
            });
            res.once('error', err => {
                reject(err);
                res.destroy();
            });
        });
        req.on('error', err => {
            logging_1.logger.log('error', logging_1.inspect `${err}`);
            reject(err);
        });
        if (stringifiedData)
            req.write(stringifiedData);
        req.end();
    });
}
exports.default = APIcall;
