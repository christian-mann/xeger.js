
// library
String.prototype.repeat = function( num )
{
	    return new Array( num + 1 ).join( this );
}

function Xeger (regex, random) {
	this.automaton;
	this.random = random || new Random();

	this.generate = function() {}
};

function Regex (r) {
	this.s = r;
	this.level = 0;

	this.eat = function(c) {
		if (this.s[0] === c) {
			console.log(' '.repeat(this.level) + 'eating '+this.s[0]);
			this.s = this.s.substring(1);
		} else {
			throw "Tried to eat "+c+" but got "+this.s[0]+" :(";
		}
	}

	this.parse_integer = function() {
		console.log(' '.repeat(this.level++) + 'parse_integer {');
		while (["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].indexOf(this.s[0]) != -1) {
			this.eat(this.s[0]);
		}
		console.log(' '.repeat(--this.level) + '}');
	}

	this.parse_regex = function() {
		console.log(' '.repeat(this.level++) + 'parse_regex' + ' {');
		this.parse_term();
		this.parse_regex2();
		console.log(' '.repeat(--this.level) + '}');
	};
	
	this.parse_regex2 = function() {
		console.log(' '.repeat(this.level++) + 'parse_regex2' + ' {');
		if (this.s[0] === "|") {
			this.eat("|");
			this.parse_regex();
		} else if (this.s[0] === ")") {
		}
		console.log(' '.repeat(--this.level) + '}');
	};

	this.parse_term = function() {
		console.log(' '.repeat(this.level++) + 'parse_term' + ' {');
		if (this.s.length === 0) {
		} else if (this.s[0] === "|") {
		} else if (this.s[0] === ")") {
		} else {
			this.parse_factor();
			this.parse_optionalrepeat();
			this.parse_term();
		}
		console.log(' '.repeat(--this.level) + '}');
	}

	this.parse_factor = function() {
		console.log(' '.repeat(this.level++) + 'parse_factor' + ' {');
		if (this.s[0] === "\\") {
			this.parse_escape();
		} else if (this.s[0] === "[") {
			this.parse_characterset();
		} else if (this.s[0] === "(") {
			this.eat("(");
			this.parse_regex();
			this.eat(")");
		} else if (this.s[0] === ".") {
			this.eat(".");
		} else {
			this.eat(this.s[0]); // whatever
		}
		console.log(' '.repeat(--this.level) + '}');
	}

	this.parse_optionalrepeat = function() {
		console.log(' '.repeat(this.level++) + 'parse_optionalrepeat' + ' {');
		if (this.s[0] === "*") {
			this.eat("*");
		} else if (this.s[0] === "+") {
			this.eat("+");
		} else if (this.s[0] === "?") {
			this.eat("?");
		} else if (this.s[0] === "{") {
			this.parse_numberedrepeat();
		} else {
		}
		console.log(' '.repeat(--this.level) + '}');
	}

	this.parse_characterset = function() {
		console.log(' '.repeat(this.level++) + 'parse_characterset' + ' {');
		if (this.s[0] === "[") {
			this.eat("[");
			this.parse_optionalinverter();
			this.parse_characterclass();
		} else {
			throw "Parse error: called parse_characterset on something that wasn't a CharacterSet";
		}
		console.log(' '.repeat(--this.level) + '}');
	}

	this.parse_optionalinverter = function() {
		console.log(' '.repeat(this.level++) + 'parse_optionalinverter' + ' {');
		if (this.s[0] === "^") {
			this.eat("^");
		} else {
		}
		console.log(' '.repeat(--this.level) + '}');
	}

	this.parse_characterclass = function() {
		console.log(' '.repeat(this.level++) + 'parse_characterclass' + ' {');
		if (this.s[0] === "\\") {
			this.eat("\\");
			this.eat(this.s[0]);
			this.parse_characterclass();
		} else if (this.s[0] === "]") {
		} else {
			this.parse_characterrange();
			this.parse_characterclass();
		}
		console.log(' '.repeat(--this.level) + '}');
	}
	
	this.parse_characterrange = function() {
		console.log(' '.repeat(this.level++) + 'parse_characterrange' + ' {');
		if (this.s[0] === "\\") {
			this.parse_escape();
		} else {
			this.eat(this.s[0]);
		}
		this.eat("-");
		if (this.s[0] === "\\") {
			this.parse_escape();
		} else {
			this.eat(this.s[0]);
		}
		console.log(' '.repeat(--this.level) + '}');
	}

	this.parse_numberedrepeat = function() {
		console.log(' '.repeat(this.level++) + 'parse_numberedrepeat' + ' {');
		if (this.s[0] === "{") {
			this.eat("{");
			this.parse_integer();
			this.parse_numberedrepeat2();
		} else {
			throw "Parse error: Called parse_numberedrepeat on something that is not a NumberedRepeat";
		}
		console.log(' '.repeat(--this.level) + '}');
	}

	this.parse_numberedrepeat2 = function() {
		console.log(' '.repeat(this.level++) + 'parse_numberedrepeat2' + ' {');
		if (this.s[0] === ",") {
			this.eat(",");
			this.parse_integer();
			this.eat("}");
		} else if (this.s[0] === "}") {
			this.eat("}");
		}
		console.log(' '.repeat(--this.level) + '}');
	}
};
