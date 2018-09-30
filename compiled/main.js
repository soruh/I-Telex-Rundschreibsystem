"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readline = require("readline");
const net = require("net");
const UI_1 = require("./ui/UI");
const UIConfig_1 = require("./ui/UIConfig");
// const rl = readline.createInterface({
// 	input:process.stdin,
// 	output:process.stdout,
// });
// let ui = new UI(uiConfig, "start");
// ui.start(rl);
// rl.question('What do you think of Node.js? ', answer=>{
// 	// TODO: Log the answer in a database
// 	console.log(`Thank you for your valuable feedback: ${answer}`);
// 	rl.close();
// });
const server = new net.Server();
server.on('connection', socket => {
    /*
        const interFace = new BaudotInterface();
    
        socket.pipe(interFace.external);
        interFace.external.pipe(socket);
    
        interFace.on('end',()=>{
            socket.end();
        });
    
        interFace.on('call', (ext:number)=>{
            logger.log(inspect`calling extension: ${ext}`);
        });
    
        // interFace.on('timeout', (ext:number)=>{
            
        // });
    */
    const rl = readline.createInterface({
        input: socket,
        output: socket,
        crlfDelay: 500,
    });
    rl.on('close', () => {
        socket.end();
    });
    let ui = new UI_1.default(UIConfig_1.default, "start");
    ui.start(rl);
});
server.listen(4000);
