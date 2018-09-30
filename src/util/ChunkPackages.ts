// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
if(module.parent!=null){let mod=module;let loadOrder=[mod.filename.split("/").slice(-1)[0]];while(mod.parent){mod=mod.parent;loadOrder.push(mod.filename.split("/").slice(-1)[0]);}loadOrder=loadOrder.map((name,index)=>{let color="\x1b[33m";if(index==0)color="\x1b[32m";if(index==loadOrder.length-1)color="\x1b[36m";return(`${color}${name}\x1b[0m`);}).reverse();console.log(loadOrder.join(" → "));}
import { Transform } from "stream";

class ChunkPackages extends Transform {
	public buffer = Buffer.alloc(0);
	constructor(options?){
		super(options);
	}
	public _transform(chunk:Buffer, encoding:string, callback:(err?:Error, data?:Buffer)=>void){
		this.buffer = Buffer.concat([this.buffer, chunk]);
		let packageLength = (this.buffer[1]+2)||Infinity;
		
		while(packageLength<=this.buffer.length){
			this.push(this.buffer.slice(0,packageLength));
			this.buffer = this.buffer.slice(packageLength);
			packageLength = (this.buffer[1]+2)||Infinity;
		}
		callback();
	}
}
export default ChunkPackages;
