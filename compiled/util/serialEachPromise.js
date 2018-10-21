"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
const logging_1 = require("./logging");
function serialEachPromise(iterable, promiseFunction) {
    return __awaiter(this, void 0, void 0, function* () {
        let results = [];
        for (let key in iterable) {
            try {
                // tslint:disable-next-line:max-line-length
                // logger.log(inspect`starting promiseFunction ${promiseFunction.name?promiseFunction.name+" ":""}called with key: ${key} value: ${iterable[key]} `);
                results.push(yield promiseFunction(iterable[key], key));
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
    });
}
exports.default = serialEachPromise;
