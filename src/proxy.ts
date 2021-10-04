import { Server, connect } from "net";
import ChunkPackages from "./util/ChunkPackages";
import { baudotModeUnknown, asciify } from "./util/baudot";
import * as util from "util";
import { inspect } from "./util/logging";

declare global {
	interface Buffer {
		readNullTermString: (encoding?, start?, end?) => string;
	}
}
Buffer.prototype.readNullTermString =
	function readNullTermString(encoding: string = "utf8", start: number = 0, end: number = this.length): string {
		let firstZero = this.indexOf(0, start);
		let stop = firstZero >= start && firstZero <= end ? firstZero : end;
		return this.toString(encoding, start, stop);
	};

const logger = console;

const server = new Server(connection => {

	function handleDate(data: Buffer, name: string) {
		switch (data[0]) {
			case 0:
				logger.log(inspect`${name} Heartbeat`);
				break;
			case 1:
				logger.log(inspect`${name} Call ${data[2]}`);
				break;
			case 2:
				let [text, newMode] = asciify(Buffer.from(Array.from(data).slice(2)), baudotMode);
				baudotMode = newMode;
				logger.log(inspect`${name} Decoded Baudot ${util.inspect(text)}`);
				logger.log(inspect`${name} Encoded Baudot ${data.slice(2)}`);
				break;
			case 3:
				logger.log(inspect`${name} End`);
				break;
			case 4:
				logger.log(inspect`${name} Reject ${data.readNullTermString('utf8', 2)}`);
				break;
			case 6:
				logger.log(inspect`${name} Ack ${data.readIntLE(2, 1)}`);
				break;
			case 7:
				logger.log(inspect`${name} Version ${data[2]} ${data.readNullTermString('utf8', 3)}`);
				break;
			default:
				logger.log(inspect`${name} ${data}`);
		}
	}

	let socket = connect({ host: '192.168.1.75', port: 134 });
	socket.pipe(connection);
	connection.pipe(socket);

	let chunker_a = new ChunkPackages();
	let chunker_b = new ChunkPackages();

	socket.pipe(chunker_a);
	connection.pipe(chunker_b);

	let baudotMode = baudotModeUnknown;

	chunker_a.on('data', data => {
		handleDate(data, '\x1b[031mitelex');
	});

	chunker_b.on('data', data => {
		handleDate(data, '\x1b[034mclient');
	});
});
server.listen(5000);
