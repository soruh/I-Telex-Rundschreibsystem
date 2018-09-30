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
const net = require("net");
class MultiPortServer {
    constructor(callback, ports) {
        this.applyPreListen = [];
        this.servers = new Map();
        this.callback = callback;
        this.target = new Set(ports ? ports : null);
        this.updateRunning();
    }
    updateRunning() {
        let changes = {};
        for (let port of this.target) {
            changes[port] = {
                started: null,
                running: null,
                terminated: false,
            };
            if (this.servers.has(port)) {
                changes[port].started = false;
                changes[port].running = true;
            }
            else {
                changes[port].started = true;
                let server = new net.Server(socket => this.callback(socket, port));
                for (let callback of this.applyPreListen)
                    callback(server, port);
                try {
                    server.listen(port);
                    changes[port].running = true;
                }
                catch (e) {
                    changes[port].running = false;
                }
                this.servers.set(port, server);
            }
        }
        for (let [port, server] of this.servers) {
            if (!this.target.has(port)) {
                server.close();
                this.servers.delete(port);
                changes[port] = {
                    started: false,
                    running: false,
                    terminated: true,
                };
            }
        }
        return this; // chaining
        // return changes; //more information
    }
    addFreePort() {
        return new Promise((resolve, reject) => {
            let port = null;
            let server = new net.Server(socket => this.callback(socket, port));
            server.listen(0, () => {
                port = server.address().port;
                for (let callback of this.applyPreListen)
                    callback(server, port);
                this.target.add(port);
                this.servers.set(port, server);
                resolve(port);
            });
        });
    }
    listen(port) {
        return this.addPort(port);
    }
    addPorts(ports) {
        for (let port of ports)
            this.target.add(port);
        return this.updateRunning();
    }
    addPort(port) {
        this.target.add(port);
        return this.updateRunning();
    }
    removePorts(ports) {
        if (!(ports instanceof Array))
            ports = [ports];
        for (let port of ports) {
            if (this.target.has(port))
                this.target.delete(port);
        }
        return this.updateRunning();
    }
    listPorts() {
        return Array.from(this.target.keys());
    }
    getServerByPort(port) {
        return this.servers.get(port);
    }
    assignHandler(applier, applyBeforeListen = true) {
        if (applyBeforeListen)
            this.applyPreListen.push(applier);
        for (let [port, server] of this.servers) {
            applier(server, port);
        }
        return this;
    }
}
exports.default = MultiPortServer;
/*
let server = new multiPortServer((connection, port)=>{
    logger.log("new connection on port "+port+" from port "+connection.remotePort);
    connection.on("data",data=>logger.log(data.toString()));
}).assignHandler((server,port)=>{
    server.on("error",function onError(err){
        logger.log("error:",err)
    });
});
logger.log(server.addPorts([10000,10001,10001,10002])); //listen on ports 10000, 10001 and 10002
logger.log(server.addPorts([10003,10004,10005,10006])); //listen on ports 10003, 10004, 10005 and 10006
setTimeout(()=>
    logger.log(server.removePorts(server.listPorts().filter(v=>v%2==1))) //remove listeners on all odd ports
,1000);
*/
