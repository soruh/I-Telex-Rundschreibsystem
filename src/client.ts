import { Socket } from "net";
import BaudotInterface from "./interfaces/BaudotInterface/BaudotInterface";
import { logger } from "./util/logging";
import { Transform } from "stream";

// tslint:disable-next-line:no-empty
(logger as any) = {log:()=>{}};

let socket = new Socket();
let baudotInterface = new BaudotInterface();


class noAutoCr extends Transform{
	public _transform(chunk:string, encoding:string, callback:(err?:Error, data?:string)=>void) {
		callback(null, chunk.toString().replace(/\n/g, '\x1b[1B'));
	}
}

socket
	.pipe(baudotInterface.external)
	.pipe(socket);

process.stdin
	.pipe(baudotInterface.internal)
	.pipe(new noAutoCr())
	.pipe(process.stdout);

socket.connect({port:4000});
baudotInterface.call(0);

baudotInterface.on('end', ()=>{
	socket.end();
	process.exit();
});
