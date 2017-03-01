var model            = require('./model'),

    ui               = require("../../ui"),
    state            = require('../../state'),
    Graph            = require('../../graph'),

    linearRegression = require('everpolate').linearRegression;

/////////////////////////////////////////////////////////////////////////////////////////////////////////
function VelocityGraph(config) {
    config.canvas = ui.elements.canvasRight.canvas;
    config.holder = ui.elements.canvasRight.holder;
    Graph.call(this, config);

    this.markersSetup([], false);

    this.on('draw', this.drawXAxis);
    this.on('draw', this.drawYAxis);

    this.on('draw', function(ctx, width) {
        var pointsX = [];
        var pointsY = [];

        this.markers.forEach(function(marker) {
            pointsX.push(marker.x);
            pointsY.push(marker.y);
        });

        var regression = linearRegression(pointsX, pointsY);

        this.drawFunction(function(x) {
            return regression.evaluate(x);
        }, 'gray', 1);

        if(pointsX.length > 1) {
            var rSquared = regression.rSquared;
            var intercept = regression.intercept;
            var sign = (rSquared > 0.999 || isNaN(rSquared)) ? '=' : '\u2248';

            // Group velocity text
            ctx.font = '18pt Calibri';
            ctx.fillStyle = 'black';
            ctx.fillText('u ' + sign + ' ' + (isNaN(intercept) ? Infinity : intercept.toFixed(3)), width - 150, 25);

            // Group velocity marker
            ctx.save();
            ctx.beginPath();

            this.transformContext();
            ctx.translate(0, regression.intercept);
            ctx.scale(this.scaleY / this.scaleX, 1);

            ctx.arc(0, 0, state.options.circleRadius / 2, 0, 2 * Math.PI, false);

            ctx.fillStyle = '#dddddd';
            ctx.fill();

            ctx.lineWidth = state.options.circleRadius / 2 / 4;
            ctx.strokeStyle = 'black';
            ctx.stroke();

            ctx.closePath();
            ctx.restore();
        }
    });

    this.update();
}

VelocityGraph.prototype = Graph.prototype;
module.exports = VelocityGraph;