//noinspection NpmUsedModulesInstalled
var model     = require('./model'),
    numerical = require('./numerical'),
    beats     = require('./beats'),

    ui        = require("../../ui"),
    state     = require('../../state'),
    Graph     = require('../../graph'),
    main      = require("../../main"),

    w3color   = require('w3color');

/////////////////////////////////////////////////////////////////////////////////////////////////////////
var FRAMES_PER_VELOCITY_MEASURE      = 100,
    VELOCITY_DELTA_COEFFICIENT       = 0.2,  //0.2;
    VELOCITY_DELTA_MINIMUM           = 0.01, // In order to avoid multiplication of delta by zero
    VELOCITY_DELTA_CLAMP_COEFFICIENT = 2;    //0.5;

/////////////////////////////////////////////////////////////////////////////////////////////////////////
var xs                  = [], ys         = [],

    extremaXs           = [],
    previousExtremaXs   = [],
    previousExtremaTime = [0, 0],
    extremaVelocities   = [],

    extrema             = [],

    rendezvousCrests;

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function drawVector(canvas, x, h, off, showPlane) {
    if(typeof(showPlane) === 'undefined')
        showPlane = true;

    var ctx = canvas.ctx;

    ctx.beginPath();
    ctx.moveTo(x, h);

    if(showPlane) {
        ctx.lineTo(x, -h);
        ctx.stroke();
    } else {
        ctx.save();
        ctx.translate(x, h);
        ctx.scale(canvas.scaleY / canvas.scaleX, 1);

        ctx.arc(
            0, 0,
            0.05,
            0, 2 * Math.PI, false
        );
        ctx.fill();
        ctx.restore();
    }

    if(model.options.showVectorArrows && Math.abs(off) > VELOCITY_DELTA_MINIMUM) {
        // See http://stackoverflow.com/a/26080467
        //starting path of the arrow from the start square to the end square and drawing the stroke
        var headlen = 0.1;
        var sign = (off < 0) ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x + off, h);
        ctx.stroke();

        //starting a new path from the head of the arrow to one of the sides of the point
        ctx.beginPath();
        ctx.moveTo(x + off, h);
        ctx.lineTo(x + off - sign * headlen * Math.cos(-Math.PI / 7), h - headlen * Math.sin(-Math.PI / 7));

        //path from the side point of the arrow, to the other side point
        ctx.lineTo(x + off - sign * headlen * Math.cos(Math.PI / 7), h - headlen * Math.sin(Math.PI / 7));

        //path from the side point back to the tip of the arrow, and then again to the opposite side point
        ctx.lineTo(x + off, h);
        ctx.lineTo(x + off - sign * headlen * Math.cos(-Math.PI / 7), h - headlen * Math.sin(-Math.PI / 7));
    }

    //draws the paths created above
    ctx.stroke();
    ctx.fill();
    ctx.closePath();
}

function drawWaves() {
    xs = [];
    ys = [];

    this.drawFunction(function(x) {
        var superposition = 0;
        var waves = model.data.array;

        for(var i = 0; i < waves.length; i++) {
            var wave = waves[i];

            superposition += wave.A * Math.cos(
                    wave.omega * state.time
                    - wave.k * x
                    + wave.phi
                );
        }

        xs.push(x);
        ys.push(superposition);

        return superposition;
    }, 'green', 1.5);

    calculateAll(1 / this.fps);
}

function calculateVelocityDelta(current, previous) {
    var delta = VELOCITY_DELTA_COEFFICIENT * (current - previous);

    if(Math.abs(delta) > Math.abs(previous)) {
        if(Math.abs(previous) > VELOCITY_DELTA_MINIMUM)
            delta = (delta / Math.abs(delta)) * Math.abs(previous) * VELOCITY_DELTA_CLAMP_COEFFICIENT;
        else
            delta = VELOCITY_DELTA_MINIMUM;
    }

    return delta;
}

function calculateAll(dt) {
    if(model.options.showEnvelope || model.options.showWavePacket || model.options.showRendezvous)
        rendezvousCrests = model.solver.find(1, state.time) || null;

    if(model.data.array.length > 2) {
        var maximums = numerical.findPeaks(ys)[0];
        extremaXs = [];
        for(var i = 0; i < maximums.length; i++)
            extremaXs.push(xs[maximums[i]]);

        var time = new Date();

        if(Math.abs(time - previousExtremaTime[0]) > (FRAMES_PER_VELOCITY_MEASURE * dt) && state.playing) {
            var newVelocities = numerical.findPeakVelocities(previousExtremaXs, extremaXs);

            for(i = 0; i < newVelocities.length; i++) {
                var v = newVelocities[i] / (state.time - previousExtremaTime[1]);

                if(i == extremaVelocities.length)
                    extremaVelocities.push(0);

                extremaVelocities[i] += calculateVelocityDelta(v, extremaVelocities[i]);
            }

            previousExtremaXs = extremaXs;
            previousExtremaTime[0] = time;
            previousExtremaTime[1] = state.time;
        }

        extrema = [];
        for(i = 0; i < extremaXs.length; i++) {
            var x = extremaXs[i];
            var y = ys[maximums[i]];
            var vel = extremaVelocities[i];

            extrema.push([x, y, vel]);
        }
    } else {
        extrema = beats.getPhasePoints(model.data.array, state.time);
    }
}

function drawExtrema(ctx) {
    if(!model.options.showExtrema)
        return;

    ctx.save();
    this.transformContext();

    ctx.strokeStyle = 'green';
    ctx.fillStyle = 'green';
    ctx.lineWidth = 0.05;

    for(var i = 0; i < extrema.length; i++) {
        var point = extrema[i];
        drawVector(this, point[0], point[1], point[2] * state.options.timeFactor, false);
    }

    ctx.restore();
}

function drawPlaneAtX1(ctx) {
    // Plane
    if(!model.options.showPlane)
        return;

    ctx.save();
    this.transformContext();

    ctx.beginPath();
    ctx.strokeStyle = 'orange';
    ctx.fillStyle = 'orange';
    ctx.lineWidth = 0.05;
    ctx.moveTo(1, this.maxY - 1);
    ctx.lineTo(1, this.minY + 1);
    ctx.stroke();

    ctx.restore();

    var waves = model.data.array;

    for(var i = 0; i < waves.length; i++) {
        var wave = waves[i];

        ctx.save();
        this.transformContext();
        ctx.translate(
            1,
            wave.A * Math.cos(
                wave.omega * state.time
                - wave.k * 1
                + wave.phi
            )
        );
        ctx.scale(this.scaleY / this.scaleX, 1);

        ctx.beginPath();
        ctx.arc(
            0, 0,
            0.1,
            0, 2 * Math.PI, false
        );
        ctx.fillStyle = wave.color;
        ctx.fill();
        ctx.restore();
    }
}

function drawWaveComponents() {
    if(!model.options.showComponents)
        return;

    var waves = model.data.array;

    for(var i = 0; i < waves.length; i++) {
        var wave = waves[i];

        this.drawFunction(function(x) {
            //noinspection JSReferencingMutableVariableFromClosure
            return wave.A * Math.cos(
                    wave.omega * state.time
                    - wave.k * x
                    + wave.phi
                );
        }, wave.color, 1);
    }
}

function drawPhasePlanes(ctx) {
    if(!(model.options.showComponents || (model.options.showRendezvous && rendezvousCrests !== null)))
        return;

    var waves = model.data.array;

    for(var i = 0; i < waves.length; i++) {
        var wave = waves[i];
        var v = wave.omega / wave.k;

        ctx.save();
        this.transformContext();

        var lineColor = new w3color(wave.color);
        lineColor.darker(10);

        ctx.strokeStyle = lineColor.toRgbaString();
        ctx.fillStyle = wave.color;
        ctx.lineWidth = 0.05;

        var headlen = v * state.options.timeFactor;
        // TODO: Correct amplitude

        if(model.options.showRendezvous && rendezvousCrests !== null) {
            if(rendezvousCrests[i]) {
                drawVector(this, rendezvousCrests[i], wave.A, headlen);
            }
        } else if(model.options.showComponents)
            drawVector(this, v * state.time, wave.A, headlen);

        ctx.restore();
    }
}

function drawWavePacket(ctx, width, height) {
    // Group velocity
    if(!(model.options.showEnvelope || model.options.showWavePacket))
        return;

    var waveData = model.solver.getWaveData();

    if(waveData !== null) {
        var dx = waveData[1][1] - waveData[1][0];
        ctx.fillText('dx = ' + dx.toFixed(3), width - 100, height - 30);

        var dt = waveData[2][1] - waveData[2][0];
        ctx.fillText('dt = ' + dt.toFixed(3), width - 100, height - 20);

        var u = waveData[0];
        ctx.fillText('u = ' + u.toFixed(3), width - 100, height - 40);

        var dt2 = waveData[4][1] - waveData[4][0];
        //var envelopeLen = u * dt2; //2 * (waveData[3][0] - waveData[3][1]);//; + (waveData[1][1] - waveData[1][0]);
        var envelopeLen = waveData[5];

        var maxA = model.data.array.reduce(function(left, wave) {
            return left + wave.A;
        }, 0);

        if(model.options.showEnvelope) {
            var k = (2 * Math.PI) / envelopeLen;
            var omega = k * waveData[0];

            this.drawFunction(function(x) {
                return maxA * Math.cos(omega * state.time - k * x);
            }, 'gray', 1);

            this.drawFunction(function(x) {
                return -maxA * Math.cos(omega * state.time - k * x);
            }, 'gray', 1);
        }

        if(model.options.showWavePacket) {
            ctx.save();
            this.transformContext();

            if(model.options.showRendezvous) {
                ctx.beginPath();
                ctx.lineWidth = 0.15;
                ctx.strokeStyle = w3color('orange').toRgbString();
                ctx.moveTo(waveData[1][0], 0);
                ctx.lineTo(waveData[1][1], 0);
                ctx.stroke();
                ctx.closePath();
            }

            var x = u * state.time - envelopeLen / 4;

            ctx.beginPath();
            ctx.lineWidth = 0.1;
            ctx.strokeStyle = 'blue';
            ctx.moveTo(x, 0);
            ctx.lineTo(x + envelopeLen / 2, 0);
            ctx.stroke();
            ctx.closePath();

            ctx.strokeStyle = 'orange';
            ctx.fillStyle = 'orange';
            ctx.lineWidth = 0.1;
            drawVector(this, u * state.time, maxA, u * state.options.timeFactor, false);

            ctx.restore();
        }
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function WaveGraph(config) {
    config.canvas = ui.elements.canvas.canvas;
    config.holder = ui.elements.canvas.holder;
    Graph.call(this, config);

    this.on('draw', drawExtrema);
    this.on('draw', drawWaves);
    this.on('draw', drawPlaneAtX1);
    this.on('draw', drawWaveComponents);
    this.on('draw', drawPhasePlanes);
    this.on('draw', drawWavePacket);

    this.on('draw', this.drawXAxis);
    this.on('draw', this.drawYAxis);

    this.on('animate', function(dt) {
        if(state.playing)
            main.step(dt);

        this.draw();
    });

    this.play(state.options.fps);
}

WaveGraph.prototype = Graph.prototype;
module.exports = WaveGraph;