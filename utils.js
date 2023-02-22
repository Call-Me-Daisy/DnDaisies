const fs = require("fs");

const { Console } = require("console");
//--------------------------------------------------------------------GLOBAL
const UTILS = module.exports = {};

//--------------------------------------------------------------------MAIN
UTILS.addEntries = function(_obj, _entries) {
	for (const [key, val] of Object.entries(_entries)) {
		_obj[key] = val;
	}
	return _obj;
}

UTILS.createLoggerFromStreams = function(_logStream, _errStream) {
	return new Console({
	  stdout: _logStream,
	  stderr: _errStream
	});
}
UTILS.createLoggerFromFileNames = function(_logName, _errName) {
	return UTILS.createLoggerFromStreams(fs.createWriteStream(_logName), fs.createWriteStream(_errName));
}

UTILS.createLoggerFunctions = function(_logger) {
	return [
		(_str) => {
			console.log(_str);
			_logger.log(_str);
		},
		(_str) => {
			console.error(_str);
			_logger.error(_str);
		}
	];
}
UTILS.createLoggerFunctionsFromStreams = function(_logStream, _errStream) {
	return UTILS.createLoggerFunctions(UTILS.createLoggerFromStreams(_logStream, _errStream));
}
UTILS.createLoggerFunctionsFromFileNames = function(_logName, _errName) {
	return UTILS.createLoggerFunctions(UTILS.createLoggerFromFileNames(_logName, _errName));
}

UTILS.fetchFromUrl = async function(_url) {
	const response = await fetch(_url);
	if (!response.ok) { throw new Error(response.statusText); }
	return response;
}
UTILS.fetchJSON = async function(_url) {
	return UTILS.fetchFromUrl(_url).then((response) => { return response.json(); });
}
UTILS.fetchText = async function(_url) {
	return UTILS.fetchFromUrl(_url).then((response) => { return response.text(); });
}
