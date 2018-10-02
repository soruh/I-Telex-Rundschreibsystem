import { ReadLine } from "readline";
import { Next, responseHandlerFunction, QuestionList, Client } from "./UITypes";

class Question {
	public id:symbol;
	public text:string;
	public responseHandler:responseHandlerFunction;
	constructor(text:string, responseHandler:responseHandlerFunction){
		this.text = text;
		this.responseHandler = responseHandler;
	}
	public ask(readline:ReadLine, client:Client, questions:QuestionList){
		readline.question(this.text, (response:string)=>{
			this.responseHandler(response, readline, client, questions, (next?:Next)=>{
				if(next instanceof Question){
					next.ask(readline, client, questions);
				}else if(typeof next === "function"){
					next(readline, questions);
				}else{
					this.ask(readline, client, questions);
				}
			});
		});
	}
}

export default Question;
