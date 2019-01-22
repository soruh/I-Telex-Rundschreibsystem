import { ReadLine } from "readline";
import { isBlacklisted, updateBlacklistForNumber } from "./blacklist";
import { Peer_search } from "./util/ITelexServerCom";
import { logger, inspect } from "./util/logging";
import { Writable } from "stream";
import { getText, isLanguage, getValidLanguages } from "./texts";
import getInfo from "./info";
import { PackageData_decoded_5 } from "./util/ITelexServerComTypes";

type language = "german"|"english";

interface commandResult{
	end?:boolean;
	response?:string;
	newMode?:string;
	nextAction?:string;
	newLanguage?:language;
}


interface Command {
	help: boolean;
	needsNumber: boolean;
	action: (language:language, number:number, callList:number[], answer?:string)=>commandResult|Promise<commandResult>;
}

interface CommandList{
	[index:string]: Command;
}

const commands_main:CommandList = {
	'h': {
		help: false,
		needsNumber: null,
		action: language=>{
			return {
				response: printHelp(language, 'main'),
			};
		},
	},
	'+': {
		help: true,
		needsNumber:true,
		action: (language, number, callList)=>{
			if(callList.indexOf(number) === -1){
				callList.push(number);
			}
			return {
			};
		},
	},
	'-': {
		help: true,
		needsNumber:true,
		action: (language, number, callList)=>{
			const index = callList.indexOf(number);

			if(index > -1){
				callList.splice(index, 1);
			}

			return {
			};
		},
	},
	'?': {
		help: true,
		needsNumber: null,
		action: (language, number, callList)=>{
			return {
				response: printCallList(callList),
			};
		},
	},
	'b': {
		help: true,
		needsNumber: null,
		action: ()=>{
			return {
				newMode: 'blacklist',
			};
		},
	},
	'=': {
		help: true,
		needsNumber: null,
		action: (language, number, callList)=>{
			return {
				end: true,
				nextAction:'call',
			};
		},
	},
	's': {
		help: true,
		needsNumber: false,
		action: async (language, number, callList, answer)=>{
			let entries:PackageData_decoded_5[] = [];
			try{
				entries = await Peer_search(answer);
			}catch(err){/**/}

			const maxLength = Math.max(...entries.map(x=>x.number.toString().length));

			const newEntries = entries.filter(x=>!~callList.indexOf(x.number));
			if(newEntries.length){
				var response = newEntries.map(x=>`${x.number.toString().padStart(maxLength)}: ${x.name}`).join('\r\n');
			}else{
				var response = getText(language, 'no new entries');
			}
			return {
				response,
			};
		},
	},
	'i': {
		help: true,
		needsNumber: null,
		action: language=>{
			return {
				response: getInfo(language),
			};
		},
	},
	'q': {
		help: true,
		needsNumber: null,
		action: ()=>{
			return {
				end: true,
				nextAction:'end',
			};
		},
	},
	'l': {
		help: true,
		needsNumber: false,
		action: (language, number, callList, answer)=>{
			if(isLanguage(answer)){
				return {
					newLanguage: answer as language,
					response: getText(answer as language, 'introduction'),
				};
			}else{
				return {
					response: 
						getText(language, 'not a language', [answer])+
						'\r\n'+
						getText(language, 'valid languages')+
						': '+
						getValidLanguages().join(', '),
				};
			}
		},
	},
};

const commands_blacklist:CommandList = {
	'h': {
		help: false,
		needsNumber: null,
		action: (language)=>{
			return {
				response: printHelp(language, 'blacklist'),
			};
		},
	},
	'.': {
		help: true,
		needsNumber:true,
		action: async (language, number)=>{
			if(!number){
				throw new Error('not a Number');
			}
			await updateBlacklistForNumber(number);
			return {
				end: true,
				nextAction:'end',
				response: `${number} ${getText(language, 'blacklist anounce call')}`,
			};
		},
	},
	'?': {
		help: true,
		needsNumber:true,
		action: (language, number)=>{
			return {
				response: getText(language, 'blacklisted', [
					number,
					isBlacklisted(number)?
					'':
					getText(language, 'not'),
				]),
			};
		},
	},
	'b': {
		help: true,
		needsNumber: null,
		action: ()=>{
			return {
				newMode: 'main',
			};
		},
	},
};


let commands:{[index:string]: CommandList} = {};
commands.main = commands_main;
commands.blacklist = commands_blacklist;


function printCallList(callList:number[]){
	let lines = [''];
	let index = 0;
	for (const i in callList) {
		const number = callList[i];

		if(lines[index].length+2+number.toString().length > 60){
			lines[++index] = '';
		}

		lines[index] += number.toString();
		if (+i !== callList.length-1) lines[index] += ', ';
	}
	return lines.join('\r\n');
}

function printHelp(language:language, mode:string){
	const commandsForMode = commands[mode];
	if(!commandsForMode) throw new Error("invalid mode");

	let helpString = `${getText(language, 'help')}: ${mode}\r\n\n`;
	helpString += getText(language, "help explaination")+'\r\n';
	for(const key in commandsForMode){
		const command = commandsForMode[key];
		if(command.help){
			const argType = command.needsNumber===null?' ':(command.needsNumber?'n':'t');

			helpString += `${key} (${argType}): ${getText(language, `help_${mode[0]}_${key}`)}\r\n`;
		}
	}

	return helpString;
}

async function handleCommand(input:string, mode:string, callList:number[], language:language):Promise<commandResult>{
	if(input === '') return {};
	if(input[input.length-1] === '-') return {};

	const identifier = input[0];
	const answer = input.slice(1);

	let number =  parseInt(answer);
	if(isNaN(number)) number = null;

	const commandsForMode = commands[mode];
	if(!commandsForMode) throw new Error('invalid mode');

	if(commandsForMode.hasOwnProperty(identifier)){
		try{
			if(commandsForMode[identifier].needsNumber === true&&!number){
				throw new Error(getText(language, 'no number'));
			}else if(commandsForMode[identifier].needsNumber === false&&!answer){
				throw new Error(getText(language, 'no argument'));
			}

			return await commandsForMode[identifier].action(language, number, callList, answer);
		}catch(err){
			return {
				response: err.message||err||getText(language, 'unknown error'),
			};
		}
	}else{
		return {
			response: getText(language, 'invalid command'),
		};
	}
}

function ui(readline:ReadLine&{output: Writable}):Promise<{
	nextAction: string,
	callList: number[],
	language: language,
}>{
	return new Promise((resolve, reject) => {
		let mode = 'main';
		let callList = [];
		let language:language = "german";

		readline.output.write(getText(language, 'introduction')+'\r\n');
			

		function promptCommand(){
			readline.question('- ', async answer=>{
				readline.output.write('\r');

				const result = await handleCommand(answer, mode, callList, language);

				if(result.newLanguage){
					language = result.newLanguage;
					readline.output.write(getText(language, 'changed language', [language])+'\r\n');
				}

				if(result.response) readline.output.write(result.response+'\r\n');
				
				if(result.newMode){
					mode = result.newMode;
					readline.output.write(`${getText(language, "modeChange")}: ${mode}\r\n`);
				}

				if(result.end){
					readline.close();
					resolve({
						nextAction: result.nextAction,
						callList,
						language,
					});
				}else{
					promptCommand();
				}
			});
		}


		promptCommand();
	});
}

export default ui;
