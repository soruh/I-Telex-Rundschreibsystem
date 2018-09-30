"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Question {
    constructor(text, responseHandler) {
        this.text = text;
        this.responseHandler = responseHandler;
    }
    ask(readline, questions) {
        readline.question(this.text, (response) => {
            this.responseHandler(response, readline, questions, (next) => {
                if (next instanceof Question) {
                    next.ask(readline, questions);
                }
                else if (typeof next === "function") {
                    next(readline, questions);
                }
                else {
                    this.ask(readline, questions);
                }
            });
        });
    }
}
exports.default = Question;
