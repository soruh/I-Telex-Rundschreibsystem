"use strict";
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const ip = require("ip");
const net = require("net");
const ChunkPackages_1 = require("./ChunkPackages");
//#endregion
const constants = {
    PackageNames: {
        1: "Client_update",
        2: "Address_confirm",
        3: "Peer_query",
        4: "Peer_not_found",
        5: "Peer_reply",
        6: "Sync_FullQuery",
        7: "Sync_Login",
        8: "Acknowledge",
        9: "End_of_List",
        10: "Peer_search",
        255: "Error",
    },
    PackageSizes: {
        1: 8,
        2: 4,
        3: 5,
        4: 0,
        5: 100,
        6: 5,
        7: 5,
        8: 0,
        9: 0,
        10: 41,
    },
    states: {
        STANDBY: Symbol("STANDBY"),
        RESPONDING: Symbol("RESPONDING"),
        FULLQUERY: Symbol("FULLQUERY"),
        LOGIN: Symbol("LOGIN"),
    },
};
function normalizeIp(ipAddr) {
    if (ip.isV4Format(ipAddr)) {
        return ipAddr;
    }
    else if (ip.isV6Format(ipAddr)) {
        let buffer = ip.toBuffer(ipAddr);
        for (let i = 0; i < 10; i++)
            if (buffer[i] !== 0)
                return ipAddr;
        for (let i = 10; i < 12; i++)
            if (buffer[i] !== 255)
                return ipAddr;
        let ipv4 = ip.toString(buffer, 12, 4);
        if (net.isIPv4(ipv4)) {
            return ipv4;
        }
        else {
            return ipAddr;
        }
    }
    else {
        return '0.0.0.0';
    }
}
Buffer.prototype.readNullTermString =
    function readNullTermString(encoding = "utf8", start = 0, end = this.length) {
        let firstZero = this.indexOf(0, start);
        let stop = firstZero >= start && firstZero <= end ? firstZero : end;
        return this.toString(encoding, start, stop);
    };
// function highlightBuffer(buffer:Buffer,from:number=0,length:number=0){
// 	let array = Array.from(buffer).map(x=>(x<16?"0":"")+x.toString(16));
// 	if(from in array&&length>0){
// 		array[from] = "\x1b[046m"+"\x1b[030m"+array[from];
// 		array[from+length-1] += "\x1b[000m";
// 	}	
// 	return "<Buffer "+array.join(" ")+">\x1b[000m"
// }
// function explainData(data: Buffer): string {
// 	let str = "<Buffer";
// 	var type: number;
// 	var datalength: number;
// 	for (let typepos = 0; typepos < data.length - 1; typepos += datalength + 2) {
// 		type = +data[typepos];
// 		datalength = +data[typepos + 1];
// 		let array = Array.from(data.slice(typepos, typepos + datalength + 2)).map(x => (x < 16 ? "0" : "")+x.toString(16));
// 		array = array.map((value, index) =>
// 			index == 0 ?
// 			"\x1b[036m" + value + "\x1b[000m" :
// 			index == 1 ?
// 			"\x1b[032m" + value + "\x1b[000m" :
// 			"\x1b[000m" + value + "\x1b[000m"
// 		);
// 		str += " " + array.join(" ");
// 	}
// 	str += ">";
// 	return str;
// }
function encPackage(pkg) {
    // logger.log(inspect`encoding package : ${pkg}`);
    if (pkg.datalength == null) {
        if (pkg.type === 255) {
            if (pkg.data.message != null)
                pkg.datalength = pkg.data.message.length;
        }
        else {
            pkg.datalength = constants.PackageSizes[pkg.type];
        }
    }
    let buffer = Buffer.alloc(pkg.datalength + 2);
    buffer[0] = pkg.type;
    buffer[1] = pkg.datalength;
    switch (pkg.type) {
        case 1:
            buffer.writeUIntLE(pkg.data.number || 0, 2, 4);
            buffer.writeUIntLE(+pkg.data.pin || 0, 6, 2);
            buffer.writeUIntLE(+pkg.data.port || 0, 8, 2);
            break;
        case 2: {
            let normalizedIp = normalizeIp(pkg.data.ipaddress);
            if (ip.isV4Format(normalizedIp))
                ip.toBuffer(normalizedIp, buffer, 2);
            break;
        }
        case 3:
            buffer.writeUIntLE(pkg.data.number || 0, 2, 4);
            buffer.writeUIntLE(pkg.data.version || 0, 6, 1);
            break;
        case 4:
            break;
        case 5: {
            let flags = pkg.data.disabled ? 2 : 0;
            let ext = 0;
            if (!pkg.data.extension) {
                ext = 0;
            }
            else if (pkg.data.extension === "0") {
                ext = 110;
            }
            else if (pkg.data.extension === "00") {
                ext = 100;
            }
            else if (pkg.data.extension.toString().length === 1) {
                ext = parseInt(pkg.data.extension) + 100;
            }
            else {
                ext = parseInt(pkg.data.extension);
            }
            buffer.writeUIntLE(pkg.data.number || 0, 2, 4);
            buffer.write(pkg.data.name || "", 6, 40);
            buffer.writeUIntLE(flags || 0, 46, 2);
            buffer.writeUIntLE(pkg.data.type || 0, 48, 1);
            buffer.write(pkg.data.hostname || "", 49, 40);
            let normalizedIp = normalizeIp(pkg.data.ipaddress);
            if (ip.isV4Format(normalizedIp))
                ip.toBuffer(normalizedIp, buffer, 89);
            buffer.writeUIntLE(+pkg.data.port || 0, 93, 2);
            buffer.writeUIntLE(ext || 0, 95, 1);
            buffer.writeUIntLE(+pkg.data.pin || 0, 96, 2);
            buffer.writeUIntLE((+pkg.data.timestamp || 0) + 2208988800, 98, 4);
            break;
        }
        case 6:
            buffer.writeUIntLE(pkg.data.version || 0, 2, 1);
            buffer.writeUIntLE(pkg.data.serverpin || 0, 3, 4);
            break;
        case 7:
            buffer.writeUIntLE(pkg.data.version || 0, 2, 1);
            buffer.writeUIntLE(pkg.data.serverpin || 0, 3, 4);
            break;
        case 8:
            break;
        case 9:
            break;
        case 10:
            buffer.writeUIntLE(pkg.data.version || 0, 2, 1);
            buffer.write(pkg.data.pattern || "", 3, 40);
            break;
        case 255:
            buffer.write(pkg.data.message || "", 2, pkg.datalength);
            break;
    }
    // logger.log(inspect`encoded: ${buffer}`);
    return buffer;
}
exports.encPackage = encPackage;
function decPackage(buffer) {
    let pkg = {
        type: buffer[0],
        datalength: buffer[1],
        data: null,
    };
    // logger.log(inspect`decoding package: ${buffer}`);
    switch (pkg.type) {
        case 1:
            pkg.data = {
                number: buffer.readUIntLE(2, 4),
                pin: buffer.readUIntLE(6, 2).toString(),
                port: buffer.readUIntLE(8, 2).toString(),
            };
            break;
        case 2:
            pkg.data = {
                ipaddress: ip.toString(buffer, 2, 4),
            };
            if (pkg.data.ipaddress === "0.0.0.0")
                pkg.data.ipaddress = "";
            break;
        case 3:
            pkg.data = {
                number: buffer.readUIntLE(2, 4),
                version: buffer.slice(6, 7).length > 0 ? buffer.readUIntLE(6, 1) : 1,
            };
            break;
        case 4:
            pkg.data = {};
            break;
        case 5:
            let flags = buffer.readUIntLE(46, 2);
            // <Call-number 4b> 0,4
            // <Name 40b> 		4,44
            // <Flags 2b>		44,46
            // <Type 1b>		46,47
            // <Addr 40b>		47,87
            // <IPAdr 4b>		87,91
            // <Port 2b>		91,93
            // <Extension 1b>	93,94
            // <DynPin 2b>		94,96
            // <Date 4b>		96,100
            pkg.data = {
                number: buffer.readUIntLE(2, 4),
                name: buffer.readNullTermString("utf8", 6, 46),
                disabled: (flags & 2) === 2 ? 1 : 0,
                type: buffer.readUIntLE(48, 1),
                hostname: buffer.readNullTermString("utf8", 49, 89),
                ipaddress: ip.toString(buffer, 89, 4),
                port: buffer.readUIntLE(93, 2).toString(),
                pin: buffer.readUIntLE(96, 2).toString(),
                timestamp: buffer.readUIntLE(98, 4) - 2208988800,
                extension: null,
            };
            if (pkg.data.ipaddress === "0.0.0.0")
                pkg.data.ipaddress = "";
            if (pkg.data.hostname === "")
                pkg.data.hostname = "";
            let extension = buffer.readUIntLE(95, 1);
            if (extension === 0) {
                pkg.data.extension = null;
            }
            else if (extension === 110) {
                pkg.data.extension = "0";
            }
            else if (extension === 100) {
                pkg.data.extension = "00";
            }
            else if (extension > 110) {
                pkg.data.extension = null;
            }
            else if (extension > 100) {
                pkg.data.extension = (extension - 100).toString();
            }
            else if (extension < 10) {
                pkg.data.extension = "0" + extension;
            }
            else {
                pkg.data.extension = extension.toString();
            }
            break;
        case 6:
            pkg.data = {
                version: buffer.readUIntLE(2, 1),
                serverpin: buffer.readUIntLE(3, 4),
            };
            break;
        case 7:
            pkg.data = {
                version: buffer.readUIntLE(2, 1),
                serverpin: buffer.readUIntLE(3, 4),
            };
            break;
        case 8:
            pkg.data = {};
            break;
        case 9:
            pkg.data = {};
            break;
        case 10:
            pkg.data = {
                version: buffer.readUIntLE(2, 1),
                pattern: buffer.readNullTermString("utf8", 3, 43),
            };
            break;
        case 255:
            pkg.data = {
                message: buffer.readNullTermString("utf8", 2),
            };
            break;
        default:
            // logger.log(inspect`recieved a package of invalid/unsupported type: ${(<any>pkg).type}`);
            return null;
    }
    return pkg;
}
exports.decPackage = decPackage;
function decPackages(buffer) {
    if (!(buffer instanceof Buffer))
        buffer = Buffer.from(buffer);
    // logger.log(inspect`decoding data: ${buffer}`);
    let out = [];
    let type;
    let datalength;
    for (let typepos = 0; typepos < buffer.length - 1; typepos += datalength + 2) {
        type = +buffer[typepos];
        datalength = +buffer[typepos + 1];
        if (type in constants.PackageSizes && constants.PackageSizes[type] !== datalength) {
            // logger.log(inspect`size missmatch: ${constants.PackageSizes[type]} != ${datalength}`);
            if (true) {
                // logger.log(inspect`using package of invalid size!`);
            }
            else {
                // logger.log( inspect`ignoring package, because it is of invalid size!`);
                continue;
            }
        }
        let pkg = decPackage(buffer.slice(typepos, typepos + datalength + 2));
        if (pkg)
            out.push(pkg);
    }
    // logger.log(inspect`decoded: ${out}`);
    return out;
}
exports.decPackages = decPackages;
const TlnServer = { host: "telexgateway.de", port: 11811 };
function peerQuery(number) {
    return new Promise((resolve, reject) => {
        let socket = new net.Socket();
        let chunker = new ChunkPackages_1.default();
        socket.pipe(chunker);
        socket.on('timeout', () => {
            reject(new Error('server timed out'));
        });
        socket.on('close', () => {
            reject(new Error('connection to server was closed'));
        });
        chunker.once('data', (data) => {
            socket.end();
            let pkg = decPackage(data);
            if (!pkg) {
                reject(new Error('no server result'));
                return;
            }
            if (pkg.type === 5) {
                resolve(pkg.data);
            }
            else if (pkg.type === 4) {
                resolve(null);
            }
            else {
                reject(new Error('invalid server result'));
            }
        });
        socket.connect(TlnServer, () => {
            socket.setTimeout(10 * 1000);
            try {
                socket.write(encPackage({
                    type: 3,
                    data: {
                        number,
                        version: 1,
                    },
                }));
            }
            catch (err) {
                reject(err);
            }
        });
    });
}
exports.peerQuery = peerQuery;
function fullQuery(serverpin) {
    return new Promise((resolve, reject) => {
        let results = [];
        let request;
        if (serverpin) {
            request = encPackage({
                type: 6,
                data: {
                    serverpin,
                    version: 1,
                },
            });
        }
        else {
            request = encPackage({
                type: 10,
                data: {
                    pattern: '',
                    version: 1,
                },
            });
        }
        let ack = encPackage({ type: 8 });
        let socket = new net.Socket();
        let chunker = new ChunkPackages_1.default();
        socket.pipe(chunker);
        socket.on('timeout', () => {
            reject(new Error('server timed out'));
        });
        socket.on('close', () => {
            reject(new Error('connection to server was closed'));
        });
        chunker.on('data', (data) => {
            let pkg = decPackage(data);
            if (!pkg) {
                return reject(new Error('no server result'));
            }
            if (pkg.type === 5) {
                results.push(pkg.data);
                socket.write(ack);
            }
            else if (pkg.type === 9) {
                socket.end();
                resolve(results);
            }
            else {
                socket.end();
                reject(new Error('invalid server result'));
            }
        });
        socket.connect(TlnServer, () => {
            socket.setTimeout(10 * 1000);
            socket.write(request);
        });
    });
}
exports.fullQuery = fullQuery;
function dynIpUpdate(number, pin, port) {
    return new Promise((resolve, reject) => {
        let socket = new net.Socket();
        let chunker = new ChunkPackages_1.default();
        socket.pipe(chunker);
        socket.on('timeout', () => {
            reject(new Error('server timed out'));
        });
        socket.on('close', () => {
            reject(new Error('connection to server was closed'));
        });
        chunker.once('data', (data) => {
            socket.end();
            let pkg = decPackage(data);
            if (!pkg) {
                return reject(new Error('no server result'));
            }
            if (pkg.type === 2) {
                resolve(pkg.data.ipaddress);
            }
            else {
                reject(new Error('invalid server result'));
            }
        });
        socket.connect(TlnServer, () => {
            socket.setTimeout(10 * 1000);
            socket.write(encPackage({
                type: 1,
                data: {
                    number,
                    pin: pin.toString(),
                    port: port.toString(),
                },
            }));
        });
    });
}
exports.dynIpUpdate = dynIpUpdate;
//#endregion
