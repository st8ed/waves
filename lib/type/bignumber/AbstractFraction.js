function AbstractFraction(baseType_) {
	// Abstract greatest common divisor method
	function gcd(a, b) {
        if (!a.isInt() || !b.isInt())
            return ONE; // For infinities or NaN 

        a = a.abs();
        b = b.abs();

        if (b.gt(a)) {
            var temp = a;
            a = b;
            b = temp;
        }

        while (true) {
            if (b.isZero())
                return a;

            a = a.mod(b);

            if (a.isZero())
                return b;

            b = b.mod(a);
        }
    }
	
	var baseType; 
	
	var ZERO;
	var ONE;

	var s;
	var n;
	var d;

	function parse(that, a, b) {
		if(that.baseType !== baseType) {
			// Switch local variables to current baseType
			baseType = that.baseType;
			ZERO = new baseType(0);
			ONE = new baseType(1);
		}
		
        if (typeof(a) == 'object' && a.isFractionBased == true && b == undefined) {
            s = a.s;
            n = new baseType(a.n);
            d = new baseType(a.d);
			
        } else if (a == undefined && b == undefined) {
            s = 1;
            n = ZERO;
            d = ONE;
			
			return; // Nothing to simplify
        } else if (a instanceof baseType && b == undefined) { // TODO: swap?
            s = a.isNegative() ? -1 : 1;
            n = new baseType(a.abs());
            d = ONE;
			
        } else if (a instanceof baseType && b instanceof baseType) {
            if (b.isZero())
                throw 'Division by zero';

            s = (a.isNegative() ? -1 : 1) * (b.isNegative() ? -1 : 1);
            n = new baseType(a.abs());
            d = new baseType(b.abs());
			
        } else {
            n = new baseType(a);
            d = (b === undefined) ? ONE : new baseType(b);
			
            if (d.isZero())
                throw 'Division by zero';

            s = (n.isNegative() ? -1 : 1) * (d.isNegative() ? -1 : 1);
            n = n.abs();
            d = d.abs();
			
        }
		
		// Decompose numerator
		if(!n.isInt() && n.isFinite()) {
			var arr = n.toFraction();
			return parse(that, arr[0], d.times(arr[1]).times(s));
		}
		
		// Decompose denominator
		if(!d.isInt() && d.isFinite()) {
			var arr = d.toFraction();
			return parse(that, n.times(arr[1]).times(s), arr[0]);
		}
	};
	
    var Fraction = function(a, b, c) {
        if (!(this instanceof Fraction))
            return new Fraction(a, b, c);
			
		this.baseType = Fraction.baseType;
		this.precision = Fraction.baseType.precision;

		parse(this, a, b);
					
        a = gcd(n, d);
		
		// TODO config(precision + 1)
		
		this.s = n.isZero() ? 1 : (c || s); // Zero sign ambiguous fix
        this.n = n.div(a);
        this.d = d.div(a);
    }
	
	Fraction.changeBaseType = function(baseType) {
		Fraction.baseType = baseType;
		Fraction.precision = baseType.precision;
		//console.log('precision: ', Fraction.precision, new Error('w').stack);
	}
	
	// Register locally stored baseType
	Fraction.changeBaseType(baseType_); 
	
	Fraction.prototype.isFractionBased = true;
	
	Fraction.prototype.abs = function() {
		return new Fraction(this.n, this.d);
	};

	Fraction.prototype.neg = function() {
		return new Fraction(this.n, this.d, -1 * this.s);
	};

	Fraction.prototype.plus = function(a, b) {
		parse(this, a, b);
		
		return new Fraction(
			this.n.times(this.s).times(d).plus(this.d.times(s).times(n)),
			this.d.times(d)
		);
	};

	Fraction.prototype.minus = function(a, b) {
		parse(this, a, b);
		
		return new Fraction(
			this.n.times(this.s).times(d).minus(this.d.times(s).times(n)),
			this.d.times(d)
		);
	};

	Fraction.prototype.times = function(a, b) {
		parse(this, a, b);
		return new Fraction(
			this.n.times(n),
			this.d.times(d),
			this.s * s
		);
	};

	Fraction.prototype.div = function(a, b) {
		parse(this, a, b);
		return new Fraction(
			this.n.div(n),
			this.d.div(d),
			this.s * s
		);
	};

	Fraction.prototype.inverse = function() {
		return new Fraction(this.d, this.n, this.s);
	};
	
	Fraction.prototype.mod = function(a, b) {
		if (a === undefined) {
			return new Fraction(this.n.mod(this.d), 1, this.s);
		}

		parse(this, a, b);
		if (n.isZero() && this.n.isZero())
			throw 'Division by zero';

		return new Fraction(
			d.times(this.n).mod(n.times(this.d)),
			d.times(this.d),
			this.s
		);
	};

	Fraction.prototype.gcd = function(a, b) {
		parse(this, a, b);

		return new Fraction(
			gcd(n, this.n),
			d.times(this.d).div(gcd(d, this.d)) // todo: do we really need division?
		);
	};

	Fraction.prototype.lcm = function(a, b) {
		parse(this, a, b);

		if (n.isZero() && this.n.isZero())
			return new Fraction; // Zero

		return new Fraction(
			n.times(this.n).div(gcd(n, this.n)),
			gcd(d, this.d)
		);
	};
	
	Fraction.prototype.getNominator = function() {
		return new Fraction(this.n);
	}
	
	Fraction.prototype.getDenumerator = function() {
		return new Fraction(this.d);
	}

	Fraction.prototype.ceil = function(places) {
		if (!this.isFinite())
			return new Fraction(this);

		places = Math.pow(10, places || 0);

		return new Fraction(
			this.n.div(this.d).times(this.s).times(places).ceil(),
			places
		);
	};

	Fraction.prototype.floor = function(places) {
		if (!this.isFinite())
			return new Fraction(this);

		places = Math.pow(10, places || 0);

		return new Fraction(
			this.n.div(this.d).times(this.s).times(places).floor(),
			places
		);
	};

	Fraction.prototype.round = function(places) {
		if (!this.isFinite())
			return new Fraction(this);

		places = Math.pow(10, places || 0);

		return new Fraction(
			this.n.div(this.d).times(this.s).times(places).round(),
			places
		);
	};
	
	Fraction.prototype.trunc = function(places) {
		if (!this.isFinite())
			return new Fraction(this);

		places = Math.pow(10, places || 0);

		return new Fraction(
			this.n.div(this.d).times(this.s).times(places).trunc(),
			places
		);
	};

	Fraction.prototype.equals = function(a, b) {
		parse(this, a, b);
		return (this.s == s && this.n == n && this.d == d);
	};

	Fraction.prototype.eq = function(a, b) {
		return this.equals(a, b);
	};

	Fraction.prototype.cmp = function(a, b) {
		parse(this, a, b);

		// numerator of difference
		var t = this.n.times(this.s).times(d).minus(this.d.times(s).times(n));

		return (t.gt(ZERO) ? 1 : 0) - (t.lt(ZERO) ? 1 : 0);
	};

	Fraction.prototype.gte = function(a, b) {
		return this.cmp(a, b) >= 0;
	};

	Fraction.prototype.gt = function(a, b) {
		return this.cmp(a, b) > 0;
	};

	Fraction.prototype.lte = function(a, b) {
		return this.cmp(a, b) <= 0;
	};

	Fraction.prototype.lt = function(a, b) {
		return this.cmp(a, b) < 0;
	};

	Fraction.prototype.isZero = function() {
		return this.n.isZero();
	};

	Fraction.prototype.isPositive = function() {
		return this.s == 1 && !this.isZero();
	};

	Fraction.prototype.isNegative = function() {
		return this.s == -1;
	};

	Fraction.prototype.isFinite = function() {
		return this.n.isFinite() && this.d.isFinite();
	};

	Fraction.prototype.isNaN = function() {
		return this.n.isNaN() || this.d.isNaN();
	};

	Fraction.prototype.isInteger = function() {
		return this.d.equals(1) && this.n.isFinite();
	};

	Fraction.prototype.isInt = function() {
		return this.d.equals(1) && this.n.isFinite();
	};
	
	Fraction.prototype.pow = function(m) {
		if (m < 0)
			return new Fraction(
				this.d.times(this.s).pow(-m),
				this.n.pow(-m)
			);
		else
			return new Fraction(
				this.d.times(this.s).pow(m),
				this.n.pow(m)
			);
	};

	Fraction.prototype.atan2 = function(y, x) {
		return new Fraction(baseType.atan2(y, x));
	};
	
	Fraction.prototype.toSignificantDigits = function(sd, rm) {
		return new Fraction(this.n.div(this.d).times(this.s).toSignificantDigits(sd, rm));
	};

	Fraction.prototype.toPrecision = function(sd, rm) {
		return new Fraction(this.n.div(this.d).times(this.s).toPrecision(sd, rm));
	};
	
	Fraction.prototype.toDecimalPlaces = function(dp, rm) {
		return new Fraction(this.n.div(this.d).times(this.s).toDecimalPlaces(dp, rm));
	};

	Fraction.prototype.toFixed = function(dp, rm) {
		return this.n.div(this.d).times(this.s).toFixed(dp, rm);
	};

	Fraction.prototype.toExponential = function(dp, rm) {
		return this.n.div(this.d).times(this.s).toExponential(dp, rm);
	};


	Fraction.prototype.toNumber = function() {
		return this.n.div(this.d).times(this.s).toNumber();
	};

	Fraction.prototype.clone = function(params) {
		var newType = this.baseType.clone(params);
		var oldType = Fraction.baseType;
		
		Fraction.changeBaseType(newType);
		var clone = new Fraction(this);
		Fraction.changeBaseType(oldType);
		
		return clone;
	};
	
	Fraction.prototype.valueOf = function() {
		return this.n.div(this.d).times(this.s).valueOf();
	};

	Fraction.prototype.toString = function() {
		return this.n.div(this.d).times(this.s).toString();//this.n.times(this.s).toString() + (this.d.eq(ONE) ? (' / ' + this.d.toString()) : '');
	};

    var wrapFunction = function(name) {
        var f = function(a) {
			var p = this.precision;
			
			/** convert argument **/
			var djs = require("decimal.js"); djs.config({ precision: p });
			
			var arg;
				
			if(this != undefined && a === undefined)
				// a = this.n.div(this.d).times(this.s);
				arg = new djs(this.n.toString()).div(this.d.toString()).times(this.s);
			else
				arg = new djs(a);
			
			/** calculate value **/
			//var value = baseType[name](arg);
			var value = djs[name](arg);//toSignificantDigits(p+1);
			
			/** stats **/
			//console.log(name, '(', arg.toString(), ') = ', value.toString(), this.precision);
			
			return new Fraction(value);
        };

        Fraction.prototype[name] = f;
        Fraction[name] = f;
    }
	
	var funcs = [
		'sqrt', 'cbrt', 'exp', 'ln',
		'cos', 'acos', 'cosh', 'acosh',
		'sin', 'asin', 'sinh', 'asinh',
		'tan', 'atan', 'tanh', 'atanh' /** atan2 included **/
	];
	
	for(var i = 0; i < funcs.length; i++)
		wrapFunction(funcs[i]);
	
    return Fraction;
}

module.exports = AbstractFraction;
