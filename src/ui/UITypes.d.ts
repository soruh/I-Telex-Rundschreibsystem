import Question from "./Question";
import { ReadLine } from "readline";


type Next = Question|((readline:ReadLine, questions:QuestionList)=>void);
interface QuestionList {
	[indexe:string]: Question;
}
type responseHandlerFunction =
(response:string, readline:ReadLine, questions:QuestionList, callback:(next?:Next)=>void)=>void;

interface UIQuestion {
	text:string;
	responseHandler:responseHandlerFunction;
}

interface UIConfig {
	[index:string]: UIQuestion;
}

export {
    Next,
    responseHandlerFunction,
    UIQuestion,
	UIConfig,
	QuestionList
};