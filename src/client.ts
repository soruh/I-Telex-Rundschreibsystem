import { Socket } from "net";
import BaudotInterface from "./interfaces/BaudotInterface/BaudotInterface";
import { logger } from "./util/logging";
import { Transform } from "stream";


Buffer.prototype.readNullTermString = 
function readNullTermString(encoding: string = "utf8", start: number = 0, end: number = this.length):string {
	let firstZero = this.indexOf(0, start);
	let stop = firstZero >= start && firstZero <= end ? firstZero : end;
	return this.toString(encoding, start, stop);
};

// tslint:disable-next-line:no-string-throw
if(!process.argv[2]||!process.argv[3]) throw('USAGE:\nnode client.js host port');

// tslint:disable-next-line:no-empty
(logger as any) = {log:()=>{}};

let socket = new Socket();
let baudotInterface = new BaudotInterface(logger, ["\x1b[32m", "client", "\x1b[0m"]);


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

socket.once('close', ()=>{
	process.stdout.write("\n<connection closed>\n");
	process.exit();
});

socket.on('error', ()=>{
	//
});

socket
	.pipe(baudotInterface.external)
	.pipe(socket);

process.stdin
	.pipe(new addCr())
	.pipe(baudotInterface.internal)
	.pipe(new noAutoCr())
	.pipe(process.stdout);

socket.connect({host:process.argv[2], port:parseInt(process.argv[3])});
baudotInterface.call('42');

baudotInterface.on('request end', ()=>{
	process.stdout.write("\n<connection end requested>\n");
	socket.end();
});

baudotInterface.on('end', ()=>{
	process.stdout.write("\n<interface ended>\n");
	socket.end();
});
