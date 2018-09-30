"use strict";
// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
if(module.parent!=null){let mod=module;let loadOrder=[mod.filename.split("/").slice(-1)[0]];while(mod.parent){mod=mod.parent;loadOrder.push(mod.filename.split("/").slice(-1)[0]);}loadOrder=loadOrder.map((name,index)=>{let color="\x1b[33m";if(index==0)color="\x1b[32m";if(index==loadOrder.length-1)color="\x1b[36m";return(`${color}${name}\x1b[0m`);}).reverse();console.log(loadOrder.join(" → "));}

import { inspect, logger } from "./logging";

async function serialEachPromise<T,U>(iterable:Iterable<T>, promiseFunction:(value:T, key:string)=>Promise<U>){
	let results = [];
	for(let key in iterable){
		try{
			results.push(await promiseFunction(iterable[key], key));
		}catch(e){
			if(e) logger.log('error: '+inspect`${e}`);
		}
	}
	return results;
}

export default serialEachPromise;
