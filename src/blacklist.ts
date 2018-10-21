import { join } from "path";
import { readFileSync, writeFileSync, read } from "fs";
import { logger, inspect } from "./util/logging";
import { peerQuery } from "./util/ITelexServerCom";
import { PackageData_decoded_5 } from "./util/ITelexServerComTypes";
import uiConfig from "./ui/UIConfig";
import BaudotInterface from "./interfaces/BaudotInterface/BaudotInterface";
import AsciiInterface from "./interfaces/AsciiInterface/AsciiInterface";
import * as readline from "readline";
import { Socket } from "net";
import { Client } from "./ui/UITypes";
import UI from "./ui/UI";



const blackListPath = join(__dirname,'../blacklist.json');

function blacklist():string[]{
	try{
		let file = readFileSync(blackListPath).toString();
		let list = JSON.parse(file);
		if(list instanceof Array) {
			if(list.find(x=>typeof x !== "string")){
				throw new Error('the blacklist must only contain strings');
			}else{
				return list;
			}
		}else{
			throw new Error('the blacklist must contain an Array');
		}
	}catch(err){
		logger.log(inspect`error reading blacklist: ${err}`);
		return [];
	}
}

function addToBlacklist(number:string){
	let oldBlacklist = blacklist();
	if(oldBlacklist.indexOf(number) === -1){
		oldBlacklist.push(number);
		writeFileSync(blackListPath, JSON.stringify(oldBlacklist));
	}
}

function removeFromBlacklist(number:string){
	let oldBlacklist = blacklist();
	let index = oldBlacklist.indexOf(number);
	if(index > -1){
		oldBlacklist.splice(index, 1);
		writeFileSync(blackListPath, JSON.stringify(oldBlacklist));
	}
}

async function confirmBlacklistToggle(number:string){
	let peer:PackageData_decoded_5;
	try{
		peer = await peerQuery(number);
	}catch(err){
		logger.log(`Error in peerQuery:\r\n${err}`);
	}

	if(!peer){
		return;
	}

	setTimeout(()=>{
		logger.log(inspect`calling ${number} to confirm their blacklisting`);
		let interFace;
		switch(peer.type){
			case 1: 
			case 2: 
			case 5:
				interFace = new BaudotInterface();
				break;
			case 3:
			case 4:
				interFace = new AsciiInterface(false);
				break;
			case 6:
			default:
				return;
		}

		const rl = readline.createInterface({
			input:interFace.internal,
			output:interFace.internal,
		});
	
		let socket = new Socket();

		socket.pipe(interFace.external);
		interFace.external.pipe(socket);
	
	
		const ui = new UI(uiConfig, "confirmBlacklist");
		const client:Client = {
			interface:interFace,
			socket,
			numbers:[number],
		};
		

		socket.on('error', err=>{
			socket.end();
			logger.log(inspect`called client error: ${err}`);
		});

		socket.on('close', ()=>{
			rl.close();
			logger.log(inspect`called client disconnected`);
		});

		socket.setTimeout(60*1000);

		socket.on('timeout', ()=>{
			socket.end();
			logger.log(inspect`called client timed out`);
		});


		socket.connect({host:peer.ipaddress||peer.hostname, port:+peer.port}, ()=>{
			client.interface.internal.write("Rundschreibsystem:\r\n");
			ui.start(rl, client);
		});
	}, 60*1000);
}

// tslint:enable:no-string-throw
function isBlacklisted(number:string):boolean{
	return blacklist().indexOf(number) > -1;
}
export {
	blacklist,
	isBlacklisted,
	confirmBlacklistToggle,
	addToBlacklist,
	removeFromBlacklist,
};

