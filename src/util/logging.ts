// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
if(module.parent!=null){let mod=module;let loadOrder=[mod.filename.split("/").slice(-1)[0]];while(mod.parent){mod=mod.parent;loadOrder.push(mod.filename.split("/").slice(-1)[0]);}loadOrder=loadOrder.map((name,index)=>{let color="\x1b[33m";if(index==0)color="\x1b[32m";if(index==loadOrder.length-1)color="\x1b[36m";return(`${color}${name}\x1b[0m`);}).reverse();console.log(loadOrder.join(" → "));}

import colors from "./colors";
import * as util from "util";

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

const logger = {log:(...args)=>{
	process.stdout.write(new Date().toJSON()+' ');
	(console as any).log.apply(null, args);
}}; // TODO implement winston;

export {
	inspect,
	logger,
};
