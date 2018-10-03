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
const baudot_1 = require("../../util/baudot");
const util = require("util"); // TODO remove?
const logging_1 = require("../../util/logging");
const Interface_1 = require("../Interface");
const ChunkPackages_1 = require("../../util/ChunkPackages");
const BaudotToAscii_1 = require("./BaudotToAscii");
const AsciiToBaudot_1 = require("./AsciiToBaudot");
const PackageBaudotData_1 = require("./PackageBaudotData");
const config_1 = require("../../config");
const logDebug = config_1.LOGBAUDOTINTERFACE;
function byteSize(value) {
    return Math.ceil(Math.log((value || 1) + 1) / Math.log(0x100));
}
function symbolName(s) {
    if (s && typeof s.toString === "function") {
        return /Symbol\((.*)\)/.exec(s.toString())[1];
    }
    else {
        return "NULL";
    }
}
function encodeExt(ext) {
    if (!ext) {
        return 0;
    }
    else if (ext === "0") {
        return 110;
    }
    else if (ext === "00") {
        return 100;
    }
    else if (ext.length === 1) {
        return parseInt(ext) + 100;
    }
    else {
        return parseInt(ext) || 0;
    }
}
class BaudotInterface extends Interface_1.default {
    constructor() {
        super();
        this.version = 1;
        this.pulseRate = 3.5 * 1000;
        this.asciifier = new BaudotToAscii_1.default();
        this.baudotifier = new AsciiToBaudot_1.default();
        this.packager = new PackageBaudotData_1.default();
        this.chunker = new ChunkPackages_1.default();
        this.writeBuffer = Buffer.alloc(0);
        this.drained = true;
        this.accepted = false;
        this.bytesAcknowleged = 0;
        this.bytesSent = 0;
        this.bytesRecieved = 0;
        this.baudotTimeout = setTimeout(() => this.onTimeout(), 30 * 1000);
        this.pulse = setInterval(() => this.sendHeatbeat(), this.pulseRate);
        this.asciifier.on('modeChange', (mode) => {
            if (logDebug)
                logging_1.logger.log(logging_1.inspect `asciifier modeChange to ${symbolName(mode)}`);
            this.baudotifier.setMode(mode);
        });
        this.baudotifier.on('modeChange', (mode) => {
            if (logDebug)
                logging_1.logger.log(logging_1.inspect `baudotifier modeChange to ${symbolName(mode)}`);
            this.asciifier.setMode(mode);
        });
        this.baudotifier.on("data", (data) => {
            this.writeBuffer = Buffer.concat([this.writeBuffer, data]);
            this.sendBuffered();
        });
        this.packager.pipe(this._external);
        this._external.pipe(this.chunker);
        this.asciifier.pipe(this._internal);
        this.chunker.on('data', (data) => this.baudotDataListener(data));
        this._internal.on("data", data => this.write(data.toString()));
        this._external.on('end', () => {
            if (logDebug)
                logging_1.logger.log("outside ended");
            this.end(); // disallow reconnection
        });
        this._external.on("close", () => logging_1.logger.log("_outside closed"));
        this._internal.on("close", () => logging_1.logger.log("_inside closed"));
        this.external.on("close", () => logging_1.logger.log("outside closed"));
        this.internal.on("close", () => logging_1.logger.log("inside closed"));
    }
    get bytesUnacknowleged() {
        return this.bytesSent - this.bytesAcknowleged + (this.bytesSent < this.bytesAcknowleged ? 256 : 0);
    }
    get bytesSendable() {
        let sendable = 254 - this.bytesUnacknowleged;
        return sendable < 0 ? 0 : sendable;
    }
    resetTimeout() {
        if (logDebug)
            logging_1.logger.log("resetTimeout");
        clearTimeout(this.baudotTimeout);
        this.baudotTimeout = setTimeout(() => this.onTimeout(), 30 * 1000);
    }
    onTimeout() {
        if (logDebug)
            logging_1.logger.log("onTimeout");
        this.emit("timeout");
        this.sendEnd();
        this.end();
    }
    sendEnd() {
        if (logDebug)
            logging_1.logger.log(logging_1.inspect `sendEnd`);
        this._external.write(Buffer.from([3, 0]));
    }
    sendReject(reason) {
        if (logDebug)
            logging_1.logger.log(logging_1.inspect `sendReject`);
        let size = reason.length > 20 ? 20 : reason.length;
        let buffer = Buffer.alloc(size);
        buffer[0] = 4;
        buffer[1] = size;
        buffer.write(reason, 2);
        this._external.write(buffer);
    }
    sendDirectDial(extension) {
        if (logDebug)
            logging_1.logger.log(logging_1.inspect `sendDirectDial extension:${extension}`);
        if (extension < 110 && extension >= 0)
            this._external.write(Buffer.from([1, 1, extension]));
    }
    sendHeatbeat() {
        if (logDebug)
            logging_1.logger.log(logging_1.inspect `sendHeatbeat`);
        this._external.write(Buffer.from([0, 0]));
    }
    sendAcknowledge(nBytes) {
        if (logDebug)
            logging_1.logger.log(logging_1.inspect `sendAcknowledge ${nBytes}`);
        this._external.write(Buffer.from([6, 1, nBytes]));
    }
    sendVersion(value) {
        if (logDebug)
            logging_1.logger.log(logging_1.inspect `sendVersion version: ${value}`);
        this._external.write(Buffer.from([7, byteSize(value), value]));
    }
    accept() {
        this._external.write(Buffer.from([2, 5, baudot_1.changeModeBu, baudot_1.changeModeBu, baudot_1.changeModeBu, baudot_1.changeModeBu, baudot_1.changeModeBu]));
        this.bytesSent += 5;
        this.baudotifier.setMode(baudot_1.baudotModeBu);
    }
    call(extension) {
        this.sendVersion(this.version);
        this.sendDirectDial(encodeExt(extension));
    }
    write(string) {
        if (logDebug)
            logging_1.logger.log(logging_1.inspect `sendString string: ${string.length} ${util.inspect(string)}`);
        this.baudotifier.write(string);
        this.sendBuffered();
    }
    sendBuffered() {
        // tslint:disable-next-line:max-line-length
        if (logDebug)
            logging_1.logger.log(logging_1.inspect `sendBuffered bytesSent: ${this.bytesSent} bytesAcknowleged: ${this.bytesAcknowleged} bytesUnacknowleged: ${this.bytesUnacknowleged} buffered: ${this.writeBuffer.length} sendable: ${this.bytesSendable}`);
        if (this.writeBuffer.length > 0 && this.bytesSendable > 0) {
            let data = this.writeBuffer.slice(0, this.bytesSendable);
            this.writeBuffer = this.writeBuffer.slice(this.bytesSendable);
            this.packager.write(data);
            // if(logDebug)  logger.log(inspect`sent ${data.length} bytes`);
            this.bytesSent = (this.bytesSent + data.length) % 0x100;
            this.drained = false;
            this.emit("send", data);
        }
    }
    end() {
        clearInterval(this.pulse);
        clearTimeout(this.baudotTimeout);
        this.emit("end");
    }
    baudotDataListener([type, , ...data]) {
        this.resetTimeout();
        // logger.log(type, data);
        switch (type) {
            case 0:
                if (logDebug)
                    logging_1.logger.log(logging_1.inspect `Heartbeat`);
                // this.sendBuffered();
                break;
            case 1:
                if (logDebug)
                    logging_1.logger.log(logging_1.inspect `Direct dial ${data[0]}`);
                // this.accepted();
                this.emit("call", data[0]);
                break;
            case 2:
                if (logDebug)
                    logging_1.logger.log(logging_1.inspect `Baudot data ${data.length} bytes`);
                this.asciifier.write(Buffer.from(data));
                this.bytesRecieved = (this.bytesRecieved + data.length) % 0x100;
                this.sendAcknowledge(this.bytesRecieved);
                if (!this.accepted) {
                    this.accepted = true;
                    this.emit('accept');
                }
                break;
            case 3:
                if (logDebug)
                    logging_1.logger.log(logging_1.inspect `End`);
                this.end();
                break;
            case 4:
                if (logDebug)
                    logging_1.logger.log(logging_1.inspect `Reject ${Buffer.from(data).toString()}`);
                this.emit("reject", Buffer.from(data).toString());
                this.end();
                break;
            case 6:
                if (logDebug)
                    logging_1.logger.log(logging_1.inspect `Acknowledge ${data[0]}`);
                this.bytesAcknowleged = data[0];
                this.sendBuffered();
                if (this.bytesUnacknowleged === 0 && this.writeBuffer.length === 0 && this.drained === false) {
                    this.drained = true;
                    this.emit("drain");
                }
                break;
            case 7:
                if (logDebug)
                    logging_1.logger.log(logging_1.inspect `Version ${data[0]} ${Buffer.from(data).readNullTermString(void (0), 1)}`);
                if (data[0] !== this.version)
                    this.sendVersion(this.version);
                break;
            case 8:
                if (logDebug)
                    logging_1.logger.log(logging_1.inspect `Self test ${data.map(x => x.toString(16).padStart(2, '0'))}`);
                break;
            case 9:
                if (logDebug)
                    logging_1.logger.log(logging_1.inspect `Remote config`);
                break;
            default:
                logging_1.logger.log(logging_1.inspect `unknown package type: ${type} data: ${data}`);
        }
    }
}
exports.default = BaudotInterface;
