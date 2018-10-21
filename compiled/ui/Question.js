"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("../util/logging");
class Question {
    constructor(text, responseHandler) {
        this.text = text;
        this.responseHandler = responseHandler;
    }
    ask(readline, client, questions) {
        logging_1.logger.log(logging_1.inspect `asking Question: ${Object.entries(questions)
            .find(x => x[1].responseHandler === this.responseHandler && x[1].text === this.text)[0]}`);
        readline.question(this.text, (response) => {
            this.responseHandler(response, readline, client, questions, (next) => {
                if (next instanceof Question) {
                    next.ask(readline, client, questions);
                }
                else if (typeof next === "function") {
                    next(readline, questions);
                }
                else {
                    this.ask(readline, client, questions);
                }
            });
        });
    }
}
exports.default = Question;
