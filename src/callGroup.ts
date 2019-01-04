"use strict";
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals


import { Socket } from "net";
import * as util from "util";
import { peerQuery } from "./util/ITelexServerCom";
import Interface from "./interfaces/Interface";
import BaudotInterface from "./interfaces/BaudotInterface/BaudotInterface";
import AsciiInterface from "./interfaces/AsciiInterface/AsciiInterface";
import { logger, inspect } from "./util/logging";
import confirm from "./confirm";
import { isBlacklisted } from "./blacklist";
import { PackageData_decoded_5 } from "./util/ITelexServerComTypes";
import { EventEmitter } from "events";

interface Connection {
	socket:Socket;
	name:string;
	number:number;
	interface:Interface;
	identifier:string;
}

function explainErrorCode(code:string){ // TODO: add more codes
	switch(code){
		case 'EHOSTUNREACH':
			return 'derailed';
		default:
			return code;
	}
}

function callOne(number:number, index:number){
	return new Promise<Connection>(async (resolve, reject)=>{
		// output.write(`calling: ${number}\r\n`);

		let peer:PackageData_decoded_5;
		try{
			peer = await peerQuery(number);
		}catch(err){
			logger.log(`Error in peerQuery:\r\n${err}`);
		}
		
		let interFace:Interface;
		if(peer){
			// output.write(`number found: ${peer.name}\r\n`);
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
					// output.write("invalid client type\r\n\n");
					reject('invalid type');
					return;
			}

			if(isBlacklisted(number)){
				// output.write(`${peer.name}(${peer.number}) has been blacklisted\r\n\n`);
				reject('blacklisted');
				return;
			}

			// output.write(`${DELIMITER}\r\n`);

			// if(interFace instanceof BaudotInterface){
			// 	interFace.asciifier.on('modeChange', (newMode)=>{
			// 		logger.log(inspect`new called client mode: ${newMode}`);
			// 	});
			// }

			// output.write('valid client type\r\n');

			let socket = new Socket();

			socket.pipe(interFace.external);
			interFace.external.pipe(socket);


			let timeout = setTimeout(()=>{
				// output.write("timeout\r\n");
				interFace.end();

				// output.write(`${DELIMITER}\r\n`);
				reject('timeout');
			}, 10000);

			socket.on('connect', async ()=>{

				if(!(interFace instanceof AsciiInterface&&peer.extension === null)){
					logger.log('calling: '+peer.extension);
					interFace.call(peer.extension);
				}

				if(interFace instanceof BaudotInterface){
					interFace.internal.resume();
					
					await new Promise((resolve, reject) => {
						interFace.once('ack', (x)=>{
							logger.log(`initial ack: ${x}`);
							if((interFace as BaudotInterface).drained){
								logger.log('was already drained');
								resolve();
							}else{
								logger.log('waiting for drain');
								interFace.on('drain', ()=>{
									resolve();
									logger.log('drained');
								});
							}
						});
					});
				}

				try{
					const result = await confirm(interFace.internal, timeout, +index);

					// output.write(result+'\r\n');

					// interFace.internal.unpipe(output);

					// if(interFace instanceof BaudotInterface) interFace.asciifier.setMode(baudotModeUnknown);

					let connection:Connection = {
						socket,
						name:peer.name,
						number:peer.number,
						interface:interFace,
						identifier: result,
					};

					// output.write(`\r\n${DELIMITER}\r\n`);
					resolve(connection);
				}catch(err){
					logger.log(inspect`error: ${err}`);
				}
			});

			interFace.on('reject', reason=>{
				clearTimeout(timeout);
				interFace.end();
				
				logger.log(util.inspect(reason));
				// output.write(`${reason}`); // \r\n is included in reject message
				// output.write(`${DELIMITER}\r\n`);
				reject(reason);
			});


			socket.once('error', (err:any)=>{
				switch(err.code){
					case "EHOSTUNREACH":
						clearTimeout(timeout);
						interFace.end();
						
						// output.write("derailed\r\n");
						// output.write(`${DELIMITER}\r\n`);
						break;
					case "ERR_STREAM_WRITE_AFTER_END":
						// ignore
						break;
					default:
						logger.log('unexpected error: '+err.code);
				}
			});

			socket.on('error', (err)=>{
				if((err as Error&{code:string}).code === "ERR_STREAM_WRITE_AFTER_END") return;
				
				socket.end();
				logger.log(inspect`socket error: ${err}`);
				reject(explainErrorCode((err as Error&{code:string}).code));
			});

			socket.on('close', ()=>{
				interFace.end();
				
				logger.log(inspect`called client disconnected`);
			});

			socket.connect({
				host: peer.hostname||peer.ipaddress,
				port: parseInt(peer.port),
			});	
		
		}else{
			// output.write("--- 404 ---\r\n");
			// output.write("number not found\r\n\n");
			reject('not found');
		}
	});
}

function callGroup(group:number[], callback:(err:Error, connections:Connection[])=>void):EventEmitter {
	const status = new EventEmitter();

	Promise.all(group.map(
		async (number, index)=>{
			try{
				const result = await callOne(number, index);
				status.emit('success', number, result);

				return result;
			}catch(err){
				status.emit('fail', number, err);
			}
		}
	))
	.then(clients=>callback(null, clients.filter(x=>x)))
	.catch(err=>callback(err, null));

	return status;
}

export default callGroup;
