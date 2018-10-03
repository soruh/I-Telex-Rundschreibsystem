import { Socket } from "net";
import BaudotInterface from "./interfaces/BaudotInterface/BaudotInterface";
import { logger } from "./util/logging";
import { Transform } from "stream";


// tslint:disable-next-line:no-string-throw
if(!process.argv[2]||!process.argv[3]) throw('USAGE:\nnode client.js host port');

// tslint:disable-next-line:no-empty
(logger as any) = {log:()=>{}};

let socket = new Socket();
let baudotInterface = new BaudotInterface();


class noAutoCr extends Transform{
	public _transform(chunk:string, encoding:string, callback:(err?:Error, data?:string)=>void) {
		callback(null, chunk.toString().replace(/\n/g, '\x1b[1B'));
	}
}

// tslint:disable-next-line:max-classes-per-file
class addCr extends Transform{
	public _transform(chunk:string, encoding:string, callback:(err?:Error, data?:string)=>void) {
		callback(null, chunk.toString().replace(/\n/g, '\r\n'));
	}
}

socket
	.pipe(baudotInterface.external)
	.pipe(socket);

process.stdin
	.pipe(new addCr())
	.pipe(baudotInterface.internal)
	.pipe(new noAutoCr())
	.pipe(process.stdout);

socket.connect({host:process.argv[2], port:parseInt(process.argv[3])});
baudotInterface.call(null);

baudotInterface.on('end', ()=>{
	socket.end();
	process.exit();
});
