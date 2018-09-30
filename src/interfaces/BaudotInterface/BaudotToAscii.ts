// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
if(module.parent!=null){let mod=module;let loadOrder=[mod.filename.split("/").slice(-1)[0]];while(mod.parent){mod=mod.parent;loadOrder.push(mod.filename.split("/").slice(-1)[0]);}loadOrder=loadOrder.map((name,index)=>{let color="\x1b[33m";if(index==0)color="\x1b[32m";if(index==loadOrder.length-1)color="\x1b[36m";return(`${color}${name}\x1b[0m`);}).reverse();console.log(loadOrder.join(" → "));}
import { Transform } from "stream";
import { baudotModeUnknown, asciify } from "../../util/baudot";

class BaudotToAscii extends Transform {
	public baudotMode = baudotModeUnknown;
	constructor(options?){
		super(options);
	}
	public _transform(chunk:Buffer, encoding:string, callback:(err?:Error, data?:string)=>void){
		let [ascii, newBaudotMode] = asciify(chunk, this.baudotMode);
		this.setMode(newBaudotMode);
		// this.push(ascii);
		// callback();
		callback(null, ascii);
	}
	public setMode(baudotMode){
		// logger.log('debug',`BaudotToAscii setMode to ${baudotMode.toString()}`);
		if(baudotMode !== this.baudotMode){
			this.baudotMode = baudotMode;
			this.emit("modeChange", baudotMode);
		}
	}
}

export default BaudotToAscii;
