
import { Transform } from "stream";
import { baudotModeUnknown, baudotify } from "../../util/baudot";
import { logger } from "../../util/logging";

class AsciiToBaudot extends Transform {
	public baudotMode = baudotModeUnknown;
	constructor(options?) {
		super(options);
	}
	public _transform(chunk: string, encoding: string, callback: (err?: Error, data?: Buffer) => void) {
		let [baudot, newBaudotMode] = baudotify(chunk.toString(), this.baudotMode);
		this.setMode(newBaudotMode);
		// this.push(baudot);
		// callback();
		callback(null, Buffer.from(baudot));
	}
	public setMode(baudotMode) {
		// logger.log(`AsciiToBaudot setMode to ${baudotMode.toString()}`);
		if (baudotMode !== this.baudotMode) {
			this.baudotMode = baudotMode;
			this.emit("modeChange", baudotMode);
		}
	}
}

export default AsciiToBaudot;
