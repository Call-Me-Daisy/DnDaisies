const fs = require("fs");
const logRaw = require("node-file-logger");
//--------------------------------------------------------------------GLOBAL
const logOptions = {
	timeZone: "Europe/London",
	folderPath: "./logs/",
	dateBasedFileNaming: false,
	fileName: "latest",
	fileNameExtension: '.log',
	dateFormat: "YYYY_MM_D",
	timeFormat: "hh:mm:ss",
	onlyFileLogging: false
}
logRaw.SetUserOptions(logOptions);

const UTILS = module.exports = {};

//--------------------------------------------------------------------MAIN
UTILS.log = {
	raw: logRaw,

	clear: async () => {
		return fs.writeFile(logOptions.folderPath + logOptions.fileName + logOptions.fileNameExtension, '', (error) => {
			error && log.error(error);
		});
	},
	standardLog: (_logger, _obj) => {
		(_obj.stack)
			? _logger(_obj.message, undefined, _obj.stack.slice(_obj.stack.indexOf("\n")))
			: _logger(_obj)
		;
	},

	info: function (_obj) {
		this.standardLog(logRaw.Info, _obj);
	},
	debug: function (_obj) {
		this.standardLog(logRaw.Debug, _obj);
	},
	trace: function (_obj) {
		this.standardLog(logRaw.Trace, _obj);
	},
	warn: function (_obj) {
		this.standardLog(logRaw.Warn, _obj);
	},
	error: function (_obj) {
		this.standardLog(logRaw.Error, _obj);
	},
	fatal: function (_obj) {
		this.standardLog(logRaw.Fatal, _obj);
	}
}

UTILS.addEntries = function(_obj, _entries) {
	for (const [key, val] of Object.entries(_entries)) {
		_obj[key] = val;
	}
	return _obj;
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

UTILS.buildChoices = function(_spec) {
	return Object.keys(_spec).map((name) => { return {name, value: name}; });
}
