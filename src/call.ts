import { logger, inspect } from "./util/logging";
import callGroup from "./callGroup";
import CallEndDetector from "./CallEndDetector";
import BaudotInterface from "./interfaces/BaudotInterface/BaudotInterface";
import confirm from "./confirm";
import Client from "./Client";

function call(caller:Client, numbers:number[]){
	caller.interface.internal.write('\r\n');

	caller.interface.internal.write(`calling ${numbers.length} numbers:\r\n`);
	const status = callGroup(numbers, (error, connections)=>{
		if(error){
			logger.log('error', error);
			throw error;
		}

		if(connections.length === 0){
			caller.interface.internal.write('No peers could be reached.\r\n');
			caller.interface.end();
			caller.socket.destroy();

			return;
		}

		caller.interface.on('end', ()=>{
			for(let connection of connections){
				connection.socket.end('+++');
			}
		});

		// tslint:disable-next-line:max-line-length
		caller.interface.internal.write(`Now connected to ${connections.length} peer${connections.length===1?'':'s'}. Type '+++' to end message\r\n`);
		
		for(let connection of connections){
			connection.interface.internal.write('\r\n');
			caller.interface.internal.pipe(connection.interface.internal);
		}

		const detector = new CallEndDetector();
		caller.interface.internal.pipe(detector);

		detector.emitter.on('end', async ()=>{
			caller.interface.internal.unpipe(detector);

			for(let connection of connections){
				caller.interface.internal.pipe(connection.interface.internal);
			}

			// tslint:disable-next-line:max-line-length
			caller.interface.internal.write(`\r\n\ntransmission over. confirming ${connections.length} peer${connections.length===1?'':'s'}.\r\n`);

			logger.log("message ended");
			// logger.log(connections);

			let promises = [];
			for(let index in connections){
				let connection = connections[index];
				promises.push(
					new Promise((resolve, reject)=>{
						logger.log(`confirming: ${connection.number} (${connection.name})`);

						// caller.interface.internal.write(`confirming: ${connection.number} (${connection.name})\r\n`);
						// caller.interface.internal.write(`${DELIMITER}\r\n`);

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
								// caller.interface.internal.write(`${DELIMITER}\r\n\n`);
								connection.interface.internal.unpipe(caller.interface.internal);

								connection.interface.end();
								connection.socket.end();

								resolve();
							}

							let timeout = setTimeout(()=>{
								caller.interface.internal.write('timeout\r\n');
								close();
							}, 10000);

							confirm(connection.interface.internal, timeout, +index)
							.then(result=>{
								caller.interface.internal.write(`${connection.number}: ${result.replace(/[\r\n]/g, '')}\r\n`);
								close();
							})
							.catch(err=>{
								logger.log(inspect`error: ${err}`);
								caller.interface.internal.write(`${connection.number}: ${err}\r\n`);
								close();
							});
						}
					})
				);
			}

			await Promise.all(promises);

			logger.log("confirmed all peers");
			caller.interface.internal.write('\r\nconfirmation finished\r\n\r\n');

			caller.interface.end();
			caller.socket.destroy();
		});
	});

	status.on('success', (number, res)=>{
		// caller.interface.internal.write(`${number} succeeeded: ${res.identifier.replace(/[\r\n]/g, '')}\r\n`);
		caller.interface.internal.write(`${number}: ${res.identifier.replace(/[\r\n]/g, '')}\r\n`);
	});

	status.on('fail', (number, err)=>{
		// caller.interface.internal.write(`${number} failed: ${err}\r\n`);
		caller.interface.internal.write(`${number}: ${err}\r\n`);
	});
}

export default call;
