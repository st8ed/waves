//var mathCore = require('mathjs/core'),
//    math     = mathCore.create();
var math = require('mathjs');

//math.import(require('mathjs/lib/function'));
//math.import(require('mathjs/lib/type/number'));
//math.import(require('mathjs/lib/expression'));
var parser = math.parser();

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function setupScope() {
    parser.clear();
    parser.set("pi", Math.PI);

    parser.set("spike", function(x) {
        return x == 0 ? 1 : 0;
    });

    parser.set("box", function(x) {
        return -1 <= x && x <= 1 ? 1 : 0;
    });

    parser.set("triangle", function(x) {
        if(-1 <= x && x <= 0) {
            return x + 1;
        } else if(0 < x && x <= 1)
            return -x + 1;
        else
            return 0;
    });
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
module.exports.parseRelation = function(code, explicitVariables) {
    try {
        setupScope();
        parser.eval(code);

        for(var i = 0; i < explicitVariables.length; i++) {
            var variable = explicitVariables[i];
            var func = parser.get(variable);

            if(typeof func === 'function')
                return typeof func(1) === 'number' ? {variable: variable, func: func} : false;
        }

        return false;
    } catch(ex) {
        return false;
    }
};

module.exports.parseFunction = function(code, explicitVariables) {
    var ret = module.exports.parseRelation(code, explicitVariables);

    return ret ? ret.func : false;
};
