
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
	public call(extension:string){
		// overwrite in child class
	}
	public end(){
		// overwrite in child class
	}
}

export default Interface;
