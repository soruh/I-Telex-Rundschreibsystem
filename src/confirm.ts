import { Duplex } from "stream";
import { logger, logStream,inspect } from "./util/logging";

function confirm(socket:Duplex, timeout:NodeJS.Timer, index:number):Promise<string>{
return new Promise((resolve, reject)=>{
	logger.log(`confirming client ${index}`);
	// let loggingStream = new logStream(inspect`called client ${index}`, socket);

	socket.write('@');

	function end(success:boolean){
		// loggingStream.end();
		logger.log(`${success?'confirmed':'failed to confirm'} client ${index}`);

		socket.removeAllListeners('close');
		socket.removeAllListeners('data');

		clearInterval(timeoutCheckInterval);
		clearTimeout(timeout);
		clearTimeout(resolveTimeout);

		if(success){
			resolve(buffer);
		} else {
			reject();
		}
	}

	let buffer = '';
	let lastPackage = 0;
	
	socket.on('data', chunk=>{
		buffer+=chunk.toString();

		lastPackage = Date.now();
	});



	
	let resolveTimeout:NodeJS.Timer;
	// always resolve after 7,5 secs

	socket.once('data',()=>{
		clearTimeout(timeout);
		resolveTimeout = setTimeout(()=>{
			end(true);
		}, 7500);
	});


	socket.once('close',()=>{
		logger.log('closed');
		end(false);
	});


	let timeoutCheckInterval = setInterval(()=>{
		// resolve if client didn't send data for 1 sec
		if(!resolveTimeout){
			return;
		}

		if((resolveTimeout as any)._destroyed){
			clearInterval(timeoutCheckInterval);
			return;
		}
		if(lastPackage !== 0&&Date.now()-lastPackage>1000){
			end(true);
		}	
	}, 100);

});
}

export default confirm;
