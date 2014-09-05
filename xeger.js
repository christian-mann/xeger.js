
function Xeger(r) {
	this.toplevel = new Regex(r).parse();
	this.max_infinite = 100;

	this.gen = function() {
		return this.generate_unit(this.toplevel);
	}

	this.generate_unit = function(u) {
		if (u.hasOwnProperty('name')) {
			if (u.name == 'Concat') {
				var ss = [];
				for (subunit of u.children) {
					ss.push(this.generate_unit(subunit));
				}
				return ss.join('');
			} else if (u.name == 'Or') {
				var rand = Math.floor(Math.random() * u.children.length);
				return this.generate_unit(u.children[rand]);
			} else if (u.name == 'Repeat') {
				var min = u.min;
				var max = u.max;
				if (max === Infinity) {
					max = this.max_infinite;
				}
				var amt = Math.floor(Math.random() * (max+1 - min) + min);
				var ss = [];
				for (var i = 0; i < amt; i++) {
					ss.push(this.generate_unit(u.child));
				}
				return ss.join('');
			} else if (u.name == 'CharacterRange') {
				var min_int = u.min_char.charCodeAt(0);
				var max_int = u.max_char.charCodeAt(0);
				var chosen_int = Math.floor(Math.random() * (max_int+1 - min_int) + min_int);
				return String.fromCharCode(chosen_int);
			} else {
				console.log(u);
				throw "Unrecognized unit -- "+u.name;
			}
		} else {
			return u;
		}
	}
}
