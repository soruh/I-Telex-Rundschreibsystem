import Question from "./Question";
import { ReadLine } from "readline";
import { Socket } from "net";
import Interface from "../interfaces/Interface";


interface Client {
	socket:Socket;
	interface:Interface;
	numbers: string[]; //called numbers/own number
}

type Next = Question|((readline:ReadLine, questions:QuestionList)=>void);
interface QuestionList {
	[indexe:string]: Question;
}
type responseHandlerFunction =
(response:string, readline:ReadLine, client:Client, questions:QuestionList, callback:(next?:Next)=>void)=>void;

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
	QuestionList,
	Client
};