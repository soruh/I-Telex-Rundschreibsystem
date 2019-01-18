import { logger, inspect } from "./util/logging";
import callGroup from "./callGroup";
import CallEndDetector from "./CallEndDetector";
import BaudotInterface from "./interfaces/BaudotInterface/BaudotInterface";
import confirm from "./confirm";
import { createWriteStream, openSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { createGzip } from "zlib";
import Interface from "./interfaces/Interface";
import { Socket } from "net";


const IDENTIFIER = "1150 rundsen d";

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

interface Caller {
	socket:Socket;
	interface:Interface;
	identifier?:string;
}

async function call(caller:Caller, numbers:number[]){

	let confimedCaller = false;
	let resolveCallerConfirmation = ()=>{/**/};


	caller.interface.internal.write('\r\n');
	caller.interface.internal.write(`calling ${numbers.length} number${numbers.length===1?'':'s'}:\r\n`);
	const status = callGroup(numbers, async (error, connections)=>{
		if(error){
			logger.log('error', error);
			throw error;
		}

		logger.log('waiting for caller confirmation');

		await new Promise((resolve, reject)=>{
			if(confimedCaller){
				logger.log('already confirmed caller');
				resolve();
			}else{
				logger.log('readied confirmation resolve');
				resolveCallerConfirmation = resolve;
			}
		});

		logger.log('recieved caller confirmation');

		if(connections.length === 0){
			caller.interface.internal.write('No peers could be reached.\r\n');
			

			caller.interface.once('end', ()=>caller.socket.end());
			caller.interface.end(); // end the interface

			return;
		}

		function handleAbort(){
			for(let connection of connections){
				connection.socket.end('+++');
			}
		}

		const logFile = createLogStream();
		logFile.write(JSON.stringify({
			caller: caller.identifier,
			// timestamp: new Date(),
			called: connections.map(x=>[x.number, x.identifier]),
		})+'\n');

		caller.interface.internal.pipe(logFile);

		caller.interface.once('end', handleAbort);

		caller.interface.internal.write(`Now connected to ${connections.length} peer${connections.length===1?'':'s'}. Type '+++' to end message\r\n`);
		
		for(let connection of connections){

			connection.socket.on('end', ()=>{
				logger.log('called end');
			});

			connection.socket.on('close', ()=>{
				logger.log('called close');
			});

			connection.interface.internal.write('\r\n');
			connection.interface.internal.write(IDENTIFIER);
			connection.interface.internal.write('\r\nRundsenden');
			if(caller.identifier) connection.interface.internal.write(' von '+caller.identifier.replace(/[\r\n]/g, ''));
			connection.interface.internal.write('\r\n');

			caller.interface.internal.pipe(connection.interface.internal);
		}

		const detector = new CallEndDetector();
		caller.interface.internal.pipe(detector);

		detector.emitter.on('end', async ()=>{
			caller.interface.internal.unpipe(detector);

			for(let connection of connections){
				caller.interface.internal.pipe(connection.interface.internal, {end:false});
			}

			caller.interface.internal.write(`\r\n\ntransmission over. confirming ${connections.length} peer${connections.length===1?'':'s'}.\r\n`);

			logger.log("message ended");
			// logger.log(connections);

			logFile.end();

			let promises = [];
			for(let index in connections){
				let connection = connections[index];
				caller.interface.internal.unpipe(connection.interface.internal);

				// connection.interface.internal.resume();
				
				promises.push(
					new Promise((resolve, reject)=>{
						logger.log(inspect`confirming: ${connection.number} (${connection.name})`);

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


						async function confirmClient(){
							function close(){
								try{
									connection.interface.internal.write('\r\n'+IDENTIFIER+'\r\n\n');
								}catch(err){/**/}
		
								
								connection.interface.once('end', ()=>{connection.socket.end();});
								connection.interface.end();

								resolve();
							}

							try{
								let result = await confirm(connection.interface.internal, +index);

								let changed = connection.identifier !== result;
								caller.interface.internal.write(`${connection.number}: (${changed?'x':'='}) ${result.replace(/[\r\n]/g, '')}\r\n`);
								close();
							}catch(err){
								logger.log(inspect`error: ${err}`);
								caller.interface.internal.write(`${connection.number}: ${err}\r\n`);
								close();
							}
						}
					})
				);
			}

			await Promise.all(promises);

			logger.log("confirmed all peers");
			caller.interface.internal.write('confirmation finished\r\n\r\n');

			caller.interface.removeListener('end', handleAbort); // don't handle aborts if not aborted

			caller.interface.once('end', ()=>caller.socket.end());
			caller.interface.end(); // end the interface
		});
	});


	function printRes(number:number, res:any){
		caller.interface.internal.write(`${number}: ${res.identifier.replace(/[\r\n]/g, '')}\r\n`);
	}

	function printErr(number:number, err:any){
		caller.interface.internal.write(`${number}: ${err}\r\n`);
	}

	let statusBuffer:Array<[boolean, number, any]> = [];
	status.on('success', (number, res)=>{
		if(confimedCaller){
			printRes(number, res);
		}else{
			statusBuffer.push([true, number, res]);
		}
	});

	status.on('fail', (number, err)=>{
		if(confimedCaller){
			printErr(number, err);
		}else{
			statusBuffer.push([false, number, err]);
		}
	});


	logger.log('confirming caller');
	try{
		caller.interface.internal.resume();
		caller.identifier = await confirm(caller.interface.internal);
	}catch(err){
		logger.log(inspect`confimation failed: ${err}`);
	}


	while(statusBuffer.length>0){
		try{
			let [success, number, res] = statusBuffer.shift();
			if(success){
				printRes(number, res);
			}else{
				printErr(number, res);
			}
		}catch(err){/**/}
	}
	
	caller.interface.internal.write('\r\n');
	confimedCaller = true;
	resolveCallerConfirmation();
}

export default call;
