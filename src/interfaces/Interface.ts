// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
if(module.parent!=null){let mod=module;let loadOrder=[mod.filename.split("/").slice(-1)[0]];while(mod.parent){mod=mod.parent;loadOrder.push(mod.filename.split("/").slice(-1)[0]);}loadOrder=loadOrder.map((name,index)=>{let color="\x1b[33m";if(index==0)color="\x1b[32m";if(index==loadOrder.length-1)color="\x1b[36m";return(`${color}${name}\x1b[0m`);}).reverse();console.log(loadOrder.join(" → "));}
import { EventEmitter } from "events";
import Bridge from "../util/bridge";

class Interface extends EventEmitter{
	// public internal   = new PassThrough(); //Readable  from outside -> Writeable  from inside
	// public internal  = new PassThrough(); //Writeable from outside -> Readable   from inside
	// public externalReadStream  = new PassThrough(); //Readable  from outside -> Writeable  from inside
	// public externalWriteStream = new PassThrough(); //Writeable from outside -> Readable   from inside
	
	public inputBridge = new Bridge();
	public outputBridge = new Bridge();

	public _external = this.inputBridge.A; // TODO: find better names
	public _internal = this.outputBridge.A;

	public external = this.inputBridge.B;
	public internal = this.outputBridge.B;

	constructor(){
		super();
	}
	public destroy(){
		this.external.unpipe();
		this.internal.unpipe();

		this._external.unpipe();
		this._internal.unpipe();


		this.external.destroy();
		this.internal.destroy();

		this._external.destroy();
		this._internal.destroy();
	}
}

export default Interface;
