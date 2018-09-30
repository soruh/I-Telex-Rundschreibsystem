type Package_decoded =
	Package_decoded_1 |
	Package_decoded_2 |
	Package_decoded_3 |
	Package_decoded_4 |
	Package_decoded_5 |
	Package_decoded_6 |
	Package_decoded_7 |
	Package_decoded_8 |
	Package_decoded_9 |
	Package_decoded_10 |
	Package_decoded_255;

type PackageData_decoded =
	PackageData_decoded_1 |
	PackageData_decoded_2 |
	PackageData_decoded_3 |
	PackageData_decoded_4 |
	PackageData_decoded_5 |
	PackageData_decoded_6 |
	PackageData_decoded_7 |
	PackageData_decoded_8 |
	PackageData_decoded_9 |
	PackageData_decoded_10 |
	PackageData_decoded_255;


interface Package_decoded_1 {
	type: 1;
		datalength ? : 8;
		data: PackageData_decoded_1;
}
interface Package_decoded_2 {
	type: 2;
		datalength ? : 4;
		data: PackageData_decoded_2;
}
interface Package_decoded_3 {
	type: 3;
		datalength ? : 5;
		data: PackageData_decoded_3;
}
interface Package_decoded_4 {
	type: 4;
		datalength ? : 0;
		data ? : PackageData_decoded_4;
}
interface Package_decoded_5 {
	type: 5;
		datalength ? : 100;
		data: PackageData_decoded_5;
}
interface Package_decoded_6 {
	type: 6;
		datalength ? : 5;
		data: PackageData_decoded_6;
}
interface Package_decoded_7 {
	type: 7;
		datalength ? : 5;
		data: PackageData_decoded_7;
}
interface Package_decoded_8 {
	type: 8;
		datalength ? : 0;
		data ? : PackageData_decoded_8;
}
interface Package_decoded_9 {
	type: 9;
		datalength ? : 0;
		data ? : PackageData_decoded_9;
}
interface Package_decoded_10 {
	type: 10;
		datalength ? : 41;
		data: PackageData_decoded_10;
}
interface Package_decoded_255 {
	type: 255;
	datalength ? : number;
	data: PackageData_decoded_255;
}
interface PackageData_decoded_1 {
	number: number;
		pin: string;
		port: string;
}
interface PackageData_decoded_2 {
	ipaddress: string;
}
interface PackageData_decoded_3 {
	number: number;
		version: number;
}
interface PackageData_decoded_4 {

}
interface PackageData_decoded_5 {
	number: number;
		name: string;
		disabled: number;
		type: number;
		hostname: string;
		ipaddress: string;
		port: string;
		extension: string;
		pin: string;
		timestamp: number;
}
interface PackageData_decoded_6 {
	version: number;
		serverpin: number;
}
interface PackageData_decoded_7 {
	version: number;
		serverpin: number;
}
interface PackageData_decoded_8 {

}
interface PackageData_decoded_9 {

}
interface PackageData_decoded_10 {
	version: number;
		pattern: string;
}
interface PackageData_decoded_255 {
	message: string;
}


type PackageData_encoded = number[] | Buffer;

interface Package_encoded {
	data ? : PackageData_encoded;
	type ? : number;
	datalength ? : number;
}

interface rawPackage {
	type: number;
		datalength: number;
		data: PackageData_encoded;
}

interface Peer {
	uid: number;
	number: number;
	name: string;
	type: number;
	hostname: string;
	ipaddress: string;
	port: string;
	extension: string;
	pin: string;
	disabled: number;
	timestamp: number;
	changed: number;
}
type peerList = Peer[];


export {
    Package_decoded,
    PackageData_decoded,
    Package_decoded_1,
    Package_decoded_2,
    Package_decoded_3,
    Package_decoded_4,
    Package_decoded_5,
    Package_decoded_6,
    Package_decoded_7,
    Package_decoded_8,
    Package_decoded_9,
    Package_decoded_10,
    Package_decoded_255,
    PackageData_decoded_1,
    PackageData_decoded_2,
    PackageData_decoded_3,
    PackageData_decoded_4,
    PackageData_decoded_5,
    PackageData_decoded_6,
    PackageData_decoded_7,
    PackageData_decoded_8,
    PackageData_decoded_9,
    PackageData_decoded_10,
    PackageData_decoded_255,
    PackageData_encoded,
    Package_encoded,
    rawPackage,
    Peer,
    peerList,
}
