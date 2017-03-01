//noinspection NpmUsedModulesInstalled
var model       = require('./model'),

    state       = require('../../state'),

    w3color     = require('w3color'),
    randomColor = require('randomcolor');

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function Data() {
    this.array = [];
}

Data.prototype.toJSON = function() {
    return this.array;
};

Data.prototype.validate = function(name, value) {
    switch(name) {
        case 'index':
            return !isNaN(value) && isFinite(value) && value >= 0;

        case 'color':
            return w3color(value).valid;

        case 'omega':
            return !isNaN(value) && isFinite(value) && value > 0;

        case 'k':
        case 'lambda':
        case 'A':
            return !isNaN(value) && isFinite(value) && Math.abs(value) > 0;

        case 'phi':
            return !isNaN(value) && isFinite(value);

        default:
            return false;
    }
};

Data.prototype.format = function(name, value) {
    switch(name) {
        case 'index':
            return value + "";

        case 'color':
            var colorObj = new w3color(value);
            var colorName = colorObj.toName();

            return ['color', colorName ? colorName : colorObj.toHexString()];

        case 'omega':
        case 'k':
        case 'v':
        case 'A':
            return value.toFixed(2);

        case 'phi':
            return (value / Math.PI * 180).toFixed(1);

        case 'lambda':
            return (2 * Math.PI / value).toFixed(2);

        default:
            throw "Can't format: value name is not known";
    }
};

Data.prototype.parse = function(name, value) {
    switch(name) {
        case 'index':
            return parseInt(value);

        case 'color':
            return new w3color(value).toHexString();

        case 'omega':
        case 'k':
        case 'A':
            return parseFloat(value);

        case 'phi':
            return parseFloat(value) / 180 * Math.PI;

        case 'lambda':
            return 2 * Math.PI / parseFloat(value);

        default:
            throw "Formatting is impossible: value name is not known";
    }
};

Data.prototype.add = function(omega, k, color, A, phi) {
    // Check for duplicates
    if(!this.array.every(function(entry) {
            return entry.omega !== omega || entry.k !== k;
        })) {
        return -1;
    }

    // Ok
    if(typeof color == 'undefined') color = randomColor();
    if(typeof A == 'undefined') A = 1;
    if(typeof phi == 'undefined') phi = 0;

    var index = this.array.push({
        color: color,
        omega: omega,
        k: k,
        A: A,
        phi: phi
    });

    var markerIndex = model.dispersionGraph.markerAdd(color, k, omega, state.options.circleRadius * A);
    var markerIndex2 = model.velocityGraph.markerAdd(color, 2 * Math.PI / k, omega / k, state.options.circleRadius * A);

    model.ui.add(color, omega, k, A, phi);

    console.assert(markerIndex === index && markerIndex2 === index, "Index mismatch");

    return index;
};

Data.prototype.update = function(index, values, source) {
    var entry = this.array[index];

    var omegaChanged = false, kChanged = false;
    var markersUpdate = false;

    Object.keys(values).forEach(function(key) {
        switch(key) {
            case 'color':
                entry.color = values.color;

                model.dispersionGraph.markers[index].color = values.color;
                model.velocityGraph.markers[index].color = values.color;
                model.ui.update(index, 'color', values.color);

                markersUpdate = true;
                break;

            case 'omega':
                entry.omega = values.omega;

                omegaChanged = true;
                markersUpdate = true;
                break;

            case 'k':
                entry.k = values.k;

                kChanged = true;
                markersUpdate = true;
                break;

            case 'A':
                entry.A = values.A;

                model.dispersionGraph.markers[index].circleRadius = state.options.circleRadius * values.A;
                model.velocityGraph.markers[index].circleRadius = state.options.circleRadius * values.A;
                model.ui.update(index, 'A', values.A);

                markersUpdate = true;
                break;

            case 'phi':
                entry.phi = values.phi;

                model.ui.update(index, 'phi', values.phi);

                break;

            default:
                throw "Can't update: value name is not known";
        }
    });

    if(omegaChanged && source !== 'dispersionGraph')
        model.dispersionGraph.markers[index].y = entry.omega;

    if(kChanged && source !== 'dispersionGraph')
        model.dispersionGraph.markers[index].x = entry.k;

    if((omegaChanged || kChanged) && source !== 'velocityGraph') {
        model.velocityGraph.markers[index].x = 2 * Math.PI / entry.k;
        model.velocityGraph.markers[index].y = entry.omega / entry.k;
    }

    // Always update dataTable, there is no infinite loop since
    // it checks whatever value is the same or not
    if((omegaChanged || kChanged)/** && source !== 'dataTable'**/) {
        model.ui.update(index, 'omega', entry.omega);
        model.ui.update(index, 'k', entry.k);
        model.ui.update(index, 'lambda', entry.k);
        model.ui.update(index, 'v', entry.omega / entry.k);
    }

    if(markersUpdate) {
        if(source !== 'dispersionGraph')
            model.dispersionGraph.update();

        if(source !== 'velocityGraph')
            model.velocityGraph.update();
    }
};

Data.prototype.remove = function(index) {
    model.ui.remove(index);
    model.velocityGraph.markerRemove(index);
    model.dispersionGraph.markerRemove(index);
    this.array.splice(index, 1);
};


Data.prototype.defaults = function() {
    this.load([
        {k: 7, omega: 6, color: 'GreenYellow', A: 1},
        {k: 8, omega: 8, color: 'DeepSkyBlue', A: 1}
    ]);
};

Data.prototype.load = function(data) {
    var that = this;

    data.forEach(function(entry) {
        if(!entry.omega || !that.validate('omega', entry.omega))
            return;

        if(!entry.k || !that.validate('k', entry.k))
            return;

        that.add(
            that.parse('omega', entry.omega),
            that.parse('k', entry.k),
            (entry.color && that.validate('color', entry.color)) ? that.parse('color', entry.color) : undefined,
            (entry.A && that.validate('A', entry.A)) ? that.parse('A', entry.A) : undefined,
            (entry.phi && that.validate('phi', entry.phi)) ? that.parse('phi', entry.phi) : undefined
        );
    });
};

Data.prototype.toIntegers = function() {
    var that = this;
    this.array.forEach(function(entry, index) {
        that.update(index, {
            omega: Math.round(entry.omega),
            k: Math.round(entry.k)
        });
    });
};

module.exports = Data;
