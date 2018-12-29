import { Socket } from "net";
import Interface from "./interfaces/Interface";

interface Client {
	socket:Socket;
	interface:Interface;
	numbers?: string[];
}

export default Client;