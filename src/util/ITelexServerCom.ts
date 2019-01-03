import APIcall from "./APICall";
import { PackageData_decoded_5 } from "./ITelexServerComTypes";

const SERVER_HOST = 'telexgateway.de';
const SERVER_PORT = 11812;

async function peerQuery(number:number):Promise<PackageData_decoded_5>{
	return await APIcall('GET', SERVER_HOST, SERVER_PORT, `/public/entry/${encodeURIComponent(number.toString())}`);
}

async function Peer_search(pattern:string):Promise<PackageData_decoded_5[]>{
	return await APIcall('GET', SERVER_HOST, SERVER_PORT, `/public/search?q=${encodeURIComponent(pattern)}`);
}




export {
	Peer_search,
	peerQuery,
};
