//--------------------------------------------------------------------RECT
class Rect {
	constructor(_x, _y, _h, _v) {
		this.x = 0;
		this.y = 0;
		this.h = 0;
		this.v = 0;
		this.setAbs(_x, _y, _h, _v);
	}

	setAbs(_x, _y, _h, _v) {
		if (_x >= 0) {this.x = _x;}
		if (_y >= 0) {this.y = _y;}
		if (_h >= 1) {this.h = _h;}
		if (_v >= 1) {this.v = _v;}
		return this;
	}
	alterAbs(_dx, _dy, _dh, _dv) {
		let x = (_dx) ? this.x + _dx : -1;
		let y = (_dy) ? this.y + _dy : -1;
		let h = (_dh) ? this.h + _dh : -1;
		let v = (_dv) ? this.v + _dv : -1;
		return this.setAbs(x, y, h, v);
	}

	setPos(_x, _y) {
		return this.setAbs(_x, _y, -1, -1);
	}
	setDim(_h, _v) {
		return this.setAbs(-1, -1, _h, _v);
	}
	alterPos(_dx, _dy) {
		return this.alterAbs(_dx, _dy, false, false);
	}
	alterDim(_dh, _dv) {
		return this.alterAbs(false, false, _dh, _dv);
	}

	set(_x, _y, _h, _v) {
		return this.setPos(_x, _y).setDim(_h, _v);
	}
	alter(_dx, _dy, _dh, _dv) {
		return this.alterPos(_dx, _dy).alterDim(_dh, _dv);
	}

	setFrom(_that) {
		return this.set(_that.x, _that.y, _that.h, _that.v);
	}
	alterBy(_that) {
		return this.alter(_that.x, _that.y, _that.h, _that.v);
	}

	centerStretch(_h, _v) {
		return this.setAbs(this.x + (this.h-_h)/2, this.y + (this.v-_v)/2, _h, _v);
	}
}
//--------------------------------------------------------------------TREEMAP
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
class MultiMap {
	static doMulti(_map, _entries) {
		for (const [keyLs, val] of _entries) {
			for (const key of keyLs) {_map.set(key, val);}
		}
		return _map;
	}
	static newMap(_entries) {
		return MultiMap.doMulti(new Map(), _entries);
	}
	static newTree(_leaves, _entries) {
		return MultiMap.doMulti(new TreeMap(_leaves), _entries);
	}
}
//--------------------------------------------------------------------FINALIZE
export {
	Rect,
	MultiMap,
	TreeMap
}
