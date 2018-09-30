"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Question {
    constructor(text, responseHandler) {
        this.text = text;
        this.responseHandler = responseHandler;
    }
    ask(readline, client, questions) {
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
