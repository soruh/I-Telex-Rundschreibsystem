import assert = require("assert");

const config: {
	LOGBAUDOTINTERFACE: number,
	PORT: number,
	TLN_SERVER_HOST: string,
	TLN_SERVER_PORT: number,
	LOCAL_NUMBER: number | null,
	IDENTIFIER: string,
	CONNECT_TIMEOUT: number,
	CONFIRMATION_MAX_RESULT_DURATION: number,
	CONFIRMATION_MAX_RESULT_WAIT: number,
	// tslint:disable-next-line:no-var-requires
} = require('../config.json');


assert(typeof config.LOGBAUDOTINTERFACE == "number");
assert(typeof config.PORT == "number");
assert(typeof config.TLN_SERVER_HOST == "string");
assert(typeof config.TLN_SERVER_PORT == "number");
assert(config.LOCAL_NUMBER === null || typeof config.LOCAL_NUMBER == "number");
assert(typeof config.IDENTIFIER == "string");
assert(typeof config.CONNECT_TIMEOUT == "number");
assert(typeof config.CONFIRMATION_MAX_RESULT_DURATION == "number");
assert(typeof config.CONFIRMATION_MAX_RESULT_WAIT == "number");


export = config;
