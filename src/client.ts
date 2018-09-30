import { Socket } from "net";
import BaudotInterface from "./interfaces/BaudotInterface/BaudotInterface";
import { logger } from "./util/logging";

// tslint:disable-next-line:no-empty
(logger as any) = {log:()=>{}};

let socket = new Socket();
let baudotInterface = new BaudotInterface();

socket.pipe(baudotInterface.external);
baudotInterface.external.pipe(socket);

process.stdin.pipe(baudotInterface.internal);
baudotInterface.internal.pipe(process.stdout);

socket.connect({port:4000});
baudotInterface.call(0);

baudotInterface.on('end', ()=>{
	socket.end();
	process.exit();
});
