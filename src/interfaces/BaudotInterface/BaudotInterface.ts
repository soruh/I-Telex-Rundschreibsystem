// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
if(module.parent!=null){let mod=module;let loadOrder=[mod.filename.split("/").slice(-1)[0]];while(mod.parent){mod=mod.parent;loadOrder.push(mod.filename.split("/").slice(-1)[0]);}loadOrder=loadOrder.map((name,index)=>{let color="\x1b[33m";if(index==0)color="\x1b[32m";if(index==loadOrder.length-1)color="\x1b[36m";return(`${color}${name}\x1b[0m`);}).reverse();console.log(loadOrder.join(" → "));}
import { baudotModeBu, changeModeBu } from "../../util/baudot";
import * as util from "util"; // TODO remove?
import { inspect, logger } from "../../util/logging";
import Interface from "../Interface";
import ChunkPackages from "../../util/ChunkPackages";
import BaudotToAscii from "./BaudotToAscii";
import AsciiToBaudot from "./AsciiToBaudot";
import PackageBaudotData from "./PackageBaudotData";


const logDebug = true;

function byteSize(value){
	return Math.ceil(Math.log((value||1)+1)/Math.log(0x100));
}
function symbolName(s: symbol):string {
	if(s && typeof s.toString === "function"){
		return /Symbol\((.*)\)/.exec(s.toString())[1];
	}else{
		return "NULL";
	}
}


class BaudotInterface extends Interface{
	public version = 1;
	public pulseRate  = 3.5*1000;

	private asciifier = new BaudotToAscii();
	private baudotifier = new AsciiToBaudot();
	private packager = new PackageBaudotData();
	private chunker = new ChunkPackages();

	private writeBuffer = Buffer.alloc(0);
	public  drained = true;

	private accepted = false;
	
	private bytesAcknowleged = 0;
	private bytesSent = 0;
	private bytesRecieved = 0;

	private baudotTimeout = setTimeout(()=>this.onTimeout(), 30*1000);
	private pulse = setInterval(()=>this.sendHeatbeat(), this.pulseRate);

	get bytesUnacknowleged(){
		return this.bytesSent-this.bytesAcknowleged+(this.bytesSent<this.bytesAcknowleged?256:0);
	}
	get bytesSendable(){
		let sendable = 254-this.bytesUnacknowleged;
		return sendable<0?0:sendable;
	}

	constructor(){
		super();

		this.asciifier.on('modeChange', (mode:symbol)=>{
			if(logDebug) logger.log(inspect`asciifier modeChange to ${symbolName(mode)}`);
			this.baudotifier.setMode(mode);
		});
		this.baudotifier.on('modeChange', (mode:symbol)=>{
			if(logDebug)  logger.log(inspect`baudotifier modeChange to ${symbolName(mode)}`);
			this.asciifier.setMode(mode);
		});

		this.baudotifier.on("data", (data:Buffer)=>{
			this.writeBuffer = Buffer.concat([this.writeBuffer, data]);
			this.sendBuffered();
		});
		
		
		this.packager.pipe(this._external);
		this._external.pipe(this.chunker);
		this.asciifier.pipe(this._internal);
		
		this.chunker.on('data', (data:number[])=>this.baudotDataListener(data));
		this._internal.on("data", data=>this.write(data.toString()));

		this._external.on('end',()=>{
			if(logDebug)  logger.log("outside ended");
			this.end(); // disallow reconnection
		});
		this._external.on("close",()=>logger.log("outside closed"));
	}

	private resetTimeout(){
		if(logDebug)  logger.log("resetTimeout");
		clearTimeout(this.baudotTimeout);
		this.baudotTimeout = setTimeout(()=>this.onTimeout(), 30*1000);
	}
	private onTimeout(){
		if(logDebug)  logger.log("onTimeout");
		this.emit("timeout");
		this.sendEnd();
		this.end();
	}
	public sendEnd(){
		if(logDebug)  logger.log(inspect`sendEnd`);
		this._external.write(Buffer.from([3, 0]));
	}
	public sendReject(reason:string){
		if(logDebug)  logger.log(inspect`sendReject`);
		let size = reason.length>20?20:reason.length;
		let buffer = Buffer.alloc(size);
		buffer[0] = 4;
		buffer[1] = size;
		buffer.write(reason, 2);
		this._external.write(buffer);
	}
	private sendDirectDial(extension:number){
		if(logDebug)  logger.log(inspect`sendDirectDial extension:${extension}`);
		if(extension<110&&extension>=0) this._external.write(Buffer.from([1, 1, extension]));
	}
	private sendHeatbeat(){
		if(logDebug)  logger.log(inspect`sendHeatbeat`);
		this._external.write(Buffer.from([0, 0]));
	}
	private sendAcknowledge(nBytes:number){
		if(logDebug)  logger.log(inspect`sendAcknowledge ${nBytes}`);
		this._external.write(Buffer.from([6, 1, nBytes]));
	}
	private sendVersion(value:number){
		if(logDebug)  logger.log(inspect`sendVersion version: ${value}`);
		this._external.write(Buffer.from([7, byteSize(value), value]));
	}
	public accept(){
		this._external.write(Buffer.from([2, 5, changeModeBu, changeModeBu, changeModeBu, changeModeBu, changeModeBu]));
		this.bytesSent += 5;
		this.baudotifier.setMode(baudotModeBu);
	}
	public call(extension){
		this.sendVersion(this.version);
		this.sendDirectDial(extension);
	}
	public write(string:string){
		if(logDebug)  logger.log(inspect`sendString string: ${string.length} ${util.inspect(string)}`);
		this.baudotifier.write(string);
		this.sendBuffered();
	}
	public sendBuffered(){
		// tslint:disable-next-line:max-line-length
		if(logDebug) logger.log(inspect`sendBuffered bytesSent: ${this.bytesSent} bytesAcknowleged: ${this.bytesAcknowleged} bytesUnacknowleged: ${this.bytesUnacknowleged} buffered: ${this.writeBuffer.length} sendable: ${this.bytesSendable}`);
		if(this.writeBuffer.length>0&&this.bytesSendable>0){
			let data = this.writeBuffer.slice(0, this.bytesSendable);
			this.writeBuffer = this.writeBuffer.slice(this.bytesSendable);
			this.packager.write(data);
			// if(logDebug)  logger.log(inspect`sent ${data.length} bytes`);
			this.bytesSent = (this.bytesSent + data.length) % 0x100;
			this.drained = false;

			this.emit("send", data);
		}
	}
	private end(){
		clearInterval(this.pulse);
		clearTimeout(this.baudotTimeout);

		this.emit("end");
	}
	private baudotDataListener([type, ,...data]:number[]){
		this.resetTimeout();
		// logger.log(type, data);
		switch(type){
			case 0: 
				if(logDebug)  logger.log(inspect`Heartbeat`);
				// this.sendBuffered();
				break;
			case 1: 
				if(logDebug)  logger.log(inspect`Direct dial ${data[0]}`);
				// this.accepted();
				this.emit("call", data[0]);
				break;
			case 2: 
				if(logDebug)  logger.log(inspect`Baudot data ${data.length} bytes`);
				this.asciifier.write(Buffer.from(data));
				this.bytesRecieved = (this.bytesRecieved + data.length) % 0x100;
				this.sendAcknowledge(this.bytesRecieved);
				if(!this.accepted){
					this.accepted = true;
					this.emit('accept');
				}
				break;
			case 3: 
				if(logDebug)  logger.log(inspect`End`);
				this.end();

				break;
			case 4: 
				if(logDebug)  logger.log(inspect`Reject ${Buffer.from(data).toString()}`);
				this.emit("reject", Buffer.from(data).toString());
				this.end();
				break;
			case 6: 
				if(logDebug)  logger.log(inspect`Acknowledge ${data[0]}`);

				this.bytesAcknowleged = data[0];
				this.sendBuffered();
				if(this.bytesUnacknowleged === 0&&this.writeBuffer.length === 0&&this.drained === false){
					this.drained = true;
					this.emit("drain");
				}
				break;
			case 7: 
				if(logDebug)  logger.log(inspect`Version ${data[0]} ${Buffer.from(data).readNullTermString(void(0), 1)}`);
				if(data[0] !== this.version) this.sendVersion(this.version);
			 break;
			case 8: 
				if(logDebug)  logger.log(inspect`Self test ${data.map(x=>x.toString(16).padStart(2, '0'))}`);
				break;
			case 9: 
			   	if(logDebug)  logger.log(inspect`Remote config`);
			   	break;
			default:
				logger.log(inspect`unknown package type: ${type} data: ${data}`);
		}
	}
} 



export default BaudotInterface;
