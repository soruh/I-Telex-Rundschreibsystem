import { Transform } from "stream";
import { EventEmitter } from "events";

class CallEndDetector extends Transform {
	private buffer = '';
	public emitter = new EventEmitter();
	public _transform(chunk: Buffer, encoding: string, callback: (err?: Error, data?: Buffer) => void) {
		let bufferedChunk = this.buffer + chunk.toString();
		this.buffer += chunk.toString();
		this.buffer = this.buffer.slice(-2);

		callback(null, chunk);

		if (/\+\+\+/.test(bufferedChunk)) {
			this.emitter.emit('end');
		}
	}
}

export default CallEndDetector;
