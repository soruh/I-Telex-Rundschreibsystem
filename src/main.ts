// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
if(module.parent!=null){let mod=module;let loadOrder=[mod.filename.split("/").slice(-1)[0]];while(mod.parent){mod=mod.parent;loadOrder.push(mod.filename.split("/").slice(-1)[0]);}loadOrder=loadOrder.map((name,index)=>{let color="\x1b[33m";if(index==0)color="\x1b[32m";if(index==loadOrder.length-1)color="\x1b[36m";return(`${color}${name}\x1b[0m`);}).reverse();console.log(loadOrder.join(" → "));}

import * as readline from "readline";
import * as net from "net";
import UI from "./ui/UI";
import uiConfig from "./ui/UIConfig";
import { logger, inspect } from "./util/logging";
import { Client } from "./ui/UITypes";
import AsciiInterface from "./interfaces/AsciiInterface/AsciiInterface";
import BaudotInterface from "./interfaces/BaudotInterface/BaudotInterface";

declare global {
	interface Buffer {
		readNullTermString: (string?, start?, end?) => string;
	}
}
Buffer.prototype.readNullTermString = 
function readNullTermString(encoding: string = "utf8", start: number = 0, end: number = this.length):string {
	let firstZero = this.indexOf(0, start);
	let stop = firstZero >= start && firstZero <= end ? firstZero : end;
	return this.toString(encoding, start, stop);
};


const server = new net.Server();
server.on('connection', socket=>{
	// const interFace = new AsciiInterface(false);
	const interFace = new BaudotInterface();

	socket.pipe(interFace.external);
	interFace.external.pipe(socket);

	interFace.on('end',()=>{
		socket.end();
	});

	// interFace.on('timeout', (ext:number)=>{
		
	// });

	const rl = readline.createInterface({
		input:interFace.internal,
		output:interFace.internal,
	});


	const ui = new UI(uiConfig, "call");
	const client:Client = {
		interface:interFace,
		socket,
	};

	// ui.start(rl, client); // for ascii interface

	interFace.on('call',(ext)=>{ // for baudot interface
		ui.start(rl, client);
		logger.log(inspect`calling extension: ${ext}`);
	});
});
server.listen(4000);



