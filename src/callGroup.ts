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
import { isBlacklisted } from "./blacklist";
import { PackageData_decoded_5 } from "./util/ITelexServerComTypes";

interface Connection {
	socket:Socket;
	name:string;
	number:number;
	interface:Interface;
}

function callGroup(group:number[], callback:(err:Error, connections:Connection[])=>void):PassThrough {
	const output = new PassThrough();

	serialEachPromise(group, (number, index)=>
	new Promise(async (resolve, reject)=>{
		output.write(`calling: ${number}\r\n`);

		let peer:PackageData_decoded_5;
		try{
			peer = await peerQuery(number);
		}catch(err){
			logger.log(`Error in peerQuery:\r\n${err}`);
		}
		
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
					output.write("invalid client type\r\n\n");
					reject('invalid type');
					return;
			}

			if(isBlacklisted(number)){
				output.write(`${peer.name}(${peer.number}) has been blacklisted\r\n\n`);
				reject('blacklisted');
				return;
			}

			output.write(`${DELIMITER}\r\n`);

			if(interFace instanceof BaudotInterface){
				interFace.asciifier.on('modeChange', (newMode)=>{
					logger.log(inspect`new called client mode: ${newMode}`);
				});
			}

			// output.write('valid client type\r\n');

			let socket = new Socket();

			socket.pipe(interFace.external);
			interFace.external.pipe(socket);


			let timeout = setTimeout(()=>{
				output.write("timeout\r\n");
				interFace.end();

				output.write(`${DELIMITER}\r\n`);
				reject('timeout');
			}, 10000);

			socket.on('connect', ()=>{

				if(!(interFace instanceof AsciiInterface&&peer.extension === null)){
					logger.log('calling: '+peer.extension);
					interFace.call(peer.extension);
				}

				confirm(interFace.internal, timeout, +index)
				.then(result=>{
					output.write(result);
					output.write('\r\n');

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
				.catch(err=>{
					logger.log(inspect`error: ${err}`);
				});
			});

			interFace.on('reject', reason=>{
				clearTimeout(timeout);
				interFace.end();
				
				logger.log(util.inspect(reason));
				output.write(`${reason}`); // \r\n is included in reject message
				output.write(`${DELIMITER}\r\n`);
				reject(reason);
			});


			socket.once('error', (err:any)=>{
				switch(err.code){
					case "EHOSTUNREACH":
						clearTimeout(timeout);
						interFace.end();
						
						output.write("derailed\r\n");
						output.write(`${DELIMITER}\r\n`);
						break;
					default:
						logger.log('unexpected error: '+err.code);
				}
			});

			socket.on('error', (err)=>{
				socket.end();
				logger.log(inspect`socket error: ${err}`);
				reject(err);
			});

			socket.connect({
				host: peer.hostname||peer.ipaddress,
				port: parseInt(peer.port),
			});	
		
		}else{
			// output.write("--- 404 ---\r\n");
			output.write("number not found\r\n\n");
			reject('not found');
		}
	}))
	.then((clients)=>callback(null, clients))
	.catch(err=>callback(err, null));
	return output;
}

export default callGroup;
