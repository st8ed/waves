// Shims
require('es5-shim');

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Helper functions
module.exports.progress = function(index, length) {
    if(length == 1)
        return index === 0 ? 0 : 1;

    return index / (length - 1);
};

module.exports.resetFormElement = function(e) {
    e.wrap('<form>').closest('form').get(0).reset();
    e.unwrap();
};

module.exports.fixContext = function(ctx) {
    //also http://stackoverflow.com/questions/15397036/drawing-dashed-lines-on-html5-canvas
    if(!ctx.setLineDash)
        ctx.setLineDash = function(arg) {
        }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// See https://gist.github.com/jeromeetienne/2651899
console.assert = function(cond, text) {
    if(cond)    return;
    //if( console.assert.useDebugger )	debugger
    throw new Error(text || "Assertion failed!");
};

if(!String.prototype.endsWith) {
    String.prototype.endsWith = function(searchString, position) {
        var subjectString = this.toString();
        if(typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
            position = subjectString.length;
        }
        position -= searchString.length;
        var lastIndex = subjectString.lastIndexOf(searchString, position);
        return lastIndex !== -1 && lastIndex === position;
    };
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
if(typeof Object.assign != 'function') {
    Object.assign = function(target) {
        'use strict';
        if(target == null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }

        target = Object(target);
        for(var index = 1; index < arguments.length; index++) {
            var source = arguments[index];
            if(source != null) {
                for(var key in source) {
                    if(Object.prototype.hasOwnProperty.call(source, key)) {
                        target[key] = source[key];
                    }
                }
            }
        }
        return target;
    };
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
(function() {
    if(!Event.prototype.preventDefault) {
        Event.prototype.preventDefault = function() {
            this.returnValue = false;
        };
    }
    if(!Event.prototype.stopPropagation) {
        Event.prototype.stopPropagation = function() {
            this.cancelBubble = true;
        };
    }
    if(!Element.prototype.addEventListener) {
        var eventListeners = [];

        var addEventListener = function(type, listener /*, useCapture (will be ignored) */) {
            var self = this;
            var wrapper = function(e) {
                e.target = e.srcElement;
                e.currentTarget = self;
                if(listener.handleEvent) {
                    listener.handleEvent(e);
                } else {
                    listener.call(self, e);
                }
            };
            if(type == "DOMContentLoaded") {
                var wrapper2 = function(e) {
                    if(document.readyState == "complete") {
                        wrapper(e);
                    }
                };
                document.attachEvent("onreadystatechange", wrapper2);
                eventListeners.push({object: this, type: type, listener: listener, wrapper: wrapper2});

                if(document.readyState == "complete") {
                    var e = new Event();
                    e.srcElement = window;
                    wrapper2(e);
                }
            } else {
                this.attachEvent("on" + type, wrapper);
                eventListeners.push({object: this, type: type, listener: listener, wrapper: wrapper});
            }
        };
        var removeEventListener = function(type, listener /*, useCapture (will be ignored) */) {
            var counter = 0;
            while(counter < eventListeners.length) {
                var eventListener = eventListeners[counter];
                if(eventListener.object == this && eventListener.type == type && eventListener.listener == listener) {
                    if(type == "DOMContentLoaded") {
                        this.detachEvent("onreadystatechange", eventListener.wrapper);
                    } else {
                        this.detachEvent("on" + type, eventListener.wrapper);
                    }
                    eventListeners.splice(counter, 1);
                    break;
                }
                ++counter;
            }
        };
        Element.prototype.addEventListener = addEventListener;
        Element.prototype.removeEventListener = removeEventListener;
        if(HTMLDocument) {
            HTMLDocument.prototype.addEventListener = addEventListener;
            HTMLDocument.prototype.removeEventListener = removeEventListener;
        }
        if(Window) {
            Window.prototype.addEventListener = addEventListener;
            Window.prototype.removeEventListener = removeEventListener;
        }
    }
})();

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// requestAnimationFrame support code
var lastTime = 0;
var vendors = ['ms', 'moz', 'webkit', 'o'];
for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] ||
        window[vendors[x] + 'CancelRequestAnimationFrame'];
}

if(!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback, element) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function() {
                callback(currTime + timeToCall);
            },
            timeToCall);
        lastTime = currTime + timeToCall;
        return id;
    };
}

if(!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
        clearTimeout(id);
    };
}