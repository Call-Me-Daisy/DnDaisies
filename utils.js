//--------------------------------------------------------------------TREEMAP
//------------------------------------HELP:TREEMAP
//------------------------------------MAIN:TREEMAP
class TreeMap extends Map {
	constructor(_leaves, _branch, _entries) {
		super();
		this.branch = (_branch === undefined || _branch < 0) ? 0 : _branch;
		this.leaves = (_leaves === undefined || _leaves < this.branch) ? this.branch : _leaves;
		if (_entries !== undefined) {
			for (const [key, val] of _entries) {
				this.set(key, val);
			}
		}
	}

	isLeaves() {
		return !(this.branch < this.leaves);
	}
	nextBrach(_key, _onlyGet = false) {
		let key = _key[this.branch];
		if (super.get(key) === undefined) {
			if (_onlyGet) {return undefined;}
			super.set(key, (this.isLeaves()) ? new Map() : new TreeMap(this.leaves, this.branch + 1));
		}
		return super.get(key);
	}

	get(_key) {
		let branch = this.nextBranch(_key, true);
		return (branch) ? branch.get(_key) : branch;
	}
	set(_key, _val) {
		return this.nextBranch(_key).set(_key, val);
	}
}
//--------------------------------------------------------------------MULTIMAP
//------------------------------------HELP:MULTIMAP
function doMulti(_map, _entries) {
	for (const [keyLs, val] of _entries) {
		for (const key of keyLs) {_map.set(key, val);}
	}
	return _map;
}
//------------------------------------MAIN:MULTIMAP
class MultiMap {
	static newMap(_entries) {
		return doMulti(new Map(), _entries);
	}
	static newTree(_leaves, _entries) {
		return doMulti(new TreeMap(_leaves), _entries);
	}
}
//--------------------------------------------------------------------FINALIZE
export {
	MultiMap,
	TreeMap
}
