"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
if (module.parent != null) {
    let mod = module;
    let loadOrder = [mod.filename.split("/").slice(-1)[0]];
    while (mod.parent) {
        mod = mod.parent;
        loadOrder.push(mod.filename.split("/").slice(-1)[0]);
    }
    loadOrder = loadOrder.map((name, index) => { let color = "\x1b[33m"; if (index == 0)
        color = "\x1b[32m"; if (index == loadOrder.length - 1)
        color = "\x1b[36m"; return (`${color}${name}\x1b[0m`); }).reverse();
    console.log(loadOrder.join(" → "));
}
const readline = require("readline");
const net = require("net");
const UI_1 = require("./ui/UI");
const UIConfig_1 = require("./ui/UIConfig");
const logging_1 = require("./util/logging");
const BaudotInterface_1 = require("./interfaces/BaudotInterface/BaudotInterface");
Buffer.prototype.readNullTermString =
    function readNullTermString(encoding = "utf8", start = 0, end = this.length) {
        let firstZero = this.indexOf(0, start);
        let stop = firstZero >= start && firstZero <= end ? firstZero : end;
        return this.toString(encoding, start, stop);
    };
const server = new net.Server();
server.on('connection', socket => {
    // const interFace = new AsciiInterface(false);
    const interFace = new BaudotInterface_1.default();
    socket.pipe(interFace.external);
    interFace.external.pipe(socket);
    interFace.on('end', () => {
        socket.end();
    });
    // interFace.on('timeout', (ext:number)=>{
    // });
    const rl = readline.createInterface({
        input: interFace.internal,
        output: interFace.internal,
    });
    const ui = new UI_1.default(UIConfig_1.default, "call");
    const client = {
        interface: interFace,
        socket,
    };
    // ui.start(rl, client); // for ascii interface
    interFace.on('call', (ext) => {
        ui.start(rl, client);
        logging_1.logger.log(logging_1.inspect `calling extension: ${ext}`);
    });
});
server.listen(4000);
