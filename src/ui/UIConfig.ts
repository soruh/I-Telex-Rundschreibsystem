// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
if(module.parent!=null){let mod=module;let loadOrder=[mod.filename.split("/").slice(-1)[0]];while(mod.parent){mod=mod.parent;loadOrder.push(mod.filename.split("/").slice(-1)[0]);}loadOrder=loadOrder.map((name,index)=>{let color="\x1b[33m";if(index==0)color="\x1b[32m";if(index==loadOrder.length-1)color="\x1b[36m";return(`${color}${name}\x1b[0m`);}).reverse();console.log(loadOrder.join(" → "));}

import { UIConfig } from "./UITypes";
import callGroup from "../callGroup";
import CallEndDetector from "./CallEndDetector";
import serialEachPromise from "../util/serialEachPromise";
import BaudotInterface from "../interfaces/BaudotInterface/BaudotInterface";
import { logger, inspect } from "../util/logging";
import confirm from "../confirm";
import { DELIMITER } from "../config";

let uiConfig:UIConfig = {
	start: {
		text: "welcome!\r\n'1' for A1\r\n'2' for A2\r\n'end' to disconnect\r\n",
		responseHandler: (response, readline, client, questions, callback)=>{
			if(response === "1"){
				callback(questions.A1);
			}else if(response === "2"){
				callback(questions.A2);
			}else if(response === "end"){
				client.interface.internal.write("bye!\r\n");
				readline.close();
				client.socket.end();
			}else{
				client.interface.internal.write("invalid input!\r\n");
				callback();
			}
		},
	},
	A1:{
		text: "A1!\r\n'start' to go back to the start\r\n'2' for A2\r\n'end' to disconnect\r\n",
		responseHandler: (response, readline, client, questions, callback)=>{
			if(response === "2"){
				callback(questions.A2);
			}else if(response === "start"){
				callback(questions.start);
			}else if(response === "end"){
				client.interface.internal.write("bye!\r\n");
				readline.close();
				client.socket.end();
			}else{
				client.interface.internal.write("invalid input!\r\n");
				callback();
			}
		},
	},
	A2:{
		text: "A2!\r\n'start' to go back to the start\r\n'1' for A1\r\n'3' for call\r\n'end' to disconnect\r\n",
		responseHandler: (response, readline, client, questions, callback)=>{
			if(response === "1"){
				callback(questions.A1);
			}else if(response === "3"){
				callback(questions.call);
			}else if(response === "start"){
				callback(questions.start);
			}else if(response === "end"){
				client.interface.internal.write("bye!\r\n");
				readline.close();
				client.socket.end();
			}else{
				client.interface.internal.write("invalid input!\r\n");
				callback();
			}
		},
	},
	call:{
		text: "Welcome!\r\nenter numbers seperated by ','\r\n",
		responseHandler: (response, readline, client, questions, callback)=>{
			const internal = client.interface.internal;
			internal.write('\r\n');

			readline.close();

			let output = callGroup(response.split(","), (connections)=>{
				connections = connections.filter(x=>x);

				output.unpipe(internal);
				// tslint:disable-next-line:max-line-length
				internal.write(`You are now connected to ${connections.length} peer${connections.length===1?'':'s'}. Type '+++' to end message\r\n`);
				
				for(let connection of connections){
					connection.interface.internal.write('\r\n');
					internal.pipe(connection.interface.internal);
				}

				let detector = new CallEndDetector();
				internal.pipe(detector);

				detector.emitter.on('end', ()=>{
					internal.unpipe(detector);

					for(let connection of connections){
						internal.pipe(connection.interface.internal);
					}
					internal.write(`\r\n\nStopped transmitting message\r\n`);

					serialEachPromise(connections, (connection, index)=>new Promise((resolve, reject)=>{
						internal.write(`confirming: ${connection.number} (${connection.name})\r\n`);
						internal.write(`${DELIMITER}\r\n`);

						if((connection.interface as BaudotInterface).drained !== false){
							// drained == true or drained == undefined (for Ascii clients)
							logger.log('was already drained');

							confirmClient();
							
						}else{
							connection.interface.once('drain', ()=>{
								logger.log('drained');

								confirmClient();
							});
						}


						function confirmClient(){
							function close(){
								internal.write(`${DELIMITER}\r\n\n`);
								connection.interface.internal.unpipe(internal);

								if(connection.interface instanceof BaudotInterface){
									connection.interface.sendEnd();
									setTimeout(()=>{
										connection.interface.end();
										connection.socket.end();
									}, 2000);
								}else{
									connection.interface.end();
									connection.socket.end();
								}
								resolve();
							}

							let timeout = setTimeout(()=>{
								internal.write('timeout\r\n');
								close();
							}, 10000);

							confirm(connection.interface.internal, internal, timeout)
							.then(()=>{
								internal.write('\r\n');
								close();
							})
							.catch(err=>{
								logger.log(inspect`error: ${err}`);
								internal.write('error\r\n');
								close();
							});
						}
					}))
					.then(()=>{
						logger.log("confirmed all peers");
						internal.write('\r\nconfirmed all peers\r\n\r\n');

						if(client.interface instanceof BaudotInterface){
							client.interface.sendEnd();
							setTimeout(()=>{
								client.interface.end();
								client.socket.end();
							}, 2000);
						}else{
							client.interface.end();
							client.socket.end();
						}
					})
					.catch(err=>logger.log(inspect`confirmation error: ${err}`));
				});
			});
			output.pipe(internal);
		},
	},
};

export default uiConfig;
