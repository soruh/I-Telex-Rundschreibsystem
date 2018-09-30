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
if (module.parent != null) {
    let mod = module;
    let loadOrder = [mod.filename.split("/").slice(-1)[0]];
    while (mod.parent) {
        mod = mod.parent;
        loadOrder.push(mod.filename.split("/").slice(-1)[0]);
    }
    loadOrder = loadOrder.map((name, index) => { let color = "\x1b[33m"; if (index == 0)
        color = "\x1b[32m"; if (index == loadOrder.length - 1)
        color = "\x1b[36m"; return (`${color}${name}\x1b[0m`); }).reverse();
    console.log(loadOrder.join(" → "));
}
const logging_1 = require("./logging");
function serialEachPromise(iterable, promiseFunction) {
    return __awaiter(this, void 0, void 0, function* () {
        let results = [];
        for (let key in iterable) {
            try {
                results.push(yield promiseFunction(iterable[key], key));
            }
            catch (e) {
                if (e)
                    logging_1.logger.log('error: ' + logging_1.inspect `${e}`);
            }
        }
        return results;
    });
}
exports.default = serialEachPromise;
