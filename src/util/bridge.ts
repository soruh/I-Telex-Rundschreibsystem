
import * as stream from 'stream';
import duplex from './duplexer';
import { logger } from './logging';

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


		this.A.on('error', err=>this.handleError(err as any, 'A'));
		this.B.on('error', err=>this.handleError(err as any, 'B'));

		this.A.once('end', ()=>this.handleEnd('A'));
		this.B.once('end', ()=>this.handleEnd('B'));
	}

	private handleError(err:Error&{code: string}, stream:'A'|'B'){
		switch((err).code){
			case "ERR_STREAM_WRITE_AFTER_END":
			case "ERR_STREAM_DESTROYED":
				return;
			default:
				logger.log('Bridge stream '+stream+' error:', err);
		}
	}

	private handleEnd(stream:'A'|'B'){
		logger.log('Bridge stream '+stream+' ended');
	}
}

export default Bridge;
