var model = require('./model'),

    ui    = require("../../ui"),
    Graph = require('../../graph'),
    utils = require("../../utils.js");

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function DispersionGraph(config) {
    config.canvas = ui.elements.canvasLeft.canvas;
    config.holder = ui.elements.canvasLeft.holder;
    Graph.call(this, config);

    this.markersSetup([], true);

    this.on('markerMisClick', function(k, omega) {
        if(model.data.add(omega, k) !== -1)
            model.analyse();
    });

    this.on('markerClick', function(index) {
        model.data.remove(index);
        model.analyse();
    });

    this.on('markerMoveStarted', function() {
        model.solver.reset();
    });

    this.on('markerMoveEnded', function() {
        model.analyse();
    });

    this.on('markerMove', function(index, dx, dy) {
        var k = this.markers[index].x + dx;
        var omega = this.markers[index].y + dy;

        if(!model.data.validate('omega', omega) || !model.data.validate('k', k))
            return false;

        model.data.update(index, {
            omega: omega,
            k: k
        }, 'dispersionGraph');
    });

    this.on('markerDraw', function(index) {
        if(!model.options.showVelocities)
            return;

        var marker = this.markers[index];
        var omega = marker.y;
        var k = marker.x;
        var velocity = omega / k;
        var color = w3color(marker.color);
        color.opacity = 0.3;

        var ctx = this.ctx;
        ctx.save();

        // Angle
        var radius = 2 * (0.5 + 0.5 * utils.progress(index, this.markers.length));
        var angle = Math.atan2(omega, k);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, 0, angle, false);

        ctx.fillStyle = color.toRgbaString();
        ctx.fill();

        ctx.beginPath();

        // Velocity text
        var tX = radius * Math.cos(angle) * 2;
        var tY = radius * Math.sin(angle) * 2;

        color.darker(30);

        this.drawText('\uD835\uDCCB = ' + velocity.toFixed(2), color.toRgbString(), tX, tY,
            (angle > Math.PI / 2) ? angle - Math.PI : angle
        );

        ctx.restore();
    });

    this.on('draw', function() {
        var that = this;
        this.markers.forEach(function(marker) {
            var k = marker.y / marker.x;

            that.drawFunction(function(x) {
                return k * x;
            }, '#dddddd', 1);
        });
    });

    this.on('draw', this.drawXAxis);
    this.on('draw', this.drawYAxis);
    this.update();
}

DispersionGraph.prototype = Graph.prototype;
module.exports = DispersionGraph;