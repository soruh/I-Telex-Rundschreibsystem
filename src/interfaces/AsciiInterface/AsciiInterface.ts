// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
if(module.parent!=null){let mod=module;let loadOrder=[mod.filename.split("/").slice(-1)[0]];while(mod.parent){mod=mod.parent;loadOrder.push(mod.filename.split("/").slice(-1)[0]);}loadOrder=loadOrder.map((name,index)=>{let color="\x1b[33m";if(index==0)color="\x1b[32m";if(index==loadOrder.length-1)color="\x1b[36m";return(`${color}${name}\x1b[0m`);}).reverse();console.log(loadOrder.join(" → "));}
import Interface from "../Interface";
import ExtractAsciiExtension from "./ExtractAsciiExtension";

class AsciiInterface extends Interface {
	public extractor;
	constructor(caller:boolean){
		super();
		if(caller){
			this.extractor = new ExtractAsciiExtension();
			this.extractor.on('extension', (ext)=>{
				// TODO
			});
			this._external.pipe(this.extractor).pipe(this._internal);
			this._internal.pipe(this._external);
		}else{
			this._external.pipe(this._internal);
			this._internal.pipe(this._external);
		}
	}
	public call(extension:string){
		this._external.write(`*${extension}*`);
	}
}

export default AsciiInterface;
