import { ReadLine } from "readline";
import { Next, responseHandlerFunction, QuestionList } from "./UITypes";

class Question {
	public id:symbol;
	public text:string;
	public responseHandler:responseHandlerFunction;
	constructor(text:string, responseHandler:responseHandlerFunction){
		this.text = text;
		this.responseHandler = responseHandler;
	}
	public ask(readline:ReadLine, questions:QuestionList){
		readline.question(this.text, (response:string)=>{
			this.responseHandler(response, readline, questions, (next?:Next)=>{
				if(next instanceof Question){
					next.ask(readline, questions);
				}else if(typeof next === "function"){
					next(readline, questions);
				}else{
					this.ask(readline, questions);
				}
			});
		});
	}
}

export default Question;
