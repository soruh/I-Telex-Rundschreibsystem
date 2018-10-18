// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals

import { Transform } from "stream";
import { MAX_BAUDOT_DATA_SIZE } from "../../constants";

class PackageBaudotData extends Transform {
	constructor(options?){
		super(options);
	}
	public _transform(chunk:Buffer, encoding:string, callback:(err?:Error, data?:Buffer)=>void){
		while(chunk.length > 0){
			let data =  chunk.slice(0, MAX_BAUDOT_DATA_SIZE);
			this.push(Buffer.concat([Buffer.from([2, data.length]), data]));
			chunk = chunk.slice(MAX_BAUDOT_DATA_SIZE);
		}
		callback();
	}
	
}

export default PackageBaudotData;
