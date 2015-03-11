
// library
String.prototype.repeat = function(num)
{
	    return new Array(num + 1).join(this);
}

Array.prototype.extend = function (other_array) {
	other_array.forEach(function(v) {this.push(v)}, this);    
}

function my_clog(m) {
	if (window.debug) {
		return console.log(m);
	}
}

function Regex(r) {
	this.s = r;
	this.level = 0;

	function Unit(name, children) {
		this.name = name;
		this.children = children;

		// flatten so that Or(Or(a, b), c) -> Or(a, b, c)
		var new_children = [];
		for (c of this.children) {
			if (c.name !== undefined && c.name === this.name) {
				new_children.extend(c.children);
			} else {
				new_children.push(c);
			}
		}
		this.children = new_children;
	}

	function Or(child1, child2) {
		return new Unit('Or', [child1, child2]);
	}

	function Concat(child1, child2) {
		return new Unit('Concat', [child1, child2]);
	}

	function Repeat(child, min, max) {
		this.child = child;
		this.min = min;
		this.max = max;
		this.name = 'Repeat';

		if (min === undefined) {
			throw "Internal error at Repeat";
		}

		this.toString = function() {
			return 'Repeat' + '(' + child.toString + ', ' + min + (max === undefined ? '' : ', ' + max);
		}
	}

	function CharacterRange(min_char, max_char) {
		if (max_char < min_char) {
			throw "Invalid character range: " + min_char + "-" + max_char;
		}
		this.min_char = min_char;
		this.max_char = max_char;
		this.name = 'CharacterRange';
	}

	function CharacterClass(ranges) {
		// This would most reasonably be a bitstring, but I wanted to save space or something
		// so it uses an algorithm similar to the skyline problem
		this.ranges = ranges || [];
		this.name = 'CharacterClass';

		this.add_range = function(r) {
			var new_ranges = [];
			var i = 0;
			while (i < this.ranges.length) {
				if (r.max_char.charCodeAt(0) < this.ranges[i].min_char.charCodeAt(0)) {
					// the new range is entirely before our first one
					new_ranges.push(r);
					new_ranges.extend(this.ranges.slice(i));
					this.ranges = new_ranges;
					return;
				} else if (this.ranges[i].max_char < r.min_char) {
					// new range is entirely after our first one
					new_ranges.push(this.ranges[i]);
					i += 1;
				} else {
					// the new range overlaps with our first one
					r.max_char = String.fromCharCode(Math.max(
							r.max_char.charCodeAt(0),
							this.ranges[i].max_char.charCodeAt(0)
					));

					r.min_char = String.fromCharCode(Math.min(
							r.min_char.charCodeAt(0),
							this.ranges[i].min_char.charCodeAt(0)
					));
					i += 1;
				}
			}
			// if we are here then r still needs to be added
			new_ranges.push(r);
			this.ranges = new_ranges;
			return;
		}

		this.invert_printable = function() {
			var new_ranges = [];
			var cursor = 0x20;
			var i = 0;
			while (cursor < 0x7E) {
				if (i >= this.ranges.length) {
					// out of (negative) ranges, go to end
					new_ranges.push(new CharacterRange(String.fromCharCode(cursor), String.fromCharCode(0x7E)));
					break;
				}
				if (cursor < this.ranges[i].min_char.charCodeAt(0)) {
					// more printable stuff to add
					new_ranges.push(new CharacterRange(
							String.fromCharCode(cursor),
							String.fromCharCode(this.ranges[i].min_char.charCodeAt(0) - 1)
					));
				}
				cursor = this.ranges[i].max_char.charCodeAt(0) + 1;
				i += 1;
			}
			this.ranges = new_ranges;
		}
	}

	this.eat = function(c) {
		if (this.s[0] === c) {
			my_clog(' '.repeat(this.level) + 'eating '+this.s[0]);
			var c = this.s[0];
			this.s = this.s.substring(1);
			return c;
		} else {
			throw "Tried to eat "+c+" but got "+this.s[0]+" :(";
		}
	}

	this.parse_escape = function() {
		my_clog(' '.repeat(this.level++) + 'parse_escape {');
		this.eat('\\');
		var c = this.eat(this.s[0]);
		return c;
	}

	this.parse_integer = function() {
		my_clog(' '.repeat(this.level++) + 'parse_integer {');
		var n = 0; 
		while (["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].indexOf(this.s[0]) != -1) {
			var c = this.eat(this.s[0]);
			n *= 10;
			n += parseInt(c);
		}
		my_clog(' '.repeat(--this.level) + '}');
		return n;
	}

	this.parse_regex = function() {
		my_clog(' '.repeat(this.level++) + 'parse_regex' + ' {');
		var term = this.parse_term();
		var regex2 = this.parse_regex2();
		my_clog(' '.repeat(--this.level) + '}');
		if (regex2 !== undefined) {
			return new Or(term, regex2);
		} else {
			return term;
		}
	};
	
	this.parse_regex2 = function() {
		my_clog(' '.repeat(this.level++) + 'parse_regex2' + ' {');
		if (this.s[0] === "|") {
			this.eat("|");
			var regex = this.parse_regex();
			my_clog(' '.repeat(--this.level) + '}');
			return regex;
		} else if (this.s[0] === ")") {
			my_clog(' '.repeat(--this.level) + '}');
			return undefined;
		}
	};

	this.parse_term = function() {
		my_clog(' '.repeat(this.level++) + 'parse_term' + ' {');
		if (this.s.length === 0 || this.s[0] === "|" || this.s[0] === ")") {
			my_clog(' '.repeat(--this.level) + '}');
		} else {
			var factor = this.parse_factor();
			var opt_rep = this.parse_optionalrepeat();
			var term = this.parse_term();
			
			var repeated;
			if (opt_rep !== undefined) {
				repeated = new Repeat(factor, opt_rep['min'], opt_rep['max']);
			} else {
				repeated = factor;
			}

			if (term !== undefined) {
				my_clog(' '.repeat(--this.level) + '}');
				return new Concat(repeated, term);
			} else {
				my_clog(' '.repeat(--this.level) + '}');
				return repeated;
			}
		}
	}

	this.parse_factor = function() {
		my_clog(' '.repeat(this.level++) + 'parse_factor' + ' {');
		var reg;
		if (this.s[0] === "\\") {
			reg = this.parse_escape();
		} else if (this.s[0] === "[") {
			reg = this.parse_characterset();
		} else if (this.s[0] === "(") {
			this.eat("(");
			reg = this.parse_regex();
			this.eat(")");
		} else if (this.s[0] === ".") {
			this.eat(".");
			reg = '.'
		} else {
			reg = this.eat(this.s[0]); // whatever
		}
		my_clog(' '.repeat(--this.level) + '}');
		return reg;
	}

	this.parse_optionalrepeat = function() {
		my_clog(' '.repeat(this.level++) + 'parse_optionalrepeat' + ' {');
		var rep;
		if (this.s[0] === "*") {
			this.eat("*");
			rep = {'min': 0, 'max': Infinity};
		} else if (this.s[0] === "+") {
			this.eat("+");
			rep = {'min': 1, 'max': Infinity};
		} else if (this.s[0] === "?") {
			this.eat("?");
			rep = {'min': 0, 'max': 1};
		} else if (this.s[0] === "{") {
			rep = this.parse_numberedrepeat();
		} else {
			rep = undefined;
		}
		my_clog(' '.repeat(--this.level) + '}');
		return rep;
	}

	this.parse_characterset = function() {
		my_clog(' '.repeat(this.level++) + 'parse_characterset' + ' {');
		var charset;
		if (this.s[0] === "[") {
			this.eat("[");
			var should_invert = this.parse_optionalinverter();
			charset = this.parse_characterclass();
			this.eat("]");

			if (should_invert) {
				charset.invert_printable();
			}
		} else {
			throw "Parse error: called parse_characterset on something that wasn't a CharacterSet";
		}
		my_clog(' '.repeat(--this.level) + '}');
		return charset;
	}

	this.parse_optionalinverter = function() {
		my_clog(' '.repeat(this.level++) + 'parse_optionalinverter' + ' {');
		try {
			if (this.s[0] === "^") {
				this.eat("^");
				return true;
			} else {
				return false;
			}
		} finally {
			my_clog(' '.repeat(--this.level) + '}');
		}
	}

	this.parse_characterclass = function() {
		// this parses a string of character classes
		// to be used inside square brackets
		my_clog(' '.repeat(this.level++) + 'parse_characterclass(' + this.s + ' {');
		try {
			if (this.s[0] === "]") {
				return new CharacterClass();
			} else {
				var first_range = this.parse_characterrange();
				var other_class = this.parse_characterclass();
				other_class.add_range(first_range);
				return other_class;
			}
		} finally {
			my_clog(' '.repeat(--this.level) + '}');
		}
	}

	this.parse_characterrange = function() {
		my_clog(' '.repeat(this.level++) + 'parse_characterrange' + ' {');
		var min_char;
		var max_char;
		if (this.s[0] === "\\") {
			min_char = this.parse_escape();
		} else {
			min_char = this.eat(this.s[0]);
		}
		if (this.s[0] === "-") {
			// character range of the form a-c
			this.eat("-");
			if (this.s[0] === "\\") {
				max_char = this.parse_escape();
			} else {
				max_char = this.eat(this.s[0]);
			}
		} else {
			// "character range" of one character only
			max_char = min_char;
		}
		my_clog(' '.repeat(--this.level) + '}');
		return new CharacterRange(min_char, max_char);
	}

	this.parse_numberedrepeat = function() {
		my_clog(' '.repeat(this.level++) + 'parse_numberedrepeat' + ' {');
		if (this.s[0] === "{") {
			this.eat("{");
			var min = this.parse_integer();
			var res1 = this.parse_numberedrepeat2();
			my_clog(' '.repeat(--this.level) + '}');
			if (res1 === undefined) {
				var max = min;
			} else {
				var max = res1['max'];
			}
			return {'min': min, 'max': max};
		} else {
			throw "Parse error: Called parse_numberedrepeat on something that is not a NumberedRepeat";
		}
	}

	this.parse_numberedrepeat2 = function() {
		my_clog(' '.repeat(this.level++) + 'parse_numberedrepeat2' + ' {');
		if (this.s[0] === ",") {
			this.eat(",");
			var max = this.parse_integer();
			this.eat("}");
			my_clog(' '.repeat(--this.level) + '}');
			return {'max': max};
		} else if (this.s[0] === "}") {
			this.eat("}");
			my_clog(' '.repeat(--this.level) + '}');
			return undefined;
		} else {
			throw "Parse error while parsing NumberedRepeat2: Expected one of \",\", \"}\"; received "+this.s[0];
		}
	}

	this.parse = this.parse_regex;
};
