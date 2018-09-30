"use strict";
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
if(module.parent!=null){let mod=module;let loadOrder=[mod.filename.split("/").slice(-1)[0]];while(mod.parent){mod=mod.parent;loadOrder.push(mod.filename.split("/").slice(-1)[0]);}loadOrder=loadOrder.map((name,index)=>{let color="\x1b[33m";if(index==0)color="\x1b[32m";if(index==loadOrder.length-1)color="\x1b[36m";return(`${color}${name}\x1b[0m`);}).reverse();console.log(loadOrder.join(" → "));}

import { PassThrough } from "stream";
import { Socket } from "net";
import { peerQuery } from "./util/ITelexServerCom";
import Interface from "./interfaces/Interface";
import BaudotInterface from "./interfaces/BaudotInterface/BaudotInterface";
import AsciiInterface from "./interfaces/AsciiInterface/AsciiInterface";
import { logger, inspect } from "./util/logging";
import * as util from "util";
import serialEachPromise from "./util/serialEachPromise";


interface Connection {
	socket:Socket;
	name:string;
	number:number;
	interface:Interface;
}

function callGroup(group:string[], callback:(connections:Connection[])=>void):PassThrough {
	let output = new PassThrough();

	serialEachPromise(group, (number, key)=>
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
					output.write("invalid client type\r\n\n");
					reject();
			}

			if(interFace){
				// output.write('valid client type\r\n');

				let socket = new Socket();

				socket.pipe(interFace.external);
				interFace.external.pipe(socket);

	
				let timeout = setTimeout(()=>{
					output.write("\r\ntimeout\r\n\n");
					interFace.end();
					reject();
				}, 10000);

				socket.on('connect', ()=>{
					interFace.call(peer.extension);

					setTimeout(()=>{
						interFace.internal.write('@');
					}, 1500);
					
					interFace.internal.pipe(output);
					interFace.internal.once('data',()=>{
						clearTimeout(timeout);
						setTimeout(()=>{
							output.write('\r\n\n');
							interFace.internal.unpipe(output);

							let connection:Connection = {
								socket,
								name:peer.name,
								number:peer.number,
								interface:interFace,
							};
							resolve(connection);
						}, 7500);
					});
					
				});

				interFace.on('reject', reason=>{
					output.write(`\r\n${reason}\r\n\n`);
					clearTimeout(timeout);
					interFace.end();
					reject();
				});


				socket.once('error', (err:any)=>{
					switch(err.code){
						case "EHOSTUNREACH":
							clearTimeout(timeout);
							output.write("\r\nderailed\r\n\n");
							interFace.end();
							reject();
							break;
						default:
							logger.log('error: '+err.code);
					}
				});

				socket.connect({
					host: peer.hostname||peer.ipaddress,
					port: parseInt(peer.port),
				});	
			}
		}else{
			output.write("number not found\r\n\n");
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
