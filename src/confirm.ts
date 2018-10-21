import { Duplex } from "stream";
import { logger, logStream,inspect } from "./util/logging";

function confirm(socket:Duplex, output:Duplex, timeout:NodeJS.Timer, index:number){
return new Promise((resolve, reject)=>{
	logger.log(`confirming client ${index}`);
	let loggingStream = new logStream(inspect`called client ${index}`, socket);

	socket.write('@');

	function end(Resolve:boolean){
		loggingStream.end();
		logger.log(`${Resolve?'confirmed':'failed to confirm'} client ${index}`);

		socket.removeAllListeners('close');
		socket.removeAllListeners('data');
		socket.unpipe(output);

		clearInterval(timeoutCheckInterval);
		clearTimeout(timeout);
		clearTimeout(resolveTimeout);

		if(Resolve){
			resolve();
		} else {
			reject();
		}
	}


	// always resolve after 7,5 secs

	let resolveTimeout:NodeJS.Timer;

	socket.pipe(output, {end:false});
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


	// resolve if client didn't send data for 1 sec

	let lastPackage = 0;
	socket.on('data',()=>{
		lastPackage = Date.now();
	});

	let timeoutCheckInterval = setInterval(()=>{

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
