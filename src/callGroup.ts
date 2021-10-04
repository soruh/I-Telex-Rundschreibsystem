"use strict";

import { Socket } from "net";
import * as util from "util";
import { peerQuery } from "./util/ITelexServerCom";
import Interface from "./interfaces/Interface";
import BaudotInterface from "./interfaces/BaudotInterface/BaudotInterface";
import AsciiInterface from "./interfaces/AsciiInterface/AsciiInterface";
import { logger, inspect, logStream } from "./util/logging";
import confirm from "./confirm";
import { isBlacklisted } from "./blacklist";
import { PackageData_decoded_5 } from "./util/ITelexServerComTypes";
import { EventEmitter } from "events";
import { withTimeout } from "./util/promiseTimeout"
import config = require("./config");

interface Connection {
	socket: Socket;
	name: string;
	number: number;
	interface: Interface;
	identifier: string;
}

function explainErrorCode(code: string) { // TODO: add more codes
	switch (code) {
		case 'EHOSTUNREACH':
		case 'ECONNREFUSED':
			return 'nc';
		default:
			return code;
	}
}

function callOne(number: number, index: number, numbers: number[]) {
	return new Promise<Connection>(async (resolve, reject) => {
		// output.write(`calling: ${number}\r\n`);

		let peer: PackageData_decoded_5;
		try {
			peer = await peerQuery(number);
		} catch (err) {
			logger.log(`Error in peerQuery:\r\n${err}`);
		}

		let interFace: Interface;
		if (peer) {
			// output.write(`number found: ${peer.name}\r\n`);
			const padding = (numbers.length - 1).toString().length;
			switch (peer.type) {
				case 1:
				case 2:
				case 5:
					interFace = new BaudotInterface(logger, ["\x1b[34m", `called ${index.toString().padStart(padding)}`, "\x1b[0m"]);
					break;
				case 3:
				case 4:
					interFace = new AsciiInterface(false);
					break;
				case 6:
				default:
					// output.write("invalid client type\r\n\n");
					reject('invalid type');
					return;
			}

			// const logStreamIn  = new logStream(inspect`called client ${index.toString().padStart(padding)} \x1b[033m in\x1b[0m`, interFace.internal);
			// const logStreamOut = new logStream(inspect`called client ${index.toString().padStart(padding)} \x1b[034mout\x1b[0m`, interFace._internal);


			if (isBlacklisted(number)) {
				// output.write(`${peer.name}(${peer.number}) has been blacklisted\r\n\n`);
				reject('blacklisted');
				return;
			}

			// output.write(`${DELIMITER}\r\n`);

			// if(interFace instanceof BaudotInterface){
			// 	interFace.asciifier.on('modeChange', (newMode)=>{
			// 		logger.log(inspect`new called client mode: ${newMode}`);
			// 	});
			// }

			// output.write('valid client type\r\n');

			let socket = new Socket();

			socket.pipe(interFace.external);
			interFace.external.pipe(socket);

			socket.on('connect', async () => {

				if (!(interFace instanceof AsciiInterface && peer.extension === null)) {
					logger.log('calling: ' + peer.extension);
					interFace.call(peer.extension);
				}

				if (interFace instanceof BaudotInterface) {
					interFace.internal.resume();

					await new Promise((resolve, reject) => {
						interFace.once('ack', (x) => {
							logger.log(`initial ack: ${x}`);
							if ((interFace as BaudotInterface).drained) {
								// logger.log('was already drained');
								resolve();
							} else {
								logger.log('waiting for drain');
								interFace.on('drain', () => {
									resolve();
									// logger.log('drained');
								});
							}
						});
					});
				}

				try {
					const result = await confirm(interFace.internal, +index);

					// output.write(result+'\r\n');

					// interFace.internal.unpipe(output);

					// if(interFace instanceof BaudotInterface) interFace.asciifier.setMode(baudotModeUnknown);

					let connection: Connection = {
						socket,
						name: peer.name,
						number: peer.number,
						interface: interFace,
						identifier: result,
					};

					// output.write(`\r\n${DELIMITER}\r\n`);
					resolve(connection);
				} catch (err) {
					logger.log(inspect`confimation failed: ${err}`);

					if (err.message === 'timeout') {
						interFace.end();
						reject('timeout');
					} else {
						reject(err.message || err || 'unknown error');
					}
				}
			});

			interFace.on('reject', reason => {
				interFace.end();

				logger.log(util.inspect(reason));
				// output.write(`${reason}`); // \r\n is included in reject message
				// output.write(`${DELIMITER}\r\n`);
				reject(reason);
			});

			socket.on('error', (err) => {
				if ((err as Error & { code: string }).code === "ERR_STREAM_WRITE_AFTER_END") return;

				socket.end();
				const explainedError = explainErrorCode((err as Error & { code: string }).code);

				const expectedError = explainedError === 'nc';
				logger.log(inspect`client socket for ${peer.number} had an ${expectedError ? 'expected' : 'unexpected'} error${expectedError ? '' : ': '}${expectedError ? '' : err}`);

				reject(explainedError);
			});

			socket.on('close', () => {
				interFace.end();

				// logStreamIn.end();
				// logStreamOut.end();

				logger.log(inspect`called client disconnected`);
			});

			socket.connect({
				host: peer.hostname || peer.ipaddress,
				port: parseInt(peer.port),
			});

		} else {
			// output.write("--- 404 ---\r\n");
			// output.write("number not found\r\n\n");
			reject('not found');
		}
	});
}

function callGroup(group: number[], callback: (err: Error, connections: Connection[]) => void): EventEmitter {
	const status = new EventEmitter();

	Promise.all(group.map(
		async (number, index) => {
			try {
				const result = await callOne(number, index, group);
				status.emit('success', number, result);

				return result;
			} catch (err) {
				status.emit('fail', number, err);
			}
		}
	))
		.then(clients => {
			status.emit('end');
			callback(null, clients.filter(x => x));
		})
		.catch(err => {
			status.emit('end');
			callback(err, null);
		});

	return status;
}

export default callGroup;
