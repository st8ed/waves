var model = require('./model'),
    ui    = require('../../ui');

/////////////////////////////////////////////////////////////////////////////////////////////////////////
var columnNamesUnicode = [
    '   ', '\u03C9', 'k', '\u03BB', '\uD835\uDCCB', 'A', '\u03C6', '   '
];

var columnNames = [
    'color', 'omega', 'k', 'lambda', 'v', 'A', 'phi', 'actions'
];

var columnIndexes = columnNames.reduce(function(x, current, index) {
    x[current] = index;
    return x;
}, {});

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function UI() {
    var that = this;
    ui.dataTableCreate(
        columnNamesUnicode,
        this.validate,
        function(row, col, value) {
            if(!that.validate(row, col, value))
                return false;

            var arg = {};
            var key = columnNames[col];
            //
            // if(model.options.snapToGrid && (key === 'omega' || key === 'k' || key === 'lambda'))
            //     value = Math.round(value);

            value = model.data.parse(key, value);

            arg[(key == 'lambda' ? 'k' : key)] = value;
            model.data.update(row - 1, arg, 'dataTable');

            model.analyse();
        }
    );

    ui.dataTableRemoveHandler = function(row) {
        model.data.remove(row - 1);
        model.analyse();
    };

    ui.optionsTitle("Components");

    ui.optionsAdd('showComponents', "Show monochromatic components", model.options.showComponents, function(newValue) {
        model.options.showComponents = newValue;
    });

    ui.optionsAdd('showPlane', "Show plane at x = 1", model.options.showPlane, function(newValue) {
        model.options.showPlane = newValue;
    });

    ui.optionsTitle("Analysis");

    ui.optionsAdd('showExtrema', "Show extrema", model.options.showExtrema, function(newValue) {
        model.options.showExtrema = newValue;
    });

    ui.optionsAdd('showEnvelope', "Show envelope", model.options.showEnvelope, function(newValue) {
        model.options.showEnvelope = newValue;
        model.analyse();
    });

    ui.optionsAdd('showWavePacket', "Show wave packet", model.options.showWavePacket, function(newValue) {
        model.options.showWavePacket = newValue;
        model.analyse();
    });

    ui.optionsAdd('showRendezvous', "Show rendezvous of components", model.options.showRendezvous, function(newValue) {
        model.options.showRendezvous = newValue;
        model.analyse();
    });

    ui.optionsTitle("Values");

    ui.optionsAdd('showVectorArrows', "Show vector arrows", model.options.showVectorArrows, function(newValue) {
        model.options.showVectorArrows = newValue;
    });

    ui.optionsAdd('showVelocities', "Show the value of velocities", model.options.showVelocities, function(newValue) {
        model.options.showVelocities = newValue;
        model.dispersionGraph.update();
    });

    ui.optionsAdd('snapToGrid', "Snap markers to grid", model.options.snapToGrid, function(newValue) {
        model.options.snapToGrid = newValue;
        if(newValue)
            model.data.toIntegers();
    });
}

UI.prototype.validate = function(row, col, value) {
    if(row == 0 || col == columnIndexes['actions'])
        return false;

    if(row < 0 || col < 0 || row > model.data.array.length || col >= columnNames.length)
        throw 'DOM is out of sync';

    return model.data.validate(columnNames[col], value);
};

UI.prototype.add = function(color, omega, k, A, phi) {
    ui.dataTableInsert([
        model.data.format('color', color),
        model.data.format('omega', omega),
        model.data.format('k', k),
        model.data.format('lambda', k),
        model.data.format('v', omega / k),
        model.data.format('A', A),
        model.data.format('phi', phi),
        ['delete']
    ]);
};

UI.prototype.update = function(index, key, value) {
    ui.dataTableSet(index + 1, columnIndexes[key], model.data.format(key, value));
};

UI.prototype.remove = function(index) {
    ui.dataTableRemove(index + 1);
};

UI.prototype.destroy = function() {
    ui.optionsDestroy();
    ui.dataTableDestroy();
};

UI.prototype.notify = function(title, type, message) {
    ui.notify(title, type, message);
};

module.exports = UI;