// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals


import * as readline from "readline";
import * as net from "net";
import UI from "./ui/UI";
import uiConfig from "./ui/UIConfig";
import { logger, inspect, logStream } from "./util/logging";
import { Client } from "./ui/UITypes";
import AsciiInterface from "./interfaces/AsciiInterface/AsciiInterface";
import BaudotInterface from "./interfaces/BaudotInterface/BaudotInterface";

declare global {
	interface Buffer {
		readNullTermString: (encoding?, start?, end?) => string;
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

	socket.on('error',err=>{
		logger.log('error', err);
		socket.end();
	});

	// interFace.on('timeout', (ext:number)=>{
		
	// });

	// tslint:disable-next-line:no-unused-expression
	new logStream('calling client', interFace.internal);

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



