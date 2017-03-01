//noinspection NpmUsedModulesInstalled
var Data    = require('./data'),
    Parser  = require('./parser'),

    main    = require("../../main"),
    state   = require('../../state'),
    ui      = require('../../ui'),


    Graph   = require('../../graph'),
    w3color = require('w3color');

/////////////////////////////////////////////////////////////////////////////////////////////////////////
var MARKERS_COLOR               = new w3color('DeepSkyBlue').toHexString(),
    MARKERS_RADIUS_POINT = 0.05, // Use state.options?
    MARKERS_RADIUS_FREQUENCY    = 0.05,
    MARKERS_RADIUS_INVFREQUENCY = 0.05 / 4,

    MARKER_LINE_WIDTH           = 0.01,

    N_DEFAULT                   = 128,
    N_MIN                       = 1,
    N_MAX                       = 1024,

    PERIOD_DEFAULT              = 20,
    PERIOD_MIN                  = 10,
    PERIOD_MAX                  = 100,

    PERIOD_GRAPH                = 10,

    IMPULSE_DEFAULT             = 'y(x) = 3*exp(-x^2)*cos(1.5*2*pi*x)',
    DISPERSION_DEFAULT          = 'omega(k) = 10*sqrt(k)',

    VELOCITY_SAMPLES            = 100;

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function loadConfig(name, defaults) {
    if(state.model && state.model.name === module.exports.name && state.model[name]) {
        if(typeof defaults !== 'object')
            return state.model[name];
        else
            Object.keys(state.model[name]).forEach(function(key) {
                defaults[key] = state.model[name][key];
            });
    }
    return defaults;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function initUI() {
    ui.optionsTitle('Functions');
    ui.optionsAdd('impulseFunction', 'Impulse', model.impulseFunction, function(code) {
        if(!Parser.parseFunction(code, ['y'])) // Check
            return false;

        model.impulseFunction = code;
        buildData({
            period: model.data.period,
            n: model.data.n
        });

        return true;
    });
    ui.optionsAdd('dispersionRelation', 'Dispersion relation', model.dispersionRelation, function(code) {
        if(!Parser.parseFunction(code, ['omega']))
            return false;

        model.dispersionRelation = code;
        updateDispersion();

        return true;
    });

    ui.optionsTitle('Simulation');
    ui.optionsAdd('period', 'Period', {
        value: model.data.period,
        min: PERIOD_MIN,
        max: PERIOD_MAX
    }, function(newValue) {
        buildData({
            period: newValue,
            n: model.data.n
        });
    });

    var powersOfTwo = [];
    var initialValue = 0;
    for(var i = N_MIN; i <= N_MAX; i *= 2) {
        powersOfTwo.push(i);
        if(i == model.data.n)
            initialValue = powersOfTwo.length - 1;
    }
    ui.optionsAdd('n', '# of points', {
        value: initialValue,
        min: 0,
        max: powersOfTwo.length - 1,
        formatter: function(value) {
            return powersOfTwo[value];
        }
    }, function(newValue) {
        buildData({
            period: model.data.period,
            n: powersOfTwo[newValue]
        });
    });

    ui.optionsTitle('Options');
    ui.optionsAdd('showVelocity', 'Show velocity graph', model.options.showVelocity, function(newValue) {
        model.options.showVelocity = newValue;
        model.imageGraph.update();
    });

    ui.optionsAdd('invertFrequency', 'Invert frequency', model.options.invertFrequency, function(newValue) {
        model.options.invertFrequency = newValue;
        updateFrequencies();
    });

    ui.optionsAdd('showImpulseInterp', 'Show impulse interpolation', model.options.showImpulseInterp, function(newValue) {
        model.options.showImpulseInterp = newValue;
        model.impulseGraph.update();
    });

    ui.optionsAdd('showPointLines', 'Show point lines', model.options.showPointLines, function(newValue) {
        model.options.showPointLines = newValue;
        model.impulseGraph.update();
        model.imageGraph.update();
    });

    ui.optionsTitle('Functions reference');
    ui.optionsHTML('DISPERSION_REFERENCE');

}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function drawWave() {
    var that = this;
    this.drawFunction(function(x) {
        return model.data.sampleRealWave(x - model.data.period / 2, state.time, that.evaluatePhase);
    }, 'green');
}

function drawImpulse() {
    if(!model.options.showImpulseInterp)
        return;

    var simplePhaseEvaluator = function(x, t, k) {
        return k * x;
    };

    this.drawFunction(function(x) {
        return model.data.sampleRealWave(x - model.data.period / 2, 0, simplePhaseEvaluator);
    });
}

function drawDispersion(ctx, width) {
    if(!model.options.showVelocity)
        return;

    if(this.maxVelocity && this.maxVelocity > 0) {
        var that = this;
        this.drawFunction(function(frequency) {
            if(model.options.invertFrequency)
                frequency = 1 / frequency;

            if(frequency < 0)
                frequency = 0;

            return that.getVelocity(frequency) / that.maxVelocity /** * maxFreq */;
        }, 'purple');

        ctx.font = '18pt Calibri';
        ctx.fillStyle = 'purple';
        ctx.fillText('\uD835\uDCCB', width - 32, 25); // Mathematical script small v
    }
}

function drawMarker(index) {
    if(!model.options.showPointLines)
        return;

    var marker = this.markers[index];
    var ctx = this.ctx;

    ctx.save();

    ctx.beginPath();

    ctx.strokeStyle = MARKERS_COLOR;
    ctx.lineWidth = MARKER_LINE_WIDTH;
    ctx.moveTo(marker.x, 0);
    ctx.lineTo(marker.x, marker.y);
    ctx.stroke();

    ctx.restore();
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function buildData(options) {
    model.data = new Data(options);

    // Generate points with given function
    if(!options.hasOwnProperty('xs')) {
        var func = Parser.parseFunction(model.impulseFunction, ['y']);
        if(!func)
            throw "Parsing error";

        for(var i = 0; i < model.data.n; i++) {
            var x = model.data.xs[i];

            if(-PERIOD_GRAPH / 2 <= x && x <= PERIOD_GRAPH / 2) {
                var val = func(model.data.xs[i]);
                model.data.ys[i] = isFinite(val) ? val : 0;
            } else
                model.data.ys[i] = 0;
        }

        model.data.analyse();
    }

    updatePoints();
}

function updateData(index) {
    var marker = this.markers[index];
    model.data.setY(marker.x, marker.y);
    model.data.analyse();

    updateFrequencies();

    if(model.options.showImpulseInterp)
        model.impulseGraph.draw(); // Force redrawing because update() was called before this callback
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function setImpulseMarkers() {
    var markers = [];

    for(var i = 0; i < model.data.n; i++) {
        var x = model.data.xs[i];

        if(-PERIOD_GRAPH / 2 <= x && x <= PERIOD_GRAPH / 2) {
            markers.push({
                color: MARKERS_COLOR,
                x: x,
                y: model.data.ys[i],
                circleRadius: MARKERS_RADIUS_POINT
            });
        }
    }

    model.impulseGraph.markers = markers;
}

function setFrequencyMarkers() {
    var frequencies = model.data.frequencies;

    var markers = [];
    var maxA = -Infinity;

    for(var i = model.options.invertFrequency ? 1 : 0; i < frequencies.length; i++) { // TODO Fix nyq frequency display
        var A = model.data.magnitudes[i];

        if(A > maxA)
            maxA = A;

        markers.push({
            color: MARKERS_COLOR,
            x: model.options.invertFrequency ? 1 / frequencies[i] : frequencies[i],
            y: A,
            circleRadius: model.options.invertFrequency ? MARKERS_RADIUS_INVFREQUENCY : MARKERS_RADIUS_FREQUENCY
        });
    }

    model.imageGraph.markers = markers;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function updatePoints() {
    setImpulseMarkers();
    model.impulseGraph.update();
    updateFrequencies();
}

function updateFrequencies() {
    setFrequencyMarkers();

    if(model.options.invertFrequency) {
        model.imageGraph.xName = '\u03BB';// Greek small letter lambda
        model.imageGraph.minX = -0.1;
        model.imageGraph.maxX = 1.1;
        model.imageGraph.unitsPerTickX = 0.25;
    } else {
        model.imageGraph.xName = '\u03BE = 1/\u03BB';// Greek small letter xi & lambda
        model.imageGraph.minX = -1;
        model.imageGraph.maxX = Math.ceil(model.data.nyqFreq) + 1;
        model.imageGraph.unitsPerTickX = 1;
    }

    model.imageGraph.updateUnits();

    updateDispersion();
}

function updateDispersion() {
    var func = Parser.parseFunction(model.dispersionRelation, ['omega']);
    if(!func)
        throw "Parsing error";

    model.waveGraph.evaluatePhase = function(x, t, k) {
        var val = func(k) * t - k * x;
        return isFinite(val) ? val : 0;
    };

    model.imageGraph.getVelocity = function(f) {
        var k = 2 * Math.PI * f;
        var val = Math.abs(func(k) / k);

        return isFinite(val) ? val : 0;
    };

    // Find max velocity
    model.imageGraph.maxVelocity = 0;
    for(var i = 0; i < model.imageGraph.maxX; i += model.imageGraph.maxX / VELOCITY_SAMPLES) {
        var f = i;

        if(model.options.invertFrequency) {
            if(i == 0)
                continue;

            f = model.options.invertFrequency ? 1 / i : i;
        }

        var v = model.imageGraph.getVelocity(f);
        if(v > model.imageGraph.maxVelocity && isFinite(v))
            model.imageGraph.maxVelocity = v;
    }

    model.imageGraph.update();
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
var model = {
    name: "Dispersion",

    init: function() {
        model.waveGraph = new Graph(loadConfig('waveGraph', {
            canvas: ui.elements.canvas.canvas,
            holder: ui.elements.canvas.holder,

            minX: -4,
            maxX: 30,

            minY: -5,
            maxY: 5,

            showGrid: false,
            xName: 'x',
            yName: 'y',

            draggableX: true,
            draggableY: false,

            zoomableX: true,
            zoomableY: false
        }));

        model.impulseGraph = new Graph(loadConfig('impulseGraph', {
            canvas: ui.elements.canvasLeft.canvas,
            holder: ui.elements.canvasLeft.holder,

            minX: -PERIOD_GRAPH / 2,
            maxX: PERIOD_GRAPH / 2,

            minY: -5,
            maxY: 5,

            showGrid: true,
            xName: 'x',
            yName: 'y',

            draggableX: false,
            draggableY: false,

            zoomableX: false,
            zoomableY: false
        }));

        model.imageGraph = new Graph(loadConfig('imageGraph', {
            canvas: ui.elements.canvasRight.canvas,
            holder: ui.elements.canvasRight.holder,

            minX: -1,
            maxX: 1,

            minY: -0.1,
            maxY: 1.1,

            unitsPerTickY: 0.25,

            showGrid: false,
            xName: '\u03BE = 1/\u03BB', // Greek small letter xi & lambda
            yName: 'A',

            draggableX: false,
            draggableY: false,

            zoomableX: false,
            zoomableY: false
        }));

        model.options = loadConfig('options', {
            showVelocity: true,
            invertFrequency: false,
            showImpulseInterp: true,
            showPointLines: true
        });

        model.waveGraph.on('draw', drawWave);
        model.waveGraph.on('draw', model.waveGraph.drawXAxis);
        model.waveGraph.on('draw', model.waveGraph.drawYAxis);

        model.waveGraph.on('animate', function(dt) {
            if(state.playing)
                main.step(dt);

            this.draw();
        });

        model.impulseGraph.markersSetup([], true, true);
        model.impulseGraph.on('draw', drawImpulse);
        model.impulseGraph.on('draw', model.impulseGraph.drawXAxis);
        model.impulseGraph.on('draw', model.impulseGraph.drawYAxis);
        model.impulseGraph.on('markerDraw', drawMarker);
        model.impulseGraph.on('markerMoveEnded', updateData);

        model.imageGraph.markersSetup([], false, false);
        model.imageGraph.on('draw', drawDispersion);
        model.imageGraph.on('draw', model.imageGraph.drawXAxis);
        model.imageGraph.on('draw', model.imageGraph.drawYAxis);
        model.imageGraph.on('markerDraw', drawMarker);

        model.impulseFunction = loadConfig('impulseFunction', IMPULSE_DEFAULT);
        model.dispersionRelation = loadConfig('dispersionRelation', DISPERSION_DEFAULT);
        buildData(loadConfig('data', {
            period: PERIOD_DEFAULT,
            n: N_DEFAULT
        }));

        model.waveGraph.play(state.options.fps);

        initUI();

        return {
            waveGraph: model.waveGraph,
            impulseGraph: model.impulseGraph,
            imageGraph: model.imageGraph,
            options: model.options,
            data: {
                toJSON: function() {
                    return model.data.toJSON();
                }
            },
            impulseFunction: {
                toJSON: function() {
                    return model.impulseFunction;
                }
            },
            dispersionRelation: {
                toJSON: function() {
                    return model.dispersionRelation;
                }
            }
        };
    },

    destroy: function() {
        ui.optionsDestroy();

        model.imageGraph.destroy();
        model.impulseGraph.destroy();
        model.waveGraph.destroy();

        model.imageGraph = undefined;
        model.impulseGraph = undefined;
        model.waveGraph = undefined;
    }
};

module.exports = model;