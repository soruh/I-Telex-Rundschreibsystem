// @ts-ignore
// tslint:disable-next-line:max-line-length no-console triple-equals

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
			// logger.log( inspect`hostname: ${peer.hostname}`)
			try{
				let {address, family} = await promisify(lookup)(peer.hostname);
				if (address) ipPeers.push({
					peer,
					ipaddress: address,
				});
			}catch(e){
				logger.log( inspect`ip resolution failed: ${e}`);
			}
		} else if (peer.ipaddress && (isV4Format(peer.ipaddress) || isV6Format(peer.ipaddress))) {
			// logger.log( inspect`ip: ${peer.ipaddress}`);
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
