"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
const logging_1 = require("./logging");
async function serialEachPromise(iterable, promiseFunction) {
    let results = [];
    for (let key in iterable) {
        try {
            // tslint:disable-next-line:max-line-length
            // logger.log(inspect`starting promiseFunction ${promiseFunction.name?promiseFunction.name+" ":""}called with key: ${key} value: ${iterable[key]} `);
            results.push(await promiseFunction(iterable[key], key));
            // tslint:disable-next-line:max-line-length
            // logger.log(inspect`finished promiseFunction ${promiseFunction.name?promiseFunction.name+" ":""}called with key: ${key} value: ${iterable[key]} returned: ${results[results.length]}`);
        }
        catch (e) {
            // tslint:disable-next-line:max-line-length
            logging_1.logger.log(logging_1.inspect `error in promiseFunction ${promiseFunction.name ? promiseFunction.name + " " : ""} called with key: ${key} value: ${iterable[key]}`);
            logging_1.logger.log(logging_1.inspect `Error: ${e}`);
        }
    }
    return results;
}
exports.default = serialEachPromise;
