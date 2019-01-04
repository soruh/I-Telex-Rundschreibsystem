import APIcall from "./APICall";
import { PackageData_decoded_5 } from "./ITelexServerComTypes";
import { TLN_SERVER_HOST, TLN_SERVER_PORT } from "../../config.json";


async function peerQuery(number:number):Promise<PackageData_decoded_5>{
	return await APIcall('GET', TLN_SERVER_HOST, TLN_SERVER_PORT,`/public/entry/${encodeURIComponent(number.toString())}`);
}

async function Peer_search(pattern:string):Promise<PackageData_decoded_5[]>{
	return await APIcall('GET', TLN_SERVER_HOST, TLN_SERVER_PORT,`/public/search?q=${encodeURIComponent(pattern)}`);
}




export {
	Peer_search,
	peerQuery,
};
