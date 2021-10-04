import APIcall from "./APICall";
import { PackageData_decoded_5 } from "./ITelexServerComTypes";
import { TLN_SERVER_HOST, TLN_SERVER_PORT, LOCAL_NUMBER } from "../config";


async function peerQuery(number: number): Promise<PackageData_decoded_5> {
	if (LOCAL_NUMBER && number === LOCAL_NUMBER) return {
		extension: '0',
		hostname: 'localhost',
		port: '4242',
		disabled: 0,
		ipaddress: null,
		name: 'LOCAL',
		number: 1,
		pin: '0',
		timestamp: 0,
		type: 3,
	};

	return await APIcall('GET', TLN_SERVER_HOST, TLN_SERVER_PORT, `/public/entry/${encodeURIComponent(number.toString())}`);
}

async function Peer_search(pattern: string): Promise<PackageData_decoded_5[]> {
	return await APIcall('GET', TLN_SERVER_HOST, TLN_SERVER_PORT, `/public/search?q=${encodeURIComponent(pattern)}`);
}




export {
	Peer_search,
	peerQuery,
};
