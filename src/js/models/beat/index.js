module.exports.name = "Beat";

var formulaURI = require('./formula'),

    state      = require('../../state'),
    ui         = require('../../ui'),
    Graph      = require('../../graph'),
    main       = require("../../main"),

    $          = jQuery = require('jquery');

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Global variables
var graph,
    options,
    info,
    omega_1,
    omega_2;

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function loadConfig(name, defaults) {
    if(state.model && state.model.name === module.exports.name && state.model[name])
        Object.keys(state.model[name]).forEach(function(key) {
            defaults[key] = state.model[name][key];
        });
    return defaults;
}

function loadData(name, default_) {
    if(state.model && state.model.name === module.exports.name && state.model[name])
        return state.model[name];
    else
        return default_;
}

// See http://stackoverflow.com/a/6333775
function drawArrow(context, fromx, fromy, tox, toy) {
    var headlen = 0.1;   // length of head in pixels
    var angle = Math.atan2(toy - fromy, tox - fromx);
    context.moveTo(fromx, fromy);
    context.lineTo(tox, toy);
    context.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    context.moveTo(tox, toy);
    context.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
}

function showInfo() {
    if(!info) {
        info = $('\
<div>\
<img src="' + formulaURI + '">\
 </div>\
').prependTo(ui.elements.canvasRight.holder);
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function draw(ctx) {
    ctx.save();
    this.transformContext();

    // Transformation
    var centerX = -2;
    var radius = 1;

    ctx.scale(this.scaleY / this.scaleX, 1);
    ctx.translate(centerX, 0);

    // Circle
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI, false);
    ctx.setLineDash([0.05, 0.05]);
    ctx.lineWidth = 0.01;
    ctx.strokeStyle = 'gray';
    ctx.stroke();

    // Positions
    var angles = [
        omega_1 * state.time,
        omega_2 * state.time,
        (omega_1 + omega_2) / 2 * state.time
    ];

    var x = [
        Math.cos(angles[0]) * radius,
        Math.cos(angles[1]) * radius,
        Math.cos(angles[2]) * radius * Math.cos((angles[0] - angles[1]) / 2) * 2
    ];

    var y = [
        Math.sin(angles[0]) * radius,
        Math.sin(angles[1]) * radius,
        Math.sin(angles[2]) * radius * Math.cos((angles[0] - angles[1]) / 2) * 2
    ];

    // Arrows
    ctx.setLineDash([1, 0]);
    ctx.beginPath();
    ctx.strokeStyle = 'red';
    drawArrow(ctx, 0, 0, x[0], y[0]);
    ctx.moveTo(x[0], y[0]);
    ctx.lineTo(x[2], y[2]);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = 'blue';
    drawArrow(ctx, 0, 0, x[1], y[1]);
    ctx.moveTo(x[1], y[1]);
    ctx.lineTo(x[2], y[2]);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = 'green';
    drawArrow(ctx, 0, 0, x[2], y[2]);
    ctx.stroke();

    // Lines
    ctx.setLineDash([0.05, 0.05]);

    ctx.beginPath();
    ctx.strokeStyle = 'red';
    ctx.moveTo(x[0], y[0]);
    ctx.lineTo(-centerX, y[0]);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = 'blue';
    ctx.moveTo(x[1], y[1]);
    ctx.lineTo(-centerX, y[1]);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = 'green';
    ctx.moveTo(x[2], y[2]);
    ctx.lineTo(-centerX, y[2]);
    ctx.stroke();

    ctx.restore();

    // Actual oscillations
    this.drawFunction(function(t) {
        if(t < 0)
            return 0;
        return Math.sin(omega_1 * (state.time - t)) + Math.sin(omega_2 * (state.time - t))
    }, 'green', 1.5);

    this.drawFunction(function(t) {
        if(t < 0)
            return 0;
        return Math.sin(omega_1 * (state.time - t));
    }, 'red', 0.3);

    this.drawFunction(function(t) {
        if(t < 0)
            return 0;
        return Math.sin(omega_2 * (state.time - t));
    }, 'blue', 0.3);
}

function createHTML() {
    options = $('\
<form class="form-horizontal">\
    <div class="form-group">\
        <label for="omega_1" class="col-sm-2 control-label">\u03C9<sub>1</sub></label>\
        <div class="col-sm-8">\
            <input type="text" class="form-control" id="omega_1">\
        </div>\
        <span id="omega_1_value" class="col-sm-1" style="color: red"></span>\
    </div>\
    \
    <div class="form-group">\
        <label for="omega_2" class="col-sm-2 control-label">\u03C9<sub>2</sub></label>\
        <div class="col-sm-8">\
            <input type="text" class="form-control" id="omega_2">\
        </div>\
        <span id="omega_2_value" class="col-sm-1" style="color: blue"></span>\
    </div>\
</form>\
').prependTo(ui.elements.canvasLeft.holder);

    // Animate html
    $('#omega_1').slider({
        min: 0.1,
        max: 10,
        step: 0.1,
        value: omega_1,

        tooltip: 'hide'
    }).on("change", function(evt) {
        omega_1 = evt.value.newValue;
        $("#omega_1_value").text(omega_1);
    });

    $('#omega_2').slider({
        min: 0.1,
        max: 10,
        step: 0.1,
        value: omega_2,

        tooltip: 'hide'
    }).on("change", function(evt) {
        omega_2 = evt.value.newValue;
        $("#omega_2_value").text(omega_2);
    });

    $("#omega_1_value").text(omega_1);
    $("#omega_2_value").text(omega_2);
}

// Initialization
module.exports.init = function() {
    graph = new Graph(loadConfig('graph', {
        canvas: ui.elements.canvas.canvas,
        holder: ui.elements.canvas.holder,

        minX: -4,
        maxX: 10,

        minY: -2,
        maxY: 2,

        rangeLimitX: [0.1, 150],

        showGrid: false,
        xName: 't',
        yName: 'x',

        draggableX: true,
        draggableY: false,

        zoomableX: true,
        zoomableY: false
    }));

    graph.on('draw', graph.drawXAxis);
    graph.on('draw', graph.drawYAxis);

    graph.on('draw', draw);

    graph.on('animate', function(dt) {
        if(state.playing)
            main.step(dt);

        this.draw();
    });

    // Load data
    omega_1 = loadData('omega_1', 1.4);
    omega_2 = loadData('omega_2', 1.6);

    // Create html
    createHTML();

    showInfo();

    graph.play(state.options.fps);

    return {
        omega_1: {
            toJSON: function() {
                return omega_1;
            }
        },
        omega_2: {
            toJSON: function() {
                return omega_2;
            }
        },
        waveGraph: graph
    };
};

module.exports.destroy = function() {
    if(info) {
        info.remove();
        info = undefined;
    }
    options.remove();

    graph.destroy();
    graph = undefined;
};