"use strict";
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals


import { inspect, logger } from "./logging";

async function serialEachPromise<T,U>(iterable:Iterable<T>, promiseFunction:(value:T, key:string)=>Promise<U>){
	let results = [];
	for(let key in iterable){
		try{
			// tslint:disable-next-line:max-line-length
			// logger.log(inspect`starting promiseFunction ${promiseFunction.name?promiseFunction.name+" ":""}called with key: ${key} value: ${iterable[key]} `);
			results.push(await promiseFunction(iterable[key], key));
			// tslint:disable-next-line:max-line-length
			// logger.log(inspect`finished promiseFunction ${promiseFunction.name?promiseFunction.name+" ":""}called with key: ${key} value: ${iterable[key]} returned: ${results[results.length]}`);
		}catch(e){
			// tslint:disable-next-line:max-line-length
			logger.log(inspect`error in promiseFunction ${promiseFunction.name?promiseFunction.name+" ":""} called with key: ${key} value: ${iterable[key]}`);
			logger.log(inspect`Error: ${e}`);
		}
	}
	return results;
}

export default serialEachPromise;
