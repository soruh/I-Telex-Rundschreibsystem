// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals

import * as stream from 'stream';
import duplex from './duplexer';

class Bridge {
	public A:stream.Duplex;
	public B:stream.Duplex;
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
