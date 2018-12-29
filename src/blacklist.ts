import { join } from "path";
import { readFileSync, writeFileSync, writeFile } from "fs";
import { logger, inspect } from "./util/logging";
import { peerQuery } from "./util/ITelexServerCom";
import { PackageData_decoded_5 } from "./util/ITelexServerComTypes";
import BaudotInterface from "./interfaces/BaudotInterface/BaudotInterface";
import AsciiInterface from "./interfaces/AsciiInterface/AsciiInterface";
import { createInterface } from "readline";
import { Socket } from "net";
import Interface from "./interfaces/Interface";




const blackListPath = join(__dirname,'../blacklist.json');

let blackListLocked = false;

function getBlacklist():number[]{
	try{
		let file = readFileSync(blackListPath).toString();
		let list = JSON.parse(file);
		if(list instanceof Array) {
			if(list.find(x=>typeof x !== "number")){
				throw new Error('the blacklist must only contain numbers');
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

function changeBlacklist(callback:(blacklist:number[])=>number[]){
	if(blackListLocked){
		setTimeout(changeBlacklist, 100, callback); // wait .1 seconds before trying again.
		return;
	}
	
	blackListLocked=true;

	writeFile(blackListPath, JSON.stringify(callback(getBlacklist())), ()=>{
		blackListLocked=false;
	});
}

function addToBlacklist(number:number){
	changeBlacklist(blacklist=>{
		if(blacklist.indexOf(number) === -1){
			blacklist.push(number);
		}

		return blacklist;
	});
}


function removeFromBlacklist(number:number){
	changeBlacklist(blacklist=>{
		let index = blacklist.indexOf(number);
		if(index > -1){
			blacklist.splice(index, 1);
		}
		
		return blacklist;
	});
}

async function updateBlacklistForNumber(number:number){
	let peer:PackageData_decoded_5;
	try{
		peer = await peerQuery(number);
	}catch(err){
		logger.log(`Error in peerQuery:\r\n${err}`);
		throw(new Error('failed retrieve number from server.'));
	}

	if(!peer){
		logger.log(`Peer not found.`);
		throw new Error('Peer not found.');
	}

	setTimeout(()=>{
		logger.log(inspect`calling ${number} to confirm their blacklisting`);
		let interFace:Interface;
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

		const rl = createInterface({
			input:interFace.internal,
			output:interFace.internal,
		});
	
		let socket = new Socket();

		socket.pipe(interFace.external);
		interFace.external.pipe(socket);
	

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


		function confirmBlacklisting(){
			rl.question(`do you (${number}) want to be blacklisted?\r\n (j/y/n) `, answer=>{
				switch(answer.toLowerCase()){
					case 'y':
					case 'j':
						addToBlacklist(number);
						interFace.internal.write("You are now blacklisted.\r\n");
						break;
					case 'n':
						removeFromBlacklist(number);
						interFace.internal.write("You are now not blacklisted.\r\n");
						break;
					default:
						interFace.internal.write("Invalid input.\r\n");
						confirmBlacklisting();
				}
			});
		}

		socket.connect({host:peer.ipaddress||peer.hostname, port:+peer.port}, ()=>{
			interFace.internal.write("Rundschreibsystem:\r\n");

			confirmBlacklisting();
		});


		setTimeout(()=>{ // close connection after 5 minutes

			interFace.end(); // end the interface
			setTimeout(()=>{
				socket.destroy(); // remove the tcp socket 1 second later, to give it time to flush
				// TODO: do this on('flush')?
			}, 1000);

		}, 5*60*1000);
	}, 60*1000);
}

function isBlacklisted(number:number):boolean{
	return getBlacklist().indexOf(number) > -1;
}
export {
	isBlacklisted,
	addToBlacklist,
	removeFromBlacklist,
	updateBlacklistForNumber,
};

