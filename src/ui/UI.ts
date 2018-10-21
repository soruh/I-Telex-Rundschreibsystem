import { ReadLine } from "readline";
import Question from "./Question";
import { QuestionList, UIConfig, Client } from "./UITypes";
import { logger, inspect } from "../util/logging";

class UI {
	private questions:QuestionList = {};
	private entrypoint:string;
	constructor(config:UIConfig, entrypoint:string){
		this.entrypoint = entrypoint;

		for(let key in config){
			let configLine = config[key];
			// logger.log(key, configLine);

			let {text, responseHandler} = configLine;

			this.questions[key] = new Question(text, responseHandler);
		}
	}
	public start(readline:ReadLine, client:Client){
		logger.log(inspect`starting ui`);
		this.questions[this.entrypoint].ask(readline, client, this.questions);
	}
}

export default UI;
