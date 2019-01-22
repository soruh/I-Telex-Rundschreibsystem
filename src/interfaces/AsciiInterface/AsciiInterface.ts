
import Interface from "../Interface";
import ExtractAsciiExtension from "./ExtractAsciiExtension";

class AsciiInterface extends Interface {
	public extractor:ExtractAsciiExtension;
	constructor(caller:boolean){
		super();

		this._external.once('close', ()=>{
			this.end();
		});
		
		if(caller){
			this.extractor = new ExtractAsciiExtension();
			this.extractor.on('extension', ext=>{
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

	public end(){
		this.destroy();

		this.emit("end");
	}
}

export default AsciiInterface;
