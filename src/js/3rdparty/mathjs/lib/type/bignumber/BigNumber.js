var Decimal = require('decimal.js');
var AbstractFraction = require('./AbstractFraction');

function factory (type, config, load, typed, math) {
  var decimal = Decimal.clone({precision: config.precision});
  var BigNumber = AbstractFraction(decimal);

  /**
   * Attach type information
   */
  BigNumber.prototype.type = 'BigNumber';
  BigNumber.prototype.isBigNumber = true;
  BigNumber.config = function(params) {
		BigNumber.changeBaseType(Decimal.clone(params));
  };
  
  BigNumber.max = function(args) {
	  var f = args[0];
	  
	  for(var i = 1; i < args.length; i++)
		  if(args[i].gt(f))
			  f = args[i];
		  
	  return new BigNumber(f);
  };
  
	BigNumber.min = function(args) {
	  var f = args[0];
	  
	  for(var i = 1; i < args.length; i++)
		  if(args[i].lt(f))
			  f = args[i];
		  
	  return new BigNumber(f);
  };
  
  	BigNumber.clone = function(params) {
		return AbstractFraction(Decimal.clone(params));
	};
  
  
  /**
   * Get a JSON representation of a BigNumber containing
   * type information
   * @returns {Object} Returns a JSON object structured as:
   *                   `{"mathjs": "BigNumber", "value": "0.2"}`
   */
  BigNumber.prototype.toJSON = function () {
    return {
      mathjs: 'BigNumber',
      value: this.toString()
    };
  };

  /**
   * Instantiate a BigNumber from a JSON object
   * @param {Object} json  a JSON object structured as:
   *                       `{"mathjs": "BigNumber", "value": "0.2"}`
   * @return {BigNumber}
   */
  BigNumber.fromJSON = function (json) {
    return new BigNumber(json.value);
  };

  // listen for changed in the configuration, automatically apply changed precision
  math.on('config', function (curr, prev) {
    if (curr.precision !== prev.precision) {
		BigNumber.changeBaseType(Decimal.clone({precision: curr.precision}))
    }
  });

  return BigNumber;
}

exports.name = 'BigNumber';
exports.path = 'type';
exports.factory = factory;
exports.math = true; // request access to the math namespace