// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
if(module.parent!=null){let mod=module;let loadOrder=[mod.filename.split("/").slice(-1)[0]];while(mod.parent){mod=mod.parent;loadOrder.push(mod.filename.split("/").slice(-1)[0]);}loadOrder=loadOrder.map((name,index)=>{let color="\x1b[33m";if(index==0)color="\x1b[32m";if(index==loadOrder.length-1)color="\x1b[36m";return(`${color}${name}\x1b[0m`);}).reverse();console.log(loadOrder.join(" → "));}
import * as stream from 'stream';
import * as duplex from 'duplexer';

class Bridge {
	public A: stream.Duplex;
	public B: stream.Duplex;
	constructor() {
		const A_WRITE = new stream.PassThrough();
		const A_READ = new stream.PassThrough();
		const B_WRITE = new stream.PassThrough();
		const B_READ = new stream.PassThrough();
		
		A_WRITE.pipe(B_READ);
		B_WRITE.pipe(A_READ);

		this.A = duplex(A_WRITE, A_READ);
		this.B = duplex(B_WRITE, B_READ);
	}
}

export default Bridge;
