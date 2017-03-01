// TODO fix scaling

var DEFAULT_N_OF_POINTS = 2000;

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Constructor
function Graph(config) {
    this.canvas = config.canvas;
    this.holder = config.holder;
    if(!(!!(this.canvas.getContext && this.canvas.getContext('2d')))) {
        alert("This browser doesn't support 2D canvas. Update your browser.");
        throw "Canvas not supported";
    }
    this.ctx = this.canvas.getContext('2d');
    require('./utils').fixContext(this.ctx);

    // Units
    this.minX = config.minX;
    this.minY = config.minY;
    this.maxX = config.maxX;
    this.maxY = config.maxY;
    this.unitsPerTickX = ('unitsPerTickX' in config) ? config.unitsPerTickX : 1;
    this.unitsPerTickY = ('unitsPerTickY' in config) ? config.unitsPerTickY : 1;

    this.nOfPoints = ('nOfPoints' in config) ? config.nOfPoints : DEFAULT_N_OF_POINTS;

    this.rangeLimitX = ('rangeLimitX' in config) ? config.rangeLimitX : [
            0.1,
            100
        ];
    this.rangeLimitY = ('rangeLimitY' in config) ? config.rangeLimitY : [
            0.1,
            30
        ];

    // Appearance
    this.showGrid = ('showGrid' in config) ? config.showGrid : false;
    this.xName = config.xName;
    this.yName = config.yName;
    this.axisColor = '#aaa';
    this.font = '8pt Calibri';
    this.fontAxisName = '18pt Calibri';
    this.tickSize = 20;

    this.draggableX = ('draggableX' in config) ? config.draggableX : true;
    this.draggableY = ('draggableY' in config) ? config.draggableY : true;

    this.zoomableX = ('zoomableX' in config) ? config.zoomableX : true;
    this.zoomableY = ('zoomableY' in config) ? config.zoomableY : true;

    // Start
    this.listeners = {};
    this.setup();
}

Graph.prototype.setup = function() {
    this._raw_listeners = {};
    var that = this;

    // Resizing
    this.resize();
    this._raw_listeners['resize'] = function() {
        that.resize();
    };

    // Mouse events wrapper
    function mouseEventGun(element, name) {
        return function(evt) {
            var rect = element.getBoundingClientRect(); // TODO Check padding around canvas

            var pos = {
                x: evt.clientX - rect.left * (that.width / rect.width),
                y: evt.clientY - rect.top * (that.height / rect.height)
            };

            var ret = that.fire(name, pos, evt);
            if(ret === false) {
                evt.preventDefault();
                evt.stopPropagation();
            }
        };
    }

    this._raw_listeners['contextmenu'] = mouseEventGun(this.canvas, 'contextMenu');

    // Register all events
    this.canvas.onselectstart = function() {  // Fixes a problem where double clicking causes text to get selected on the canvas
        return false;
    };
    this.canvas.onmousemove = mouseEventGun(this.canvas, 'mouseMove');
    this.canvas.onmousedown = mouseEventGun(this.canvas, 'mouseDown');
    this.canvas.onmouseup = mouseEventGun(this.canvas, 'mouseUp');
    this.canvas.ondblclick = mouseEventGun(this.canvas, 'mouseDblClick');

    window.addEventListener('resize', this._raw_listeners['resize'], false);
    this.canvas.addEventListener('contextmenu', this._raw_listeners['contextmenu'], false);

    // Dragging
    if(this.draggableX || this.draggableY) {
        var dragStart;
        var dragging = false;

        this.on('mouseDown', function(pos) {
            dragStart = pos;
            dragging = true;
        });

        this.on('mouseUp', function() {
            dragging = false;
        });

        this.on('mouseMove', function(pos) {
            if(dragging) {
                var dx = pos.x - dragStart.x;
                var dy = pos.y - dragStart.y;
                dragStart = pos;

                if(that.draggableX) {
                    that.minX += -dx / that.scaleX;
                    that.maxX += -dx / that.scaleX;
                }

                if(that.draggableY) {
                    that.minY += dy / that.scaleY;
                    that.maxY += dy / that.scaleY;
                }

                that.updateUnits();
                that.update();
            }
        });
    }

    // Zoom
    if(this.zoomableX || this.zoomableY) {
        this._raw_listeners['wheel'] = function(evt) {
            var delta = (evt.deltaX) ? evt.deltaX : evt.deltaY;

            if((!evt.shiftKey || !that.zoomableY) && that.zoomableX) {
                // TODO Check shift for various browsers
                var dx = (delta > 0) ? that.rangeX / 4 : -that.rangeX / 2;

                if(!(that.rangeLimitX[0] < (that.rangeX - dx * 2) && (that.rangeX - dx * 2) < that.rangeLimitX[1]))
                    return;

                that.minX += dx;
                that.maxX -= dx;
                that.unitsPerTickX *= ((dx > 0) ? 0.5 : 2);

                that.updateUnits();
                that.update();
            }

            else if((evt.shiftKey || !that.zoomableX) && that.zoomableY) {
                var dy = (delta > 0) ? that.rangeY / 4 : -that.rangeY / 2;

                if(!(that.rangeLimitY[0] < (that.rangeY - dy * 2) && (that.rangeY - dy * 2) < that.rangeLimitY[1]))
                    return;

                that.minY += dy;
                that.maxY -= dy;
                that.unitsPerTickY *= ((dy > 0) ? 0.5 : 2);

                that.updateUnits();
                that.update();
            }
        };

        this.canvas.addEventListener('wheel', this._raw_listeners['wheel'], false);
    }
};

Graph.prototype.destroy = function() {
    this.fire('destroy');
    this.stop();

    if(this._raw_listeners) {
        this.canvas.onselectstart = '';
        this.canvas.onmousemove = '';
        this.canvas.onmousedown = '';
        this.canvas.onmouseup = '';
        this.canvas.ondblclick = '';

        window.removeEventListener('resize', this._raw_listeners['resize'], false);
        this.canvas.removeEventListener('contextmenu', this._raw_listeners['contextmenu'], false);

        if('wheel' in this._raw_listeners)
            this.canvas.removeEventListener('wheel', this._raw_listeners['wheel'], false);
    }

    this.listeners = {};
    this.canvas.width = 1;
    this.canvas.height = 1;
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Drawing & animation
Graph.prototype.resize = function() {
    var style = window.getComputedStyle(this.holder, null);
    var newWidth = parseInt(style.getPropertyValue('width'));
    var newHeight = parseInt(style.getPropertyValue('height'));

    if(this.width !== newWidth || this.height !== newHeight) {
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        this.width = newWidth;
        this.height = newHeight;

        this.updateUnits();
        this.fire('resize');
        this.update();
    }
};

Graph.prototype.clear = function() {
    this.ctx.clearRect(0, 0, this.width, this.height);
};

Graph.prototype.draw = function() {
    this.clear();
    this.ctx.save();
    this.fire('draw', this.ctx, this.width, this.height);
    this.ctx.restore();
};

Graph.prototype.play = function(fps) {
    var startTime = new Date();
    var that = this;

    this.fps = fps;

    var step = function() {
        var dt = ((new Date()) - startTime) / 1000;
        startTime = new Date();

        that.timeoutObj = setTimeout(function() {
            requestAnimationFrame(step);
        }, 1000 / fps);

        that.fire('animate', dt);
    };

    this.stop();
    this.timeoutObj = setTimeout(step, 1000 / fps);
};

Graph.prototype.stop = function() {
    if(this.timeoutObj !== undefined && this.timeoutObj !== null) {
        clearTimeout(this.timeoutObj);
        this.timeoutObj = null;
    }
};

Graph.prototype.update = function() {
    if(this.timeoutObj === undefined || this.timeoutObj === null)
        this.draw();
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Graphing
Graph.prototype.updateUnits = function() {
    this.rangeX = this.maxX - this.minX;
    this.rangeY = this.maxY - this.minY;
    this.iteration = (this.maxX - this.minX) / this.nOfPoints;

    this.unitX = this.width / this.rangeX;
    this.unitY = this.height / this.rangeY;
    this.scaleX = this.width / this.rangeX;
    this.scaleY = this.height / this.rangeY;

    this.centerY = Math.round(this.maxY * this.unitY); //Math.round(Math.abs(this.maxY / this.rangeY) * this.height);
    this.centerX = Math.round(-this.minX * this.unitX); //Math.round(Math.abs(this.minX / this.rangeX) * this.width);
};

Graph.prototype.drawXAxis = function() {
    var ctx = this.ctx;
    ctx.save();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(0, this.centerY);
    ctx.lineTo(this.width, this.centerY);

    ctx.strokeStyle = this.axisColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tick marks
    var xPosIncrement = this.unitsPerTickX * this.unitX;
    var xPos, unit;
    ctx.font = this.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Left tick marks & grid lines
    xPos = this.centerX - xPosIncrement;
    unit = -1 * this.unitsPerTickX;
    while(xPos > 0) {
        if(this.showGrid) {
            // Grid line
            ctx.beginPath();
            ctx.moveTo(xPos, 0);
            ctx.lineTo(xPos, this.height);
            ctx.setLineDash([3, 3]);
            ctx.stroke();

            ctx.beginPath();
            ctx.setLineDash([1, 0]);
        }

        // Tick mark
        ctx.moveTo(xPos, this.centerY - this.tickSize / 2);
        ctx.lineTo(xPos, this.centerY + this.tickSize / 2);
        ctx.stroke();

        // Label
        ctx.fillText(unit, xPos, this.centerY + this.tickSize / 2 + 3);
        unit -= this.unitsPerTickX;

        xPos = Math.round(xPos - xPosIncrement);
    }

    // Right tick marks & grid lines
    xPos = this.centerX + xPosIncrement;
    unit = this.unitsPerTickX;
    while(xPos < this.width) {
        if(this.showGrid) {
            // Grid line
            ctx.beginPath();
            ctx.moveTo(xPos, 0);
            ctx.lineTo(xPos, this.height);
            ctx.setLineDash([3, 3]);
            ctx.stroke();

            ctx.beginPath();
            ctx.setLineDash([1, 0]);
        }

        // Tick mark
        ctx.moveTo(xPos, this.centerY - this.tickSize / 2);
        ctx.lineTo(xPos, this.centerY + this.tickSize / 2);
        ctx.stroke();

        // Label
        ctx.fillText(unit, xPos, this.centerY + this.tickSize / 2 + 3);
        unit += this.unitsPerTickX;

        xPos = Math.round(xPos + xPosIncrement);
    }

    // Axis name
    ctx.font = this.fontAxisName;
    ctx.fillStyle = 'black';
    ctx.fillText(this.xName, this.width - 35, this.centerY - 35);

    ctx.restore();
};

Graph.prototype.drawYAxis = function() {
    var ctx = this.ctx;
    ctx.save();

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(this.centerX, 0);
    ctx.lineTo(this.centerX, this.height);
    ctx.strokeStyle = this.axisColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tick marks
    var yPosIncrement = this.unitsPerTickY * this.unitY;
    var yPos, unit;
    ctx.font = this.font;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Top tick marks & grid lines
    yPos = this.centerY - yPosIncrement;
    unit = this.unitsPerTickY;
    while(yPos > 0) {
        if(this.showGrid) {
            // Grid line
            ctx.beginPath();
            ctx.moveTo(0, yPos);
            ctx.lineTo(this.width, yPos);
            ctx.setLineDash([3, 3]);
            ctx.stroke();

            ctx.beginPath();
            ctx.setLineDash([1, 0]);
        }

        // Tick mark
        ctx.moveTo(this.centerX - this.tickSize / 2, yPos);
        ctx.lineTo(this.centerX + this.tickSize / 2, yPos);
        ctx.stroke();

        // Label
        ctx.fillText(unit, this.centerX - this.tickSize / 2 - 3, yPos);
        unit += this.unitsPerTickY;

        yPos = Math.round(yPos - yPosIncrement);
    }

    // Bottom tick marks & grid lines
    yPos = this.centerY + yPosIncrement;
    unit = -1 * this.unitsPerTickY;
    while(yPos < this.height) {
        if(this.showGrid) {
            // Grid line
            ctx.beginPath();
            ctx.moveTo(0, yPos);
            ctx.lineTo(this.width, yPos);
            ctx.setLineDash([3, 3]);
            ctx.stroke();

            ctx.beginPath();
            ctx.setLineDash([1, 0]);
        }

        // Tick mark
        ctx.moveTo(this.centerX - this.tickSize / 2, yPos);
        ctx.lineTo(this.centerX + this.tickSize / 2, yPos);
        ctx.stroke();

        // Label
        ctx.fillText(unit, this.centerX - this.tickSize / 2 - 3, yPos);
        unit -= this.unitsPerTickY;

        yPos = Math.round(yPos + yPosIncrement);
    }

    // Axis name
    ctx.font = this.fontAxisName;
    ctx.fillStyle = 'orange';
    ctx.fillText(this.yName, this.centerX + 25, 15);

    ctx.restore();
};

Graph.prototype.drawFunction = function(f, color, thickness) {
    var ctx = this.ctx;
    ctx.save();
    ctx.save();
    this.transformContext();

    ctx.beginPath();
    ctx.moveTo(this.minX, f(this.minX));
    for(var x = this.minX + this.iteration; x <= this.maxX; x += this.iteration)
        ctx.lineTo(x, f(x));
    ctx.restore();

    ctx.lineJoin = 'round';
    ctx.lineWidth = thickness;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
};

Graph.prototype.drawText = function(text, color, x, y, angle) {
    var ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    var pos = this.toAbsoluteCoordinates(x, y);
    ctx.translate(pos.x, pos.y);

    if(typeof angle !== 'undefined')
        ctx.rotate(Math.atan(Math.tan(-angle) * (this.scaleY / this.scaleX)));

    ctx.font = '12pt Calibri';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);

    ctx.restore();
};

Graph.prototype.transformContext = function() {
    var ctx = this.ctx;
    ctx.translate(this.centerX, this.centerY);
    ctx.scale(this.scaleX, -this.scaleY);
};

Graph.prototype.toAbsoluteCoordinates = function(x, y) {
    return {
        x: (x * this.scaleX) + this.centerX,
        y: (y * -this.scaleY) + this.centerY
    };
};

Graph.prototype.toLocalCoordinates = function(x, y) {
    return {
        x: (x - this.centerX) / this.scaleX,
        y: (y - this.centerY) / -this.scaleY
    };
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Markers
Graph.prototype.markersSetup = function(markers, dynamic, limitX) {
    this.markers = markers;
    if(typeof dynamic === 'undefined') dynamic = true;
    if(typeof limitX === 'undefined') limitX = false;

    var that = this;

    this.on('draw', function(ctx) {
        ctx.save();
        this.transformContext();
        var scaleX = this.unitsPerTickX;
        var scaleY = this.unitsPerTickX * this.scaleX / this.scaleY;

        var that = this;
        that.markers.forEach(function(marker, index) {
            ctx.save();

            ctx.beginPath();

            ctx.translate(marker.x, marker.y);
            ctx.scale(scaleX, scaleY);

            ctx.arc(0, 0, marker.circleRadius, 0, 2 * Math.PI, false);

            ctx.fillStyle = marker.color;
            ctx.fill();

            ctx.lineWidth = marker.circleRadius / 10;
            ctx.strokeStyle = '#AAAAAA';
            ctx.stroke();

            ctx.restore();

            that.fire('markerDraw', index, marker);
        });

        ctx.restore();
    });

    this.on('mouseDblClick', function(pos, evt) {
        var index = that.markerFindAt(pos, limitX);
        if(index === -1) {
            pos = that.toLocalCoordinates(pos.x, pos.y);
            return that.fire('markerMisClick', pos.x, pos.y, evt);
        }

        return that.fire('markerClick', index, evt);
    });

    this.on('contextMenu', function(pos, evt) {
        var index = that.markerFindAt(pos, limitX);
        if(index !== -1)
            return that.fire('markerContextMenu', index, evt);
    });

    if(dynamic) {
        var dragging = false;
        var dragStart;
        var dragIndex;

        this.on('mouseDown', function(pos, evt) {
            var index = that.markerFindAt(pos, limitX);
            if(index === -1)
                return;

            dragStart = that.toLocalCoordinates(pos.x, pos.y);

            if(limitX)
                dragStart.y = this.markers[index].y;

            dragIndex = index;
            dragging = true;
            that.fire('markerMoveStarted', dragIndex, evt);
            return false;
        });

        this.on('mouseUp', function(pos, evt) {
            if(!dragging)
                return;

            dragging = false;
            that.fire('markerMoveEnded', dragIndex, evt);
            return false;
        });

        this.on('mouseMove', function(pos, evt) {
            if(!dragging)
                return;

            var dragEnd = that.toLocalCoordinates(pos.x, pos.y);
            var dx = limitX ? 0 : dragEnd.x - dragStart.x;
            var dy = dragEnd.y - dragStart.y;

            if(that.fire('markerMove', dragIndex, dx, dy, evt) !== false) { // TODO API
                dragStart = dragEnd;
                that.markers[dragIndex].x += dx;
                that.markers[dragIndex].y += dy;
                that.update();
            }

            return false;
        });
    }
};

Graph.prototype.markerFindAt = function(pos, limitX) {
    if(typeof limitX === 'undefined') limitX = false;

    for(var i = 0; i < this.markers.length; i++) {
        var marker = this.markers[i];
        var point = this.toAbsoluteCoordinates(marker.x, marker.y);

        var delta = this.toLocalCoordinates(
            (Math.abs(pos.x - point.x) / this.unitsPerTickX) + this.centerX,
            (Math.abs(pos.y - point.y) / this.unitsPerTickX / (this.scaleX / this.scaleY)) + this.centerY
        );

        if(limitX)
            delta.y = 0;

        if(Math.hypot(delta.x, delta.y) < marker.circleRadius)
            return i;
    }

    return -1;
};

Graph.prototype.markerAdd = function(color, x, y, circleRadius) {
    if(typeof circleRadius === 'undefined') circleRadius = 0.1;

    var index = this.markers.push({
        color: color,
        x: x,
        y: y,
        circleRadius: circleRadius
    });

    this.update();
    this.fire('markerAdd', index);
    return index;
};

Graph.prototype.markerRemove = function(index) {
    this.markers.splice(index, 1);
    this.update();
    this.fire('markerRemove', index);
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Events
Graph.prototype.fire = function() {
    var name = arguments[0];
    if(!(name in this.listeners) || this.listeners[name].length == 0) // TODO Performance check
        return;

    var passArguments = Array.prototype.slice.call(arguments, 1);
    var ret = undefined;

    var that = this;
    this.listeners[name].every(function(callback) {
        ret = ret || callback.apply(that, passArguments);
        return ret !== false;
    });

    //console.log(name + ' ( ' + passArguments + ' ) = ' + ret);
    return ret;
};

Graph.prototype.on = function(name, callback) {
    this.listeners[name] = this.listeners[name] || [];
    var index = this.listeners[name].indexOf(callback);

    if(index !== -1)
        this.listeners[name].splice(index, 1);
    else
        this.listeners[name].splice(0, 0, callback);
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Exports
Graph.prototype.toJSON = function() {
    return {
        minX: this.minX,
        maxX: this.maxX,

        minY: this.minY,
        maxY: this.maxY,

        unitsPerTickX: this.unitsPerTickX,
        unitsPerTickY: this.unitsPerTickY,

        rangeLimitX: this.rangeLimitX,
        rangeLimitY: this.rangeLimitY,

        showGrid: this.showGrid
    };
};

module.exports = Graph;