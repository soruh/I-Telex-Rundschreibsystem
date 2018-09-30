"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Question_1 = require("./Question");
class UI {
    constructor(config, entrypoint) {
        this.questions = {};
        this.entrypoint = entrypoint;
        for (let key in config) {
            let configLine = config[key];
            // logger.log(key, configLine);
            let { text, responseHandler } = configLine;
            this.questions[key] = new Question_1.default(text, responseHandler);
        }
    }
    start(readline, client) {
        this.questions[this.entrypoint].ask(readline, client, this.questions);
    }
}
exports.default = UI;
