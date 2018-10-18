"use strict";
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals


import { PassThrough } from "stream";
import { Socket } from "net";
import * as util from "util";
import { peerQuery } from "./util/ITelexServerCom";
import Interface from "./interfaces/Interface";
import BaudotInterface from "./interfaces/BaudotInterface/BaudotInterface";
import AsciiInterface from "./interfaces/AsciiInterface/AsciiInterface";
import { logger, inspect, logStream } from "./util/logging";
import confirm from "./confirm";
import serialEachPromise from "./util/serialEachPromise";
import { DELIMITER } from "./config";
import { baudotModeUnknown } from "./util/baudot";

interface Connection {
	socket:Socket;
	name:string;
	number:number;
	interface:Interface;
}

function callGroup(group:string[], callback:(connections:Connection[])=>void):PassThrough {
	let output = new PassThrough();

	serialEachPromise(group, (number, index)=>
	new Promise(async (resolve, reject)=>{
		output.write(`calling: ${number}\r\n`);

		let peer = await peerQuery(number);
		
		let interFace:Interface;
		if(peer){
			output.write(`number found: ${peer.name}\r\n`);
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
					output.write("invalid client type\r\n");
					reject();
			}

			output.write(`${DELIMITER}\r\n`);
			if(interFace){
				if(interFace instanceof BaudotInterface) interFace.asciifier.on('modeChange', (newMode)=>{
					logger.log(inspect`new called client mode: ${newMode}`);
				});
				// output.write('valid client type\r\n');

				let socket = new Socket();

				socket.pipe(interFace.external);
				interFace.external.pipe(socket);

	
				let timeout = setTimeout(()=>{
					output.write("timeout\r\n");
					interFace.end();

					output.write(`${DELIMITER}\r\n`);
					reject();
				}, 10000);

				socket.on('connect', ()=>{

					if(!(interFace instanceof AsciiInterface&&peer.extension === null)){
						logger.log('calling: '+peer.extension);
						interFace.call(peer.extension);
					}

					confirm(interFace.internal, output, timeout, +index)
					.then(()=>{
						// output.write('\r\n');
						interFace.internal.unpipe(output);

						// if(interFace instanceof BaudotInterface) interFace.asciifier.setMode(baudotModeUnknown);

						let connection:Connection = {
							socket,
							name:peer.name,
							number:peer.number,
							interface:interFace,
						};

						output.write(`\r\n${DELIMITER}\r\n`);
						resolve(connection);
					})
					.catch(err=>logger.log(inspect`error: ${err}`));
				});

				interFace.on('reject', reason=>{
					clearTimeout(timeout);
					interFace.end();
					
					logger.log(util.inspect(reason));
					output.write(`\r\n${reason}`); // \r\n is included in reject message
					output.write(`${DELIMITER}\r\n`);
					reject();
				});


				socket.once('error', (err:any)=>{
					switch(err.code){
						case "EHOSTUNREACH":
							clearTimeout(timeout);
							output.write("\r\nderailed\r\n");
							interFace.end();

							output.write(`${DELIMITER}\r\n`);
							break;
						default:
							logger.log('unexpected error: '+err.code);
					}
				});

				socket.on('error', (err)=>{
					socket.end();
					logger.log(inspect`socket error: ${err}`);
					reject();
				});

				socket.connect({
					host: peer.hostname||peer.ipaddress,
					port: parseInt(peer.port),
				});	
			}
		}else{
			output.write("number not found\r\n");
			output.write(`${DELIMITER}\r\n`);
			reject();
		}
	}))
	.then((clients)=>callback(clients))
	.catch(err=>{
		// 
	});
	return output;
}

export default callGroup;
