

import * as readline from "readline";
import * as net from "net";
import { logger, inspect, logStream } from "./util/logging";
import AsciiInterface from "./interfaces/AsciiInterface/AsciiInterface";
import BaudotInterface from "./interfaces/BaudotInterface/BaudotInterface";
import ui from "./ui";
import Interface from "./interfaces/Interface";
import call from "./call";
import { PORT, IDENTIFIER } from "./config";
import { baudotModeUnknown } from "./util/baudot";
import { Writable, Transform } from "stream";
import { getText } from "./texts";

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


class RemoveCr extends Transform {
	public _transform(chunk: any, encoding: string, callback: (error?: Error, data?: any) => void){
		callback(null, chunk.toString().replace(/\r/g, ''));
	}
}


const server = new net.Server();
server.on('connection', socket=>{
	let interFace:Interface;
	socket.on('error',err=>{
		logger.log('error', err);
		socket.end();
	});
	
	socket.once('data', chunk=>{
		if([0,1,2,3,4,6,7,8,9].indexOf(chunk[0]) === -1){
			interFace = new AsciiInterface(false);
		}else{
			interFace = new BaudotInterface(logger, ["\x1b[35m", "caller", "\x1b[0m"]);
		}

		logger.log(inspect`${interFace instanceof BaudotInterface?'baudot':'ascii'} client calling`);

		interFace.on('end',()=>{
			socket.end();
		});
	
		// interFace.on('timeout', (ext:number)=>{
			
		// });
	
		
		// let logStreamIn = new logStream(inspect`calling client \x1b[033m in\x1b[0m`, interFace.internal);
		// let logStreamOut = new logStream(inspect`calling client \x1b[034mout\x1b[0m`, interFace._internal);
		

		socket.on('close', ()=>{
			(interFace as BaudotInterface).end(true);
			
			// logStreamIn.end();
			// logStreamOut.end();
			logger.log(inspect`calling client disconnected`);
		});

	

		async function handleClient(){
			interFace.internal.write('\r\n\n');
			interFace.internal.write(getText('german', 'welcome', [IDENTIFIER])+'\r\n\n');

			interFace.internal.resume();

			if(interFace instanceof BaudotInterface){
				if(!interFace.drained){
					// logger.log('waiting for drain');
					await new Promise((resolve, reject) => {
						interFace.on('drain', resolve);
					});
					// logger.log('drained');

					interFace.asciifier.setMode(baudotModeUnknown);
					interFace.baudotifier.setMode(baudotModeUnknown);

				}
				// else{
				// 	logger.log('was already drained');
				// }
			}

			const removedCr = new RemoveCr();
			interFace.internal.pipe(removedCr);

			const rl = readline.createInterface({
				input: removedCr,
				output: interFace.internal,
			});
			
			const result = await ui(rl as readline.ReadLine&{output:Writable});
			
			interFace.internal.unpipe(removedCr);

			switch(result.nextAction){
				case 'call':
					await call(result.language ,{
						interface:interFace,
						socket,
					}, result.callList);

					break;
				case 'end':
				default:
					rl.close();
					
					interFace.once('end', ()=>socket.end());
					interFace.end();
			}

			logger.log(inspect`ui actions finished`);
		}
		
		function connectSocket(relayChunk=true){
			if(relayChunk) interFace.external.write(chunk);
			
			socket.pipe(interFace.external);
			interFace.external.pipe(socket);
		}

		if(interFace instanceof BaudotInterface){
			interFace.on('call', ext=>{ // for baudot interface
				handleClient();
				logger.log(inspect`baudot client calling extension: ${ext}`);
			});

			connectSocket(true);
		}else{
			connectSocket(false);

			handleClient();
			logger.log(inspect`ascii client calling`);
		}
	});
});
server.listen(PORT, ()=>{
	logger.log(inspect`listening on port: ${PORT}`);
});


