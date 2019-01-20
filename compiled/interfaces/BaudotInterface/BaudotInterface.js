"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const baudot_1 = require("../../util/baudot");
const util = require("util"); // TODO remove?
const Interface_1 = require("../Interface");
const ChunkPackages_1 = require("../../util/ChunkPackages");
const BaudotToAscii_1 = require("./BaudotToAscii");
const AsciiToBaudot_1 = require("./AsciiToBaudot");
const PackageBaudotData_1 = require("./PackageBaudotData");
const config_1 = require("../../config");
const logging_1 = require("../../util/logging");
const logDebugDefault = config_1.LOGBAUDOTINTERFACE;
function byteSize(value) {
    return Math.ceil(Math.log((value || 1) + 1) / Math.log(0x100));
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
    constructor(logger, name, logDebug) {
        super();
        this.version = 1;
        this.pulseRate = 3.5 * 1000;
        this.asciifier = new BaudotToAscii_1.default();
        this.baudotifier = new AsciiToBaudot_1.default();
        this.packager = new PackageBaudotData_1.default();
        this.chunker = new ChunkPackages_1.default();
        this.writeBuffer = Buffer.alloc(0);
        this.wasDrained = true;
        this.accepted = false;
        this.initialized = false;
        this.bytesAcknowleged = 0;
        this.bytesSent = 0;
        this.bytesRecieved = 0;
        this.ended = false;
        this.baudotTimeout = setTimeout(() => this.onTimeout(), 30 * 1000);
        this.pulse = setInterval(() => this.sendHeatbeat(), this.pulseRate);
        this.name = '?';
        this.logger = console;
        this.logDebug = logDebugDefault;
        let fullName;
        if (name) {
            if (name instanceof Array) {
                switch (name.length) {
                    case 0:
                        break;
                    case 1:
                        name[0] = name[0].padEnd(10);
                        break;
                    default:
                        name[1] = name[1].padStart(10);
                }
                fullName = name.join('');
            }
            else {
                fullName = name;
            }
        }
        if (fullName)
            this.name = fullName;
        if (logger)
            this.logger = logger;
        if (logDebug !== undefined)
            this.logDebug = logDebug;
        this.asciifier.on('modeChange', (mode) => {
            // this.debug(inspect`asciifier modeChange to ${symbolName(mode)}`);
            this.baudotifier.setMode(mode);
        });
        this.baudotifier.on('modeChange', (mode) => {
            // this.debug(inspect`baudotifier modeChange to ${symbolName(mode)}`);
            this.asciifier.setMode(mode);
        });
        this.baudotifier.on("data", (data) => {
            this.writeBuffer = Buffer.concat([this.writeBuffer, data]);
            this.sendBuffered();
        });
        this.packager.pipe(this._external);
        this._external.pipe(this.chunker);
        this.asciifier.pipe(this._internal);
        this.chunker.on('data', (data) => {
            this.debug(`recieved data: ${util.inspect(data)}`, 3);
            this.baudotDataListener(data);
        });
        this._internal.on("data", data => this.write(data.toString()));
        this._external.on('end', () => {
            this.debug("outside ended");
            this.end(); // disallow reconnection
        });
        this._external.on("close", () => logger.log("_outside closed"));
        this._internal.on("close", () => logger.log("_inside closed"));
        this.external.on("close", () => logger.log("outside closed"));
        this.internal.on("close", () => logger.log("inside closed"));
        this.printDebugString();
    }
    get bytesUnacknowleged() {
        return this.bytesSent - this.bytesAcknowleged + (this.bytesSent < this.bytesAcknowleged ? 256 : 0);
    }
    get bytesSendable() {
        let sendable = 254 - this.bytesUnacknowleged;
        return sendable < 0 ? 0 : sendable;
    }
    debug(text, verbosity = 2) {
        if (verbosity <= this.logDebug) {
            this.logger.log(`BaudotInterface ${this.name.padStart(14)}: ` + text);
        }
    }
    printDebugString() {
        function getColor(value, colors) {
            let color;
            if (colors[2]) {
                color = colors[2];
            }
            else if (value) {
                color = colors[1];
            }
            else {
                color = colors[0];
            }
            return color;
        }
        const values = {
            sent: this.bytesSent,
            acknowleged: this.bytesAcknowleged,
            unacknowleged: this.bytesUnacknowleged,
            buffered: this.writeBuffer.length,
            sendable: this.bytesSendable,
            initialized: this.initialized,
            drained: this.drained,
            ended: this.ended,
        };
        const colors = {
            drained: ['\x1b[31m', '\x1b[32m'],
            initialized: ['\x1b[31m', '\x1b[32m'],
            sendable: ['\x1b[31m', '\x1b[32m'],
            acknowleged: ['\x1b[32m', '\x1b[32m'],
            sent: ['\x1b[32m', '\x1b[32m'],
        };
        let pairs = [];
        let overwrite = this.bytesSent !== this.bytesAcknowleged;
        for (let key in values) {
            let value = values[key];
            let overwriteable = false;
            if (~["sent", "acknowleged"].indexOf(key))
                overwriteable = true;
            let currentColors = colors[key] || ['\x1b[32m', '\x1b[31m'];
            if (overwriteable && overwrite)
                currentColors[2] = "\x1b[31m";
            let padding = 0;
            if (key === 'buffered') {
                padding = 5;
            }
            else {
                switch (typeof value) {
                    case 'boolean':
                        padding = 5;
                        break;
                    case 'number':
                        padding = 3;
                        break;
                }
            }
            value = getColor(value, currentColors) + value.toString().padStart(padding) + '\x1b[0m';
            pairs.push([key, value]);
        }
        this.debug(pairs.map(([key, value]) => `${key}: ${value}`).join(' │ '), 1);
    }
    get drained() {
        return this.isDrained();
    }
    isDrained() {
        const drained = this.bytesUnacknowleged === 0 && this.writeBuffer.length === 0;
        if (drained) {
            if (!this.wasDrained) {
                this.debug(logging_1.inspect `drained`);
                this.emit("drain");
                this.wasDrained = true;
            }
        }
        else {
            if (this.wasDrained) {
                this.debug(logging_1.inspect `undrained`);
                this.wasDrained = false;
            }
        }
        return drained;
    }
    resetTimeout() {
        this.debug(logging_1.inspect `resetTimeout`);
        clearTimeout(this.baudotTimeout);
        this.baudotTimeout = setTimeout(() => this.onTimeout(), 30 * 1000);
    }
    onTimeout() {
        this.debug("onTimeout");
        this.emit("timeout");
        this.end(true);
    }
    sendEnd() {
        this.debug(logging_1.inspect `sendEnd`);
        this._external.write(Buffer.from([3, 0]));
    }
    sendReject(reason) {
        this.debug(logging_1.inspect `sendReject`);
        let size = reason.length > 20 ? 20 : reason.length;
        let buffer = Buffer.alloc(size);
        buffer[0] = 4;
        buffer[1] = size;
        buffer.write(reason, 2);
        this._external.write(buffer);
    }
    sendDirectDial(extension) {
        this.debug(logging_1.inspect `sendDirectDial extension: ${extension}`);
        if (extension < 110 && extension >= 0)
            this._external.write(Buffer.from([1, 1, extension]));
    }
    sendHeatbeat() {
        this.debug(logging_1.inspect `sendHeatbeat`);
        this.printDebugString();
        this._external.write(Buffer.from([0, 0]));
    }
    sendAcknowledge(nBytes) {
        this.debug(logging_1.inspect `sendAcknowledge ${nBytes}`);
        this._external.write(Buffer.from([6, 1, nBytes]));
    }
    sendVersion(value) {
        this.debug(logging_1.inspect `sendVersion version: ${value}`);
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
        this.debug(logging_1.inspect `sendString string: ${string.length} ${util.inspect(string)}`);
        this.baudotifier.write(string, () => {
            this.sendBuffered();
        });
    }
    sendBuffered() {
        this.printDebugString();
        if (!this.initialized)
            return;
        if (this.writeBuffer.length > 0 && this.bytesSendable > 0) {
            const data = this.writeBuffer.slice(0, this.bytesSendable);
            this.writeBuffer = this.writeBuffer.slice(this.bytesSendable);
            this.packager.write(data);
            // this.debug(inspect`sent ${data.length} bytes`);
            this.bytesSent = (this.bytesSent + data.length) % 0x100;
            this.isDrained(); // update drainage status
            this.emit("send", data);
        }
    }
    baudotDataListener([type, , ...data]) {
        this.resetTimeout();
        // logger.log(type, data);
        switch (type) {
            case 0:
                this.debug(logging_1.inspect `Heartbeat`);
                this.emit("ack", null);
                if (!this.initialized) {
                    this.initialized = true;
                    this.sendBuffered();
                }
                break;
            case 1:
                this.debug(logging_1.inspect `Direct dial ${data[0]}`);
                this.emit("call", data[0]);
                this.initialized = true;
                break;
            case 2:
                this.debug(logging_1.inspect `Baudot data ${data.length} bytes`);
                this.asciifier.write(Buffer.from(data));
                this.bytesRecieved = (this.bytesRecieved + data.length) % 0x100;
                this.sendAcknowledge(this.bytesRecieved);
                if (!this.accepted) {
                    this.accepted = true;
                    this.emit('accept');
                }
                break;
            case 3:
                this.debug(logging_1.inspect `End`);
                this.emit('request end');
                this.end();
                break;
            case 4:
                this.debug(logging_1.inspect `Reject ${Buffer.from(data).toString()}`);
                this.emit("reject", Buffer.from(data).toString());
                this.emit('request end');
                this.end();
                break;
            case 6:
                this.debug(logging_1.inspect `Acknowledge ${data[0]}`);
                this.emit("ack", data[0]);
                this.bytesAcknowleged = data[0];
                if (this.bytesUnacknowleged === 0) {
                    this.initialized = true;
                }
                this.sendBuffered();
                this.isDrained(); // update drainage status
                break;
            case 7:
                this.debug(logging_1.inspect `Version ${data[0]} ${Buffer.from(data).readNullTermString(void (0), 1)}`);
                if (data[0] !== this.version)
                    this.sendVersion(this.version);
                break;
            case 8:
                this.debug(logging_1.inspect `Self test ${data.map(x => x.toString(16).padStart(2, '0'))}`);
                break;
            case 9:
                this.debug(logging_1.inspect `Remote config`);
                break;
            default:
                this.debug(logging_1.inspect `unknown package type: ${type} data: ${data}`);
        }
    }
    actuallyEnd(endTimeout) {
        this.debug(logging_1.inspect `ending baudotinterface`);
        this.ended = true;
        clearTimeout(endTimeout);
        clearTimeout(this.baudotTimeout);
        clearInterval(this.pulse);
        this.destroy();
        this.printDebugString();
        this.emit("end");
    }
    end(force = false) {
        if (this.ended) {
            this.debug(logging_1.inspect `already ended`);
            return;
        }
        this.debug(logging_1.inspect `end`);
        try {
            this.sendEnd();
        }
        catch (err) {
            try {
                // close the connection if sending the
                // end package fails
                this.actuallyEnd();
            }
            catch (err) { /**/ }
            return;
        }
        let endTimeout;
        if (this.isDrained()) {
            this.actuallyEnd(endTimeout);
        }
        else {
            this.debug(logging_1.inspect `not ending baudotinterface, because it is not drained yet.`);
            this.once('drain', () => {
                this.actuallyEnd(endTimeout);
            });
            endTimeout = setTimeout(this.actuallyEnd, 10 * 1000);
        }
    }
}
exports.default = BaudotInterface;
