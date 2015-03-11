
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
		this.min_char = min_char;
		this.max_char = max_char;
		this.name = 'CharacterRange';
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
		if (this.s[0] === "[") {
			this.eat("[");
			this.parse_optionalinverter();
			this.parse_characterclass();
			this.eat("]");
		} else {
			throw "Parse error: called parse_characterset on something that wasn't a CharacterSet";
		}
		my_clog(' '.repeat(--this.level) + '}');
	}

	this.parse_optionalinverter = function() {
		my_clog(' '.repeat(this.level++) + 'parse_optionalinverter' + ' {');
		if (this.s[0] === "^") {
			this.eat("^");
		} else {
		}
		my_clog(' '.repeat(--this.level) + '}');
	}

	this.parse_characterclass = function() {
		my_clog(' '.repeat(this.level++) + 'parse_characterclass' + ' {');
		if (this.s[0] === "\\") {
			this.eat("\\");
			this.eat(this.s[0]);
			this.parse_characterclass();
		} else if (this.s[0] === "]") {
		} else {
			this.parse_characterrange();
			this.parse_characterclass();
		}
		my_clog(' '.repeat(--this.level) + '}');
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
		return CharacterRange(min_char, max_char);
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
