import { logger, inspect } from "./util/logging";
import callGroup from "./callGroup";
import CallEndDetector from "./CallEndDetector";
import BaudotInterface from "./interfaces/BaudotInterface/BaudotInterface";
import confirm from "./confirm";
import Client from "./Client";
import { createWriteStream, openSync, mkdirSync } from "fs";

import { join, dirname } from "path";
import { createGzip, Gzip } from "zlib";

function createLogStream(failed=false){
	try{	
		var logFileName = new Date().toISOString()+'.gz';
		var path = join(__dirname, '..', 'logs', logFileName);
	
		const fd = openSync(path, 'w');
		const writeStream = createWriteStream(null, {fd});

		logger.log(inspect`opened log file ${logFileName}`);

		writeStream.on('close', ()=>{
			logger.log(inspect`closed log file ${logFileName}`);	
		});
	
		var logFile = createGzip();
		logFile.pipe(writeStream);

		return logFile;
	}catch(err){
		logger.log(inspect`failed to create log file ${logFileName}`);
		if(err.code === 'ENOENT'){
			if(!failed){
				mkdirSync(dirname(path), {recursive:true});
				logger.log(inspect`created directory ${dirname(path)}`);

				return createLogStream(true);
			}else{
				throw err;
			}
		}else{
			throw err;
		}
	}
}

function call(caller:Client, numbers:number[]){
	caller.interface.internal.write('\r\n');

	caller.interface.internal.write(`calling ${numbers.length} number${numbers.length===1?'':'s'}:\r\n`);
	const status = callGroup(numbers, (error, connections)=>{
		if(error){
			logger.log('error', error);
			throw error;
		}

		if(connections.length === 0){
			caller.interface.internal.write('No peers could be reached.\r\n');
			

			caller.interface.once('end', ()=>caller.socket.destroy());
			caller.interface.end(); // end the interface

			return;
		}

		function handleAbort(){
			for(let connection of connections){
				connection.socket.end('+++');
			}
		}

		const logFile = createLogStream();
		logFile.write(JSON.stringify(connections.map(x=>[x.number, x.identifier]))+'\n');

		caller.interface.internal.pipe(logFile);

		caller.interface.once('end', handleAbort);

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

			caller.interface.internal.write(`\r\n\ntransmission over. confirming ${connections.length} peer${connections.length===1?'':'s'}.\r\n`);

			logger.log("message ended");
			// logger.log(connections);

			logFile.end();

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
								let changed = connection.identifier !== result;
								caller.interface.internal.write(`${connection.number}: (${changed?'x':'='}) ${result.replace(/[\r\n]/g, '')}\r\n`);
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
			caller.interface.internal.write('confirmation finished\r\n\r\n');

			caller.interface.removeListener('end', handleAbort); // don't handle aborts if not aborted

			caller.interface.once('end', ()=>caller.socket.destroy());
			caller.interface.end(); // end the interface
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
