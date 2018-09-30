// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
if(module.parent!=null){let mod=module;let loadOrder=[mod.filename.split("/").slice(-1)[0]];while(mod.parent){mod=mod.parent;loadOrder.push(mod.filename.split("/").slice(-1)[0]);}loadOrder=loadOrder.map((name,index)=>{let color="\x1b[33m";if(index==0)color="\x1b[32m";if(index==loadOrder.length-1)color="\x1b[36m";return(`${color}${name}\x1b[0m`);}).reverse();console.log(loadOrder.join(" → "));}
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
