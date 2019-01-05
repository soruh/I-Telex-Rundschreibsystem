
import { Transform } from "stream";
import { baudotModeUnknown, asciify } from "../../util/baudot";
import { logger } from "../../util/logging";

class BaudotToAscii extends Transform {
	public baudotMode = baudotModeUnknown;
	public _transform(chunk:Buffer, encoding:string, callback:(err?:Error, data?:string)=>void){
		let [ascii, newBaudotMode] = asciify(chunk, this.baudotMode);
		this.setMode(newBaudotMode);
		// this.push(ascii);
		// callback();
		callback(null, ascii);
	}
	public setMode(baudotMode){
		// logger.log(`BaudotToAscii setMode to ${baudotMode.toString()}`);
		if(baudotMode !== this.baudotMode){
			this.baudotMode = baudotMode;
			this.emit("modeChange", baudotMode);
		}
	}
}

export default BaudotToAscii;
