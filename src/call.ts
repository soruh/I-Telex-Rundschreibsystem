import { Duplex } from "stream";
import { logger, inspect } from "./util/logging";
import callGroup from "./callGroup";
import CallEndDetector from "./ui/CallEndDetector";
import BaudotInterface from "./interfaces/BaudotInterface/BaudotInterface";
import serialEachPromise from "./util/serialEachPromise";
import confirm from "./confirm";
import { DELIMITER } from "./config";
import { Client } from "./ui/UITypes";

function call(caller:Client, numbers:string[]){
	caller.interface.internal.write('\r\n');

	let output = callGroup(numbers, (connections)=>{
		connections = connections.filter(x=>x);

		output.unpipe(caller.interface.internal);
		// tslint:disable-next-line:max-line-length
		caller.interface.internal.write(`You are now connected to ${connections.length} peer${connections.length===1?'':'s'}. Type '+++' to end message\r\n`);
		
		for(let connection of connections){
			connection.interface.internal.write('\r\n');
			caller.interface.internal.pipe(connection.interface.internal);
		}

		let detector = new CallEndDetector();
		caller.interface.internal.pipe(detector);

		detector.emitter.on('end', ()=>{
			caller.interface.internal.unpipe(detector);

			for(let connection of connections){
				caller.interface.internal.pipe(connection.interface.internal);
			}
			caller.interface.internal.write(`\r\n\nStopped transmitting message\r\n`);

			logger.log("message ended");
			// logger.log(connections);

			serialEachPromise(connections, (connection, index)=>new Promise((resolve, reject)=>{
				logger.log(`confirming: ${connection.number} (${connection.name})`);

				caller.interface.internal.write(`confirming: ${connection.number} (${connection.name})\r\n`);
				caller.interface.internal.write(`${DELIMITER}\r\n`);

				if((connection.interface as BaudotInterface).drained !== false){
					// drained == true or drained == undefined (for Ascii clients)
					logger.log('was already drained');

					confirmClient();
					
				}else{
					logger.log("wasn't already drained");
					connection.interface.once('drain', ()=>{
						logger.log('is now drained');

						confirmClient();
					});
				}


				function confirmClient(){
					function close(){
						caller.interface.internal.write(`${DELIMITER}\r\n\n`);
						connection.interface.internal.unpipe(caller.interface.internal);

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
						caller.interface.internal.write('timeout\r\n');
						close();
					}, 10000);

					confirm(connection.interface.internal, caller.interface.internal, timeout, +index)
					.then(()=>{
						caller.interface.internal.write('\r\n');
						close();
					})
					.catch(err=>{
						logger.log(inspect`error: ${err}`);
						caller.interface.internal.write('error\r\n');
						close();
					});
				}
			}))
			.then(()=>{
				logger.log("confirmed all peers");
				caller.interface.internal.write('\r\nconfirmed all peers\r\n\r\n');

				if(caller.interface instanceof BaudotInterface){
					caller.interface.sendEnd();
					setTimeout(()=>{
						caller.interface.end();
						caller.socket.end();
					}, 2000);
				}else{
					caller.interface.end();
					caller.socket.end();
				}
			})
			.catch(err=>logger.log(inspect`confirmation error: ${err}`));
		});
	});
	output.pipe(caller.interface.internal);
}

export default call;
