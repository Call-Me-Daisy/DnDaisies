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
