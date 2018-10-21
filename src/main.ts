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
	const asciiInterFace = new AsciiInterface(false);
	const baudotInterFace = new BaudotInterface();

	asciiInterFace._external.pause();
	baudotInterFace._external.pause();

	socket.pipe(asciiInterFace.external);
	asciiInterFace.external.pipe(socket);

	socket.pipe(baudotInterFace.external);
	baudotInterFace.external.pipe(socket);


	let interFace;
	socket.once('data', data=>{
		if([0,1,2,3,4,6,7,8,9].indexOf(data[0]) === -1){
			interFace = asciiInterFace;
			asciiInterFace._external.resume();

			baudotInterFace.internal.unpipe();
			baudotInterFace.external.unpipe();
			baudotInterFace.end();
		}else{
			interFace = baudotInterFace;
			baudotInterFace._external.resume();
			
			asciiInterFace.internal.unpipe();
			asciiInterFace.external.unpipe();
			asciiInterFace.end();
		}

		logger.log(inspect`${interFace instanceof BaudotInterface?'baudot':'ascii'} client calling`);

		interFace.on('end',()=>{
			socket.end();
		});
	
		socket.on('error',err=>{
			logger.log('error', err);
			socket.end();
		});
	
		// interFace.on('timeout', (ext:number)=>{
			
		// });
	
		
		let logStreamIn = new logStream(inspect`calling client \x1b[033m in\x1b[0m`, interFace.internal);
		let logStreamOut = new logStream(inspect`calling client \x1b[034mout\x1b[0m`, interFace._internal);
		

		socket.on('close', ()=>{
			logStreamIn.end();
			logStreamOut.end();
			logger.log(inspect`calling client disconnected`);
		});

	
		const rl = readline.createInterface({
			input:interFace.internal,
			output:interFace.internal,
		});
	
	
		const ui = new UI(uiConfig, "start");
		const client:Client = {
			interface:interFace,
			socket,
			numbers:[],
		};
	
		// ui.start(rl, client); // for ascii interface
	
		if(interFace instanceof BaudotInterface){
			interFace.on('call', ext=>{ // for baudot interface
				ui.start(rl, client);
				logger.log(inspect`baudot client calling extension: ${ext}`);
			});
		}else{
			ui.start(rl, client);
			logger.log(inspect`ascii client calling`);
		}
	});
});
server.listen(4000);



