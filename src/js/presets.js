var state        = require('./state'),
    translations = require('./translations'),
    main         = require('./main');

/////////////////////////////////////////////////////////////////////////////////////////////////////////
var storage;
var presets;
var default_preset;

window.presetsReset = function() {
    presets = {};

    if(storage) {
        storage.remove('waves-version');
        storage.remove('waves-presets');
        storage.remove('waves-lang');
        storage.remove('waves-current-model');
    }

    return storage;
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////
module.exports.load = function() {
    default_preset = JSON.parse(JSON.stringify(state));

    try {
        require('persist-js');

        storage = new Persist.Store('waves', {defer: true});

        var version = storage.get('waves-version');
        var data = storage.get('waves-presets');
        var lang = storage.get('waves-lang');

        if(lang)
            translations.lng = lang;

        if(!module.exports.import(version, data)) {
            storage.remove('waves-version');
            storage.remove('waves-presets');
            return default_preset.model.name;
        } else
            return storage.get('waves-current-model');
    } catch(error) {
        console.error(error);
    }

    return "Discrete summation";
};

module.exports.save = function() {
    if(storage) {
        storage.set('waves-version', main.VERSION);
        storage.set('waves-current-model', main.getCurrentModelName());
        storage.set('waves-presets', module.exports.export());
        storage.set('waves-lang', translations.lng);
        storage.save();
    }
};

module.exports.import = function(version, data) {
    presets = undefined;
    var ok = false;

    if(typeof data !== 'undefined') {
        try {
            //noinspection FallThroughInSwitchStatementJS
            switch(version) {
                //////////////////
                case '2016.2.2':
                    console.log('Converting from version 2016.2.2');

                case '2016.2.3':
                    console.log('Converting from version 2016.2.3');

                case main.VERSION:
                    presets = JSON.parse(data);
                    ok = true;
                    break;

                //////////////////
                case '2016.2.1':
                    console.log('Converting from version 2016.2.1');

                    presets = JSON.parse(data);
                    if(presets.hasOwnProperty('Simple dispersion'))
                        delete presets['Simple dispersion'];

                    return module.exports.import('2016.2.2', module.exports.export(presets));

                //////////////////
                default:
                    alert('This presets file is for another version (' + version + ')');

                case null:
                    presets = undefined;
                    break;
            }

        } catch(err) {
            alert('Could not load presets!');
            presets = undefined;
        }
    }

    if(!presets)
        presets = {};

    main.models.forEach(function(model) {
        if(typeof presets[model] === 'undefined')
            presets[model] = {};

        presets[model]['default'] = {};
    });

    return ok;
};


module.exports.export = function() {
    return JSON.stringify(presets, null, 4);
};

module.exports.getNames = function() {
    var names = {};

    Object.keys(presets).forEach(function(model) {
        names[model] = [];

        Object.keys(presets[model]).forEach(function(name) {
            names[model].push(name);
        })
    });

    return names;
};

module.exports.activate = function(model, name) {
    var preset = (name === 'default') ? default_preset : presets[model][name];
    main.setState(model, preset);
};

module.exports.addCurrent = function(name) {
    presets[main.getCurrentModelName()][name] = JSON.parse(JSON.stringify(state)); // For cloning purpose
};

module.exports.remove = function(model, name) {
    delete presets[model][name];
};