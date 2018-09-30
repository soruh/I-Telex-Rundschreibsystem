// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals
if(module.parent!=null){let mod=module;let loadOrder=[mod.filename.split("/").slice(-1)[0]];while(mod.parent){mod=mod.parent;loadOrder.push(mod.filename.split("/").slice(-1)[0]);}loadOrder=loadOrder.map((name,index)=>{let color="\x1b[33m";if(index==0)color="\x1b[32m";if(index==loadOrder.length-1)color="\x1b[36m";return(`${color}${name}\x1b[0m`);}).reverse();console.log(loadOrder.join(" → "));}
import { fullQuery } from "./ITelexServerCom";
import { lookup } from "dns";
import { promisify } from "util";
import { isEqual, isV4Format, isV6Format } from "ip";
import { inspect, logger } from "./logging";
import { Peer } from "./ITelexServerComTypes";

async function checkIp(ipAddress:string) {
	let peers = await fullQuery();
	let ipPeers: Array<{
		peer: Peer,
		ipaddress: string,
	}> = [];
	for(let peer of peers){
		if ((!peer.ipaddress) && peer.hostname) {
			// logger.log('debug', inspect`hostname: ${peer.hostname}`)
			try{
				let {address, family} = await promisify(lookup)(peer.hostname);
				if (address) ipPeers.push({
					peer,
					ipaddress: address,
				});
			}catch(e){
				logger.log('debug', inspect`ip resolution failed: ${e}`);
			}
		} else if (peer.ipaddress && (isV4Format(peer.ipaddress) || isV6Format(peer.ipaddress))) {
			// logger.log('debug', inspect`ip: ${peer.ipaddress}`);
			ipPeers.push({
				peer,
				ipaddress: peer.ipaddress,
			});
		}
	}
	
	let matches = ipPeers.filter(peer => isEqual(peer.ipaddress, ipAddress))
	.map(match=>match.peer);
	return matches.length > 0 ? matches : null;
}

export {
	checkIp,
};
