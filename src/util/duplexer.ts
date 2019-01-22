"use strict";


import { Stream, Writable, Readable, Duplex } from "stream";

const writeMethods = ["write", "end", "destroy"];
const readMethods = ["resume", "pause", "pipe", "unpipe"];
const readEvents = ["data", "close", "pipe", "unpipe"];
const slice = Array.prototype.slice;

function forEach<T>(arr:T[], fn:(val:T, key:number)=>void) {
	if (arr.forEach) {
		return arr.forEach(fn);
	}

	for (let i = 0; i < arr.length; i++) {
		fn(arr[i], i);
	}
}

function duplex(writer:Writable, reader:Readable):Duplex{
	const stream = new Stream() as Duplex;
	let ended = false;

	forEach(writeMethods, proxyWriter);

	forEach(readMethods, proxyReader);

	forEach(readEvents, proxyStream);

	reader.on("end", handleEnd);

	writer.on("drain", function() {
	  stream.emit("drain");
	});

	writer.on("error", reemit);
	reader.on("error", reemit);

	stream.writable = writer.writable;
	stream.readable = reader.readable;

	return stream;

	function proxyWriter(methodName) {
		stream[methodName] = method;

		function method() {
			return writer[methodName].apply(writer, arguments);
		}
	}

	function proxyReader(methodName) {
		stream[methodName] = method;

		function method() {
			stream.emit(methodName);
			let func = reader[methodName];
			if (func) {
				return func.apply(reader, arguments);
			}
			reader.emit(methodName);
		}
	}

	function proxyStream(methodName) {
		function reemit() {
			let args = slice.call(arguments);
			args.unshift(methodName);
			stream.emit.apply(stream, args);
		}

		reader.on(methodName, reemit);
	}

	function handleEnd() {
		if (ended) {
			return;
		}

		ended = true;
		let args = slice.call(arguments);
		args.unshift("end");
		stream.emit.apply(stream, args);
	}

	function reemit(err) {
		stream.emit("error", err);
	}
}

export default duplex;
