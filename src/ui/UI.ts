import { ReadLine } from "readline";
import Question from "./Question";
import { logger } from "../util/logging";
import {QuestionList, UIConfig} from "./UITypes";

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
	public start(readline:ReadLine){
		this.questions[this.entrypoint].ask(readline, this.questions);
	}
}

export default UI;
