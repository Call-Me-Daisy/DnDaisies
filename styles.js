
//--------------------------------------------------------------------CONSTANTS
const STYLES = {};
//--------------------------------------------------------------------HELP
function scaleAlpha(_colStr, _r = 0.5) {
	return (function(_len){
		switch (_len % 4) {
			case 3: return _colStr + (255*_r).toString(16)[0];
			case 2: return _colStr + (255*_r).toString(16);
			case 0: return (function(){
				let n = Math.floor(_len / 3) - 1;
				let a = parseInt(_colStr.slice(_len - n), 16);
				return _colStr.slice(0, _len - n) + (a*_r).toString(16);
			})();
		}
	})(_colStr.length - 1);
}
function fullCode(_args) {
	return _args.code + ((_args.many) ? (_args.i).toString() : "");
}
//--------------------------------------------------------------------MAIN
class StyleType {
	constructor(_typeName, _increase = true) {
		this.ID_MAKER = 0;
		this.increase = _increase;
		this.default = undefined;
		STYLES[_typeName] = this;
	}

	addStyle(_styleName, _style) {
		if (this.ID_MAKER === 0) {this.default = _style;}
		_style.id = (this.increase) ? ++this.ID_MAKER : --this.ID_MAKER;
		this[_styleName] = _style;
	}
}
class Style extends Function {
	constructor(_type, _name, _onCall) {
		if (STYLES[_type] === undefined) {STYLES[_type] = new StyleType(_type);}
		let type = STYLES[_type];

		function onCall(){return _onCall(...arguments);}
		Object.setPrototypeOf(onCall, Style.prototype);

		type.addStyle(_name, onCall);
		return onCall;
	}
}
//--------------------------------------------------------------------POPULATE
new StyleType("general", false);
new Style("general", "none", function(){});

new Style("cell", "rect", function(_brush){_brush.fillRect();});
new Style("cell", "ellipse", function(_brush){_brush.fillEllipse();});
new Style("cell", "clear", function(_brush){_brush.clear();});

new Style("token", "fill", function(_brush, _token, _cell, _args){
	_brush.ctx.fillStyle = _args.colour;
	_cell(_brush.setFrom(_token));
});
new Style("token", "grid", function(_brush, _token, _cell, _args){
	_brush.ctx.fillStyle = _args.colour;
	_brush.setDim(1, 1);
	for (let y = _token.y; y < _token.y + _token.v; y++) {
		for (let x = _token.x; x < _token.x + _token.h; x++) {
			_cell(_brush.setPos(x, y));
		}
	}
});
new Style("token", "layer", function(_brush, _token, _cell, _args){
	STYLES.token.fill(_brush, _token, _cell, _args);
	_brush.ctx.fillStyle = scaleAlpha(_args.colour, 0.5);
	_cell(_brush.centerStretch(3));
});
new Style("token", "image", async function(_brush, _token, _cell, _args){
	try {
		if (_args.error) {throw "";}
		_brush.setFrom(_token);
		_brush.draw(await _args.img);
	} catch {
		STYLES.token.default(_brush, _token, _cell, _args);
		_args.error = true;
	}
});

new Style("name", "middle", function(_brush, _token, _args){
	_brush.setFrom(_token);
	_brush.write(fullCode(_args));
});
new Style("name", "corner", function(_brush, _token, _args){
	let code = fullCode(_args);
	_brush.reset();
	for (const i of [0, 1]) {
		for (const j of [0, 1]) {
			_brush.setPos(_token.x + i*(_token.h - 1), _token.y + j*(_token.v - 1));
			_brush.write(code);
		}
	}
});
new Style("name", "partial", function(_brush, _token, _args){
	if (_args.error) {
		STYLES.name.default(_brush, _token, _args);
	}
	else if (_args.many) {
		_brush.setFrom(_token);
		_brush.write((_args.i).toString());
	}
});

const trans = "rgba(0,0,0,0)";
new Style("light", "gradient", function(_brush, _token, _args){
	_brush.set(_token.x, _token.y, _args.radius, _args.radius).alterPos(.5, .5);
	let g = _brush.ctx.createRadialGradient(_brush.x, _brush.y, 0, _brush.x, _brush.y, _brush.h);
	g.addColorStop(0, _args.shadow);
	if (_args.startFade > 0){g.addColorStop((_args.startFade < 1) ? _args.startFade : 1, _args.shadow);}
	g.addColorStop(1, trans);
	_brush.ctx.fillStyle = g;
	_brush.alterPos(-_args.radius/2, -_args.radius/2);
	_brush.centerStretch(2);
	_brush.fillRect();
});

new Style("guide", "rect", function(_brush, _args){
	_brush.set(_args.origin[0], _args.origin[1], _args.dim[0], _args.dim[1]).adjust();
	_brush.ctx.strokeRect(_brush.x, _brush.y, _brush.h, _brush.v);
});
new Style("guide", "line", function(_brush, _args){
	_brush.setPos(_args.origin[0], _args.origin[1]).adjust();
	_brush.ctx.beginPath();
	_brush.ctx.moveTo(_brush.x, _brush.y);
	_brush.setPos(_args.pos[0], _args.pos[1]).adjust();
	_brush.ctx.lineTo(_brush.x, _brush.y);
	_brush.ctx.stroke();
});
new Style("guide", "ellipse", function(_brush, _args){
	_brush.setPos(_args.origin[0], _args.origin[1]).adjust();
	_brush.setDim(_args.radii[0], (_args.radii[1] === undefined) ? _args.radii[0] : _args.radii[1]);
	_brush.ctx.beginPath();
	_brush.ctx.ellipse(_brush.x, _brush.y, _brush.h, _brush.v, 0, 0, Math.PI*2);
	_brush.ctx.stroke();
});
new Style("guide", "cone", function(_brush, _args){
	_brush.setPos(_args.origin[0], _args.origin[1]).adjust();
	_brush.setDim(_args.radii[0]-1, (_args.radii[1] === undefined) ? _args.radii[0]-1 : _args.radii[1]-1);

	let c = Math.cos(_args.theta), s = Math.sin(_args.theta);
	let dr0 = [_brush.h*s, _brush.h*-c];
	let dr1 = [(_brush.v - _brush.ctx.lineWidth/2)*c/2, (_brush.v - _brush.ctx.lineWidth/2)*s/2];

	_brush.alterPos(s,-c);

	_brush.ctx.beginPath();
	_brush.ctx.moveTo(_brush.x, _brush.y);
	_brush.ctx.lineTo(_brush.x + dr0[0] - dr1[0], _brush.y + dr0[1] - dr1[1]);
	_brush.ctx.lineTo(_brush.x + dr0[0] + dr1[0], _brush.y + dr0[1] + dr1[1]);
	_brush.ctx.closePath();
	_brush.ctx.stroke();

	_brush.reset();
});
new Style("guide", "sundail", function(_brush, _args){
	if (_args.pos[0] === undefined) {
		STYLES.guide.ellipse(_brush, _args);
		_args.pos = [_args.origin[0] + _args.radii[0], _args.origin[1]];
		STYLES.guide.line(_brush, _args);
	}
	else {
		STYLES.guide.line(_brush, _args);
		_args.radii = [Math.sqrt((_args.pos[0] - _args.origin[0])**2 + (_args.pos[1] - _args.origin[1])**2)];
		STYLES.guide.ellipse(_brush, _args);
	}
});
new Style("guide", "spider", function(_brush, _args){
	for (const pos of _args.posLs) {
		_args.pos = pos;
		STYLES.guide.line(_brush, _args);
	}
});

//--------------------------------------------------------------------FINALIZE
export {
	STYLES
}
