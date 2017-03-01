// Main
//noinspection NpmUsedModulesInstalled
var main         = require('./main'),
    state        = require('./state'),
    presets      = require('./presets'),
    translations = require('./translations'),
    utils        = require('./utils'),

    // Libraries
    $            = jQuery = require('jquery'),
    bootstrap = require('bootstrap'),
    slider    = require("bootstrap-slider"),
    notify    = require('bootstrap-notify'),
    edittable = require('mindmup-editabletable'),
    i18next   = require('i18next'),
    w3color   = require('w3color');

/////////////////////////////////////////////////////////////////////////////////////////////////////////
var elements = {};
module.exports.elements = elements;

var playButton, pauseButton;
var timebar;
var timebarSliding = false;

var dataTable;
var dataTableCells;

var _ = function(x) {
    return i18next.t(x);
};
module.exports._ = _;

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Initialize UI
module.exports.init = function(callback_before, callback_after, callback_exit) {
    $(function() {
        callback_before();

        // Internationalisation
        i18next.init(translations);

        $('#changeLanguageInput').on('change', function() {
            translations.lng = this.value;
            location.reload();
        });

        // Translate existing text
        translateHTML();

        // Touch handler
        function touchHandler(event) {
            var touches = event.changedTouches,
                first = touches[0],
                type  = "";
            switch(event.type) {
                case "touchstart":
                    type = "mousedown";
                    break;
                case "touchmove":
                    type = "mousemove";
                    break;
                case "touchend":
                    type = "mouseup";
                    break;
                default:
                    return;
            }

            // initMouseEvent(type, canBubble, cancelable, view, clickCount,
            //                screenX, screenY, clientX, clientY, ctrlKey,
            //                altKey, shiftKey, metaKey, button, relatedTarget);

            var simulatedEvent = document.createEvent("MouseEvent");
            simulatedEvent.initMouseEvent(type, true, true, window, 1,
                first.screenX, first.screenY,
                first.clientX, first.clientY, false,
                false, false, false, 0/*left*/, null);

            first.target.dispatchEvent(simulatedEvent);
            event.preventDefault();
        }

        document.addEventListener("touchstart", touchHandler, true);
        document.addEventListener("touchmove", touchHandler, true);
        document.addEventListener("touchend", touchHandler, true);
        document.addEventListener("touchcancel", touchHandler, true);

        // Store elements
        elements.canvas = {
            holder: $('#canvasHolder')[0],
            canvas: $('#canvas')[0]
        };

        elements.canvasLeft = {
            holder: $('#canvasLeftHolder')[0],
            canvas: $('#canvasLeft')[0]
        };

        elements.canvasRight = {
            holder: $('#canvasRightHolder')[0],
            canvas: $('#canvasRight')[0]
        };

        // Tooltips
        $('[data-toggle="tooltip"]').tooltip();

        // Timebar
        timebar = $('#timebar').slider({
            min: state.options.timeInterval[0],
            max: state.options.timeInterval[1],
            value: state.options.timeInterval[0],
            formatter: function(value) {
                return value.toFixed(1) + 's';
            }
        });
        module.exports.setTime(state.time);

        var restorePlaying = false;
        timebar.on('slideStart', function() {
            timebarSliding = true;
            restorePlaying = state.playing;
            main.pause();
        });

        timebar.on('slideStop', function() {
            if(restorePlaying)
                main.play();
            timebarSliding = false;
        });

        timebar.on('change', function(evt) {
            main.setTime(evt.value.newValue);
        });

        // Play buttons
        playButton = $('#playButton');
        pauseButton = $('#pauseButton');

        playButton.on('click', main.play);
        pauseButton.on('click', main.pause);

        module.exports.setPlaying(state.playing);

        // And presets
        presetsSetup();

        $('#newPresetAdd').on('click', function(evt) {
            evt.preventDefault();

            var name = $('#newPresetName').val();
            if(!name || name === 'default' || name === 'Default')
                return;

            var model = main.getCurrentModelName();
            var names = presets.getNames();

            function isNameFree(name) {
                return names[model].indexOf(name) === -1;
            }

            if(!isNameFree(name)) {
                for(var i = 2; ; i++) {
                    if(isNameFree(name + ' #' + i)) {
                        name = name + ' #' + i;
                        break;
                    }
                }
            }

            presets.addCurrent(name);
            module.exports.presetsAdd(model, name);

            module.exports.notify("'" + name + "'", 'success', 'was added')
        });

        // Options
        module.exports.setOptions(state.options);

        // Options tab
        $('#timeFactor')
            .on('change', function(evt) {
                state.options.timeFactor = evt.value.newValue;
            });
        $('#timeInterval')
            .on('change', function(evt) {
                state.options.timeInterval = evt.value.newValue;

                timebar.slider('setAttribute', 'min', evt.value.newValue[0]);
                timebar.slider('setAttribute', 'max', evt.value.newValue[1]);
            });

        var onBeforeUnLoadEvent = false;

        window.onunload = window.onbeforeunload = function() {
            if(!onBeforeUnLoadEvent) {
                onBeforeUnLoadEvent = true;
                callback_exit();
            }
        };

        // Export & import buttons
        $('#importPresets').on('click', function(evt) {
            evt.preventDefault();

            $('#configFile').click();
        });

        $('#exportPresets').on('click', function(evt) {
            evt.preventDefault();

            var data = 'VERSION ' + main.VERSION + '\n' + presets.export();

            // $('<a></a>', {
            //     'href': 'data:text/plain;charset=utf-u,' + window.encodeURIComponent(data),
            //     'download': 'waves-config.json'
            // }).get(0).click();
            require("downloadjs")(data, 'waves-config.json', 'application/json');
        });

        $('#exportPresetsAsText').on('click', function(evt) {
            evt.preventDefault();
            var data = 'VERSION ' + main.VERSION + '\n' + presets.export();

            $('#exportAsTextData').text(data);
            $('#exportAsTextDialog').modal('show');
        });

        $('#configFile').on('change', function(evt) {
            var files = evt.target.files;
            var file = files[0];
            var reader = new FileReader();

            reader.onload = function() {
                var text = this.result;
                if(text) {
                    var matches = text.match(/^VERSION\s(.*)([\s\S]+)$/);
                    if(matches && matches.length == 3) {
                        var version = matches[1];
                        var data = matches[2];

                        presets.import(version, data);

                        presetsClear();
                        presetsSetup();
                    } else
                        alert('File has unknown format or is corrupted');
                } else
                    alert('File is empty');
            };

            reader.readAsText(file);
            utils.resetFormElement($(this));
        });

        // We finished
        callback_after();
    });
};

function translateHTML() {
    $('p,h1,h2,h3,h4,h5,a,label').each(function() {
        var el = $(this);

        if(el.attr('href') && el.attr('href')[0] != '#')
            return;

        if(el.attr('data-no-translate'))
            return;

        el.html(_(el.html()));
    });

    $('#license').html(_("APP_LICENSE"));
    $('#about-home').html(_("APP_INFO"));

    $(':button[title]').each(function() {
        var el = $(this);
        el.attr('title', _(el.attr('title')));
    });

    $('input[placeholder]').each(function() {
        var el = $(this);
        el.attr('placeholder', _(el.attr('placeholder')));
    })
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Changing values
module.exports.setTime = function(time) {
    if(!timebarSliding)
        timebar.slider('setValue', time);
};

module.exports.setPlaying = function(active) {
    if(active) {
        playButton.hide();
        pauseButton.show();
    } else {
        playButton.show();
        pauseButton.hide();
    }
};

module.exports.setOptions = function(options) {
    timebar.slider('setAttribute', 'min', options.timeInterval[0]);
    timebar.slider('setAttribute', 'max', options.timeInterval[1]);

    $('#timeFactor').slider().slider('setValue', options.timeFactor);
    $('#timeInterval').slider().slider('setValue', options.timeInterval);
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Presets accordion
function presetsAddModel(name) {
    var accordion = $('#presets-accordion');

    var alias = name.toLowerCase().replace(' ', '_');
    var isFirst = accordion.children().length === 0;

    accordion
        .append(
            $('<div></div>').addClass('panel panel-default')
                .append(
                    $('<div></div>').addClass('panel-heading')
                        .append(
                            $('<h4></h4>').addClass('panel-title')
                                .append(
                                    $(
                                        '<a></a>',
                                        {
                                            'data-toggle': 'collapse',
                                            'data-parent': '#presets-accordion',
                                            'href': '#presets_' + alias
                                        }
                                    ).text(_(name))
                                )
                        )
                )
                .append(
                    $('<div></div>', {'id': 'presets_' + alias}).addClass('panel-collapse collapse' + (isFirst ? '  in' : ''))
                        .append(
                            $('<div></div>').addClass('panel-body')
                                .append(
                                    $('<table></table>').addClass('table table-hover table-condensed').css('width', '100%')
                                )
                        )
                )
        );

    return $('#presets_' + alias).find('table').eq(0);
}

function presetsSetup() {
    var presetNames = presets.getNames();
    main.models.forEach(function(model) {
        presetsAddModel(model);
        presetNames[model].forEach(function(name) {
            module.exports.presetsAdd(model, name);
        })
    });

}

function presetsClear() {
    $('#presets-accordion').empty();
}

module.exports.presetsAdd = function(model, name) {
    var row = $('<tr><td></td><td></td></tr>');
    var cols = row.find('td');
    var isDefault = (name == "default");


    $('<a></a>', {href: '#'})
        .text(isDefault ? _('Default') : name)
        .css(isDefault ? {'font-style': 'italic'} : {})
        .on('click', function(evt) {
            evt.preventDefault();
            presets.activate(model, name);
        })
        .appendTo(cols.eq(0));


    if(!isDefault) {
        $("<button></button>", {'data-toggle': 'tooltip', 'data-placement': 'left', 'title': 'Delete'})
            .addClass('btn btn-primary btn-xs')
            .text('X')
            .tooltip()
            .on('click', function(evt) {
                evt.preventDefault();

                // Remove row
                $(this).closest('td').parent()[0].remove();

                presets.remove(model, name);
            })
            .appendTo(cols.eq(1));
    }

    var alias = model.toLowerCase().replace(' ', '_');
    $('#presets_' + alias).find('table').append(row);
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Data table
module.exports.dataTableCreate = function(columns, validate, change) {
    var row = $('<tr></tr>');
    var cells = [];

    columns.forEach(function(name) {
        var cell = $('<th></th>').text(name);
        row.append(cell);
        cells.push(cell);
    });

    var table = $("<table id='datatable'></table>").addClass('table table-hover table-condensed');
    var thead = $('<thead></thead>');
    var tbody = $('<tbody></tbody>');

    thead.append(row);
    table.append(thead).append(tbody);

    $('#data').append(table);
    dataTable = tbody;
    dataTableCells = [cells];

    tbody.editableTableWidget()
        .on('validate', function(evt, newValue) {
            var row = evt.target.parentNode.rowIndex;
            var col = evt.target.cellIndex;

            return validate(row, col, newValue);
        })
        .on('change', function(evt, newValue) {
            var row = evt.target.parentNode.rowIndex;
            var col = evt.target.cellIndex;

            return change(row, col, newValue);
        });
};

function dataTableSetCell(cell, value) {
    if(typeof value === 'string')
        cell.text(value);
    else {
        switch(value[0]) {
            case 'color':
                cell.css('background-color', value[1]).text('');
                break;

            case 'delete':
                $("<button></button>", {'data-toggle': 'tooltip', 'data-placement': 'left', 'title': 'Delete'})
                    .addClass('btn btn-primary btn-xs')
                    .text('X')
                    .tooltip()
                    .on('click', function(evt) {
                        evt.preventDefault();

                        var row = $(this).closest('td').parent()[0].sectionRowIndex + 1; // thead isn't counted

                        if(module.exports.dataTableRemoveHandler)
                            module.exports.dataTableRemoveHandler(row);
                        else
                            module.exports.dataTableRemove(row);
                    })
                    .appendTo(cell);
                break;

            default:
                throw "Unknown cell value type!";
        }
    }
}

module.exports.dataTableInsert = function(values) {
    var row = $('<tr></tr>');
    var cells = [];

    values.forEach(function(value) {
        var cell = $("<td tabindex='1'></td>");
        dataTableSetCell(cell, value);
        row.append(cell);
        cells.push(cell);
    });

    dataTable.append(row);
    dataTableCells.push(cells);
};

module.exports.dataTableSet = function(row, col, value) {
    dataTableSetCell(dataTableCells[row][col], value);
};

module.exports.dataTableRemove = function(row) {
    dataTableCells.splice(row, 1);
    $('#datatable').find('tr').eq(row).remove();
};

module.exports.dataTableDestroy = function() {
    module.exports.dataTableRemoveHandler = undefined;
    $('#datatable').remove();
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// Model options
module.exports.optionsAdd = function(name, title, value, onChange) {
    title = _(title);

    switch(typeof value) {
        case 'string':
            $('<input>', {
                'type': 'text',
                'id': 'options_' + name
            }).appendTo(
                $('<div></div>', {
                    'class': 'form-group'
                }).append(
                    $('<label></label>', {
                        'for': 'options_' + name,
                        'class': 'col-sm-4 control-label'
                    }).text(title + ':')
                ).appendTo($('#modelOptions'))
            ).on('input', function() {
                var ret = onChange($(this).val());

                if(ret === false)
                    $(this).css('background-color', 'red');
                else if(ret === true)
                    $(this).css('background-color', '#33FF33');

            }).css('background-color', '#33FF33').val(value);

            break;

        // case 'number':
        //     console.log('num');
        //     break;

        case 'object':
            var s = $('<input>', {
                'type': 'text',
                'id': 'options_' + name
            }).appendTo(
                $('<div></div>', {
                    'class': 'form-group'
                }).append(
                    $('<label></label>', {
                        'for': 'options_' + name,
                        'class': 'col-sm-4 control-label'
                    }).text(title + ':')
                ).appendTo($('#modelOptions'))
            );

            s.slider(value);
            s.on('change', function(evt) {
                onChange(evt.value.newValue);
            });

            break;

        case 'boolean':
            $('<div></div>').addClass('checkbox')
                .append(
                    $('<label></label>')
                        .append(
                            $("<input>", {
                                'type': 'checkbox',
                                'id': 'options_' + name,
                                'checked': value
                            })
                                .on('change', function() {
                                    onChange(this.checked);
                                })
                        )
                        .append(title)
                )
                .appendTo($('#modelOptions'));
            break;
    }
};

module.exports.optionsTitle = function(title) {
    $('<br/><h4></h4>').text(_(title)).appendTo($('#modelOptions'));
};

module.exports.optionsHTML = function(html) {
    $(_(html)).appendTo($('#modelOptions'));
};

module.exports.optionsDestroy = function() {
    $('#modelOptions').empty();
};

module.exports.notify = function(title, type, message) {
    switch(type) {
        case 'success':
            $.notify(
                {
                    icon: 'glyphicon glyphicon-ok-sign',
                    title: '<strong>' + title + '</strong>',
                    message: message
                },
                {
                    type: 'success'
                }
            );
            break;

        case 'warning':
            $.notify(
                {
                    icon: 'glyphicon glyphicon-warning-sign',
                    title: '<strong>' + title + '</strong>',
                    message: message
                },
                {
                    type: 'warning'
                }
            );
            break;
    }
};