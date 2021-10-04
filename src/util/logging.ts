

import colors from "./colors";
import * as util from "util";
import { Stream } from "stream";

const disableColors = false;

function isAnyError(error) {
	if (error instanceof Error) return true;
	return false;
}

function inspect(substrings: TemplateStringsArray, ...values: any[]): string {
	let substringArray = Array.from(substrings);
	substringArray = substringArray.map(substring => colors.FgGreen + substring + colors.Reset);
	values = values.map(value => {
		if (typeof value === "string") return colors.FgCyan + value + colors.Reset;
		if (isAnyError(value)) return colors.FgRed + util.inspect(value) + colors.Reset;
		let inspected = util.inspect(value, {
			colors: !disableColors,
			depth: 2,
		});
		if (!disableColors) {
			inspected = inspected.replace(/\u0001b\[39m/g, "\x1b[000m");
			// replace set color to black to reset color
		}
		return inspected;
	});
	let combined = [];
	while (values.length + substringArray.length > 0) {
		if (substringArray.length > 0) combined.push(substringArray.shift());
		if (values.length > 0) combined.push(values.shift());
	}
	return combined.join('');
}

class logStream {
	private stream;
	private logger;
	private name;
	constructor(name: string, stream: Stream) {
		this.stream = stream;
		this.name = name;
		this.logger = (text: Buffer) => {
			logger.log(inspect`${name}: ${util.inspect(text.toString())}`);
		};
		this.stream.on('data', this.logger);
	}
	public end() {
		logger.log(`stopped logging for ${this.name}`);
		this.stream.removeListener('data', this.logger);
	}
}

const logger = console; // TODO implement winston;

export {
	inspect,
	logger,
	logStream
};
