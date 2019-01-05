
import { baudotModeBu, changeModeBu } from "../../util/baudot";
import * as util from "util"; // TODO remove?
import Interface from "../Interface";
import ChunkPackages from "../../util/ChunkPackages";
import BaudotToAscii from "./BaudotToAscii";
import AsciiToBaudot from "./AsciiToBaudot";
import PackageBaudotData from "./PackageBaudotData";
import { LOGBAUDOTINTERFACE } from "../../config";
import { inspect } from "../../util/logging";


const logDebugDefault = LOGBAUDOTINTERFACE;

function byteSize(value){
	return Math.ceil(Math.log((value||1)+1)/Math.log(0x100));
}

function encodeExt(ext:string):number{
	if (!ext) {
		return 0;
	} else if (ext === "0") {
		return 110;
	} else if (ext === "00") {
		return 100;
	} else if (ext.length === 1) {
		return parseInt(ext) + 100;
	} else {
		return parseInt(ext)||0;
	}
}

class BaudotInterface extends Interface{
	public version = 1;
	public pulseRate  = 3.5*1000;

	public asciifier = new BaudotToAscii();
	public baudotifier = new AsciiToBaudot();
	private packager = new PackageBaudotData();
	private chunker = new ChunkPackages();

	private writeBuffer = Buffer.alloc(0);
	private wasDrained = true;

	private accepted = false;
	
	private initialized = false;

	private bytesAcknowleged = 0;
	private bytesSent = 0;
	private bytesRecieved = 0;

	public ended = false;

	private baudotTimeout = setTimeout(()=>this.onTimeout(), 30*1000);
	private pulse = setInterval(()=>this.sendHeatbeat(), this.pulseRate);

	get bytesUnacknowleged(){
		return this.bytesSent-this.bytesAcknowleged+(this.bytesSent<this.bytesAcknowleged?256:0);
	}
	get bytesSendable(){
		let sendable = 254-this.bytesUnacknowleged;
		return sendable<0?0:sendable;
	}

	public name:string = '?';
	public logger:{log:(...args:any)=>void} = console;
	public logDebug = logDebugDefault;

	constructor(logger?:{log:(...args:any)=>void}, name?:string|string[], logDebug?:number){
		super();

		let fullName:string;
		if(name){
			if(name instanceof Array){
				switch(name.length){
					case 0:
						break;
					case 1:
						name[0] = name[0].padEnd(10);
						break;
					default:
						name[1] = name[1].padStart(10);
				}

				fullName = name.join('');
			}else{
				fullName = name;
			}
		}

		if(fullName) this.name = fullName;
		if(logger) this.logger = logger;
		if(logDebug !== undefined) this.logDebug = logDebug;

		this.asciifier.on('modeChange', (mode:symbol)=>{
			// this.debug(inspect`asciifier modeChange to ${symbolName(mode)}`);
			this.baudotifier.setMode(mode);
		});
		this.baudotifier.on('modeChange', (mode:symbol)=>{
			// this.debug(inspect`baudotifier modeChange to ${symbolName(mode)}`);
			this.asciifier.setMode(mode);
		});

		this.baudotifier.on("data", (data:Buffer)=>{
			this.writeBuffer = Buffer.concat([this.writeBuffer, data]);

			this.sendBuffered();
		});
		
		
		this.packager.pipe(this._external);
		this._external.pipe(this.chunker);
		this.asciifier.pipe(this._internal);
		
		this.chunker.on('data', (data:number[])=>{
			this.debug(`recieved data: ${util.inspect(data)}`, 3);

			this.baudotDataListener(data);
		});
		this._internal.on("data", data=>this.write(data.toString()));

		this._external.on('end',()=>{
			this.debug("outside ended");
			this.end(); // disallow reconnection
		});

		this._external.on("close",()=>logger.log("_outside closed"));
		this._internal.on("close",()=>logger.log("_inside closed"));

		this.external.on("close",()=>logger.log("outside closed"));
		this.internal.on("close",()=>logger.log("inside closed"));

		this.printDebugString();
	}


	public debug(text:string, verbosity=2){
		if(verbosity <= this.logDebug){
			this.logger.log(`BaudotInterface ${this.name.padStart(14)}: `+text);
		}
	}

	public printDebugString(){
		function getColor(value:any, colors: string[]){
			let color:string;
			if(colors[2]){
				color = colors[2];
			}else if(value){
				color = colors[1];
			}else{
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

		for(let key in values){
			let value = values[key];

			let overwriteable = false;
			if(~["sent", "acknowleged"].indexOf(key)) overwriteable = true;

			let currentColors = colors[key]||['\x1b[32m', '\x1b[31m'];
			if(overwriteable&&overwrite) currentColors[2] = "\x1b[31m";


			let padding = 0;
			if(key === 'buffered'){
				padding = 5;
			}else{
				switch(typeof value){
					case 'boolean':
						padding = 5;
						break;
					case 'number':
						padding = 3;
						break;
				}
			}

			value = getColor(value, currentColors)+value.toString().padStart(padding)+'\x1b[0m';

			pairs.push([key, value]); 
		}

		this.debug(pairs.map(([key, value])=>`${key}: ${value}`).join(' │ '), 1);
	}

	get drained(){
		return this.isDrained();
	}

	public isDrained(){
		const drained = this.bytesUnacknowleged === 0&&this.writeBuffer.length === 0;
		if(drained){
			if(!this.wasDrained){
				this.debug(inspect`drained`);

				this.emit("drain");
				this.wasDrained = true;
			}
		}else{
			if(this.wasDrained){
				this.debug(inspect`undrained`);
				this.wasDrained = false;
			}
		}
		return drained;
	}

	private resetTimeout(){
		this.debug(inspect`resetTimeout`);
		clearTimeout(this.baudotTimeout);
		this.baudotTimeout = setTimeout(()=>this.onTimeout(), 30*1000);
	}
	private onTimeout(){
		this.debug("onTimeout");
		this.emit("timeout");
		this.end(true);
	}
	public sendEnd(){
		this.debug(inspect`sendEnd`);
		this._external.write(Buffer.from([3, 0]));
	}
	public sendReject(reason:string){
		this.debug(inspect`sendReject`);
		let size = reason.length>20?20:reason.length;
		let buffer = Buffer.alloc(size);
		buffer[0] = 4;
		buffer[1] = size;
		buffer.write(reason, 2);
		this._external.write(buffer);
	}
	private sendDirectDial(extension:number){
		this.debug(inspect`sendDirectDial extension: ${extension}`);
		if(extension<110&&extension>=0) this._external.write(Buffer.from([1, 1, extension]));
	}
	private sendHeatbeat(){
		this.debug(inspect`sendHeatbeat`);
		this.printDebugString();
		this._external.write(Buffer.from([0, 0]));
	}
	private sendAcknowledge(nBytes:number){
		this.debug(inspect`sendAcknowledge ${nBytes}`);
		this._external.write(Buffer.from([6, 1, nBytes]));
	}
	private sendVersion(value:number){
		this.debug(inspect`sendVersion version: ${value}`);
		this._external.write(Buffer.from([7, byteSize(value), value]));
	}
	public accept(){
		this._external.write(Buffer.from([2, 5, changeModeBu, changeModeBu, changeModeBu, changeModeBu, changeModeBu]));
		this.bytesSent += 5;
		this.baudotifier.setMode(baudotModeBu);
	}
	public call(extension:string){
		this.sendVersion(this.version);
		this.sendDirectDial(encodeExt(extension));
	}
	public write(string:string){
		this.debug(inspect`sendString string: ${string.length} ${util.inspect(string)}`);
		this.baudotifier.write(string, ()=>{
			this.sendBuffered();
		});
	}
	public sendBuffered(){
		this.printDebugString();
		if(!this.initialized) return;

		if(this.writeBuffer.length>0&&this.bytesSendable>0){
			const data = this.writeBuffer.slice(0, this.bytesSendable);

			this.writeBuffer = this.writeBuffer.slice(this.bytesSendable);
			this.packager.write(data);
			// this.debug(inspect`sent ${data.length} bytes`);
			this.bytesSent = (this.bytesSent + data.length) % 0x100;

			this.isDrained(); // update drainage status

			this.emit("send", data);
		}
	}
	private baudotDataListener([type, ,...data]:number[]){
		this.resetTimeout();
		// logger.log(type, data);
		switch(type){
			case 0: 
				this.debug(inspect`Heartbeat`);
				this.emit("ack", null);

				if(!this.initialized){
					this.initialized = true;
					this.sendBuffered();
				}
				break;
			case 1: 
				this.debug(inspect`Direct dial ${data[0]}`);
				this.emit("call", data[0]);

				this.initialized = true;
				break;
			case 2: 
				this.debug(inspect`Baudot data ${data.length} bytes`);
				this.asciifier.write(Buffer.from(data));
				this.bytesRecieved = (this.bytesRecieved + data.length) % 0x100;
				this.sendAcknowledge(this.bytesRecieved);
				if(!this.accepted){
					this.accepted = true;
					this.emit('accept');
				}
				break;
			case 3: 
				this.debug(inspect`End`);
				this.emit('request end');
				this.end();

				break;
			case 4: 
				this.debug(inspect`Reject ${Buffer.from(data).toString()}`);
				this.emit("reject", Buffer.from(data).toString());
				this.emit('request end');
				this.end();
				break;
			case 6: 
				this.debug(inspect`Acknowledge ${data[0]}`);
				this.emit("ack", data[0]);

				this.bytesAcknowleged = data[0];

				if(this.bytesUnacknowleged === 0){
					this.initialized = true;
				}

				this.sendBuffered();

				this.isDrained(); // update drainage status
				break;
			case 7: 
				this.debug(inspect`Version ${data[0]} ${Buffer.from(data).readNullTermString(void(0), 1)}`);
				if(data[0] !== this.version) this.sendVersion(this.version);
			 break;
			case 8: 
				this.debug(inspect`Self test ${data.map(x=>x.toString(16).padStart(2, '0'))}`);
				break;
			case 9: 
			   	this.debug(inspect`Remote config`);
			   	break;
			default:
				this.debug(inspect`unknown package type: ${type} data: ${data}`);
		}
	}

	public end(force=false){
		this.debug(inspect`end`);

		if(this.ended){
			this.debug(inspect`already ended`);
			return;
		}
		
		if(force||this.isDrained()){
			this.ended = true;

			this.debug(inspect`ending baudotinterface ${this.isDrained()?'after drain':'by force'}`);
			try{
				this.sendEnd();
			}catch(err){
				//
			}

			clearInterval(this.pulse);
			clearTimeout(this.baudotTimeout);		
	
			this.destroy();
			
			this.printDebugString();

			this.emit("end");
		}else{
			this.debug(inspect`not ending baudotinterface, because it is not drained yet.`);

			this.once('drain', this.end);
		}
	}
} 



export default BaudotInterface;
