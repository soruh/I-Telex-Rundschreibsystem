import { Duplex } from "stream";
import { logger, logStream, inspect } from "./util/logging";

function confirm(socket:Duplex, index?:number):Promise<string>{
return new Promise((resolve, reject)=>{
	let timeout = setTimeout(()=>{
		end(false, "timeout");
	}, 10000);
	logger.log(inspect`confirming client ${index==null?'caller':'client '+index}`);
	// let loggingStream = new logStream(inspect`called client ${index}`, socket);

	socket.write('@');

	function end(success:boolean, message?:string){
		// loggingStream.end();
		logger.log(inspect`${success?'confirmed':'failed to confirm'} ${index==null?'caller':'client '+index}`);

		socket.removeAllListeners('close');
		socket.removeAllListeners('data');

		try{
			socket.write('\r\n\n');
		}catch(err){/**/}

		clearInterval(timeoutCheckInterval);
		clearTimeout(timeout);
		clearTimeout(resolveTimeout);

		if(success){
			resolve(buffer);
		} else {
			reject(message);
		}
	}

	let buffer = '';
	let lastPackage = 0;
	
	socket.on('data', chunk=>{
		// logger.log("recieved data");

		buffer+=chunk.toString();

		lastPackage = Date.now();
	});



	
	let resolveTimeout:NodeJS.Timer;
	// always resolve after 7,5 secs

	socket.once('data', ()=>{
		// logger.log("recieved initial data");

		clearTimeout(timeout);
		resolveTimeout = setTimeout(()=>{
			end(true);
		}, 7500);
	});


	socket.once('close', ()=>{
		// logger.log("socket closed");
		end(false, 'closed');
	});


	let timeoutCheckInterval = setInterval(()=>{
		// logger.log("checking timeout");
		// logger.log("last package: "+lastPackage+" ("+(Date.now()-lastPackage)+"ms ago)");
		
		// resolve if client didn't send data for 1 sec
		if(!resolveTimeout){
			// logger.log("!resolveTimeout");
			return;
		}

		if((resolveTimeout as any)._destroyed){
			// logger.log("resolveTimeout is destroyed");
			clearInterval(timeoutCheckInterval);
			return;
		}
		if(lastPackage !== 0&&Date.now()-lastPackage>1000){
			// logger.log("more than 1000 ago");
			end(true);
		}
	}, 500);

});
}

export default confirm;
