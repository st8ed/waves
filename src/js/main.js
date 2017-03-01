require('./utils'); // This will import polyfills first

module.exports.VERSION = require('../../package.json').version;
module.exports.RELEASE = !module.exports.VERSION.endsWith('d');

var utils   = require('./utils'),
    state   = require('./state'),
    ui      = require('./ui'),
    presets = require('./presets');

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Models management
var model = undefined;

var models = {
    discrete_sum: require('./models/discrete_sum'),
    dispersion: require('./models/dispersion'),
    beat: require('./models/beat')
};

var longModelNames = Object.keys(models).reduce(function(longNames, name) {
    longNames[models[name].name] = name;
    return longNames;
}, {});

module.exports.models = Object.keys(longModelNames);

module.exports.activateModel = function(name, config) {
    if(model !== undefined)
        model.destroy();

    name = longModelNames[name];
    model = models[name];

    if(typeof config !== 'undefined') {
        state.model = config;
        state.model.name = model.name;
    }

    state.model = model.init();
    state.model.name = model.name;
};

module.exports.getCurrentModelName = function() {
    return model.name;
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// State management
module.exports.setState = function(model, target) {
    state.options = target.options;
    ui.setOptions(state.options);

    module.exports.setTime(target.time);
    if(state.playing != target.playing)
        module.exports.toggle();

    module.exports.activateModel(model, target.model);
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Time management
module.exports.step = function(dt) {
    var t = state.time + dt * state.options.timeFactor;
    var t0 = state.options.timeInterval[0];
    var t1 = state.options.timeInterval[1];

    t = (t > t1) ? t0 : ((t < t0) ? t0 : t);

    module.exports.setTime(t);
};

module.exports.setTime = function(time) {
    state.time = time;
    ui.setTime(state.time);
};

module.exports.toggle = function() {
    state.playing = !state.playing;
    ui.setPlaying(state.playing);
};

module.exports.play = function() {
    if(state.playing === false)
        module.exports.toggle();
};

module.exports.pause = function() {
    if(state.playing === true)
        module.exports.toggle();
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Start everything
var lastModelUsed;
ui.init(
    function() {
        lastModelUsed = presets.load();
    },
    function() {
        presets.activate(lastModelUsed || state.model.name, 'default');
    },
    function() {
        presets.save();
    }
);