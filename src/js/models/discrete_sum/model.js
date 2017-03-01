// Imports
var state = require('../../state'),
    ui    = require("../../ui"),
    _     = ui._;

// Constructors
var WaveGraph       = undefined,
    DispersionGraph = undefined,
    VelocityGraph   = undefined,
    UI              = undefined,
    Data            = undefined,
    Solver          = require('./solver');

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function loadConfig(name, defaults) {
    if(state.model && state.model.name === module.exports.name && state.model[name])
        Object.keys(state.model[name]).forEach(function(key) {
            defaults[key] = state.model[name][key];
        });

    return defaults;
}

function loadData() {
    if(state.model && state.model.name === module.exports.name && state.model.data)
        module.exports.data.load(state.model.data);
    else
        module.exports.data.defaults();
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
var model = {
    name: "Discrete summation",
    waveGraph: undefined,
    dispersionGraph: undefined,
    velocityGraph: undefined,
    options: undefined,
    ui: undefined,
    data: undefined,

    solver: undefined,

    init: function() {
        model.waveGraph = new WaveGraph(loadConfig('waveGraph', {
            minX: -4,
            maxX: 40,

            minY: -3,
            maxY: 3,
            nOfPoints: 5000,

            rangeLimitX: [5, 250],

            showGrid: false,
            xName: 'x',
            yName: 'y',

            draggableX: true,
            draggableY: false,

            zoomableX: true,
            zoomableY: true
        }));

        model.dispersionGraph = new DispersionGraph(loadConfig('dispersionGraph', {
            canvas: ui.elements.canvasLeft.canvas,
            holder: ui.elements.canvasLeft.holder,

            minX: -1,
            maxX: 10,

            minY: -1,
            maxY: 10,

            showGrid: true,
            xName: 'k',
            yName: '\u03C9', // Greek small letter omega

            draggableX: true,
            draggableY: false,

            zoomableX: true,
            zoomableY: true
        }));

        model.velocityGraph = new VelocityGraph(loadConfig('velocityGraph', {
            canvas: ui.elements.canvasRight.canvas,
            holder: ui.elements.canvasRight.holder,

            minX: -1,
            maxX: 10,

            minY: -1,
            maxY: 10,

            showGrid: true,
            xName: '\u03BB', // Greek small letter lambda
            yName: '\uD835\uDCCB', // Mathematical script small v

            draggableX: true,
            draggableY: true,

            zoomableX: true,
            zoomableY: true
        }));

        model.options = loadConfig('options', {
            showComponents: false,
            showExtrema: true,
            showPlane: false,
            showEnvelope: true,
            showWavePacket: true,
            showRendezvous: false,
            showVectorArrows: true,
            showVelocities: true,
            snapToGrid: true
        });
        model.ui = new UI();

        model.data = new Data();
        loadData();

        model.solver = new Solver();
        model.analyse();

        return {
            waveGraph: model.waveGraph,
            dispersionGraph: model.dispersionGraph,
            velocityGraph: model.velocityGraph,
            options: model.options,
            data: model.data
        };
    },

    analyse: function() {
        if(model.options.snapToGrid)
            model.data.toIntegers();

        model.solver.reset({});

        if(model.options.showEnvelope || model.options.showWavePacket || model.options.showRendezvous) {
            if(!model.solver.isReady()) {
                var check = true;

                if(model.data.array.length > 0) {
                    var amp = model.data.array[0].A;

                    check = model.data.array.every(function(wave) {
                        var ret = (wave.A == amp) && (wave.phi % (2 * Math.PI) == 0);
                        amp = wave.A;

                        return ret;
                    });
                }

                if(!check) {
                    ui.notify(_('(Unimplemented): '), 'warning', _('Analysis of different amplitudes or initial phases is not implemented yet.'));

                } else {
                    model.solver.reset(model.data.array);

                    if(!model.solver.find(1, state.time)) {
                        var err = model.solver.getError();

                        if(err)
                            model.ui.notify(_('Analysis'), 'warning', model.solver.getError());
                    }

                    if(model.solver.getWaveData() === null && model.data.length > 1)
                        model.ui.notify(_('Analysis'), 'warning', _('Group velocity is not defined'));
                }
            }
        }
    },

    destroy: function() {
        model.solver.reset();

        model.velocityGraph.clear();
        model.dispersionGraph.clear();
        model.waveGraph.clear();

        model.ui.destroy();
        model.velocityGraph.destroy();
        model.dispersionGraph.destroy();
        model.waveGraph.destroy();

        model.waveGraph = undefined;
        model.dispersionGraph = undefined;
        model.velocityGraph = undefined;
        model.options = undefined;
        model.ui = undefined;

        model.data = undefined;
    }
};

module.exports = model;

// Import constructors so they have access to module.exports
WaveGraph = require('./waveGraph');
DispersionGraph = require('./dispersionGraph');
VelocityGraph = require('./velocityGraph');
UI = require('./ui');
Data = require('./data');
