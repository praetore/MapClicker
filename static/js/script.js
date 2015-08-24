// Defining global variables to access from other functions
var map, selectedSchematic, action, rectangle, selectedDirection;
var circles = [],
    points = [],
    schematics = [],
    selection = {};

$('document').ready(function () {
    initMap();
    initIndexedData();
    initUiControls();
});

function initMap() {
    // Enabling new cartography and themes
    google.maps.visualRefresh = true;

    // Setting starting options of map
    var mapOptions = {
        center: new google.maps.LatLng(51.90, 4.43),
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.SATELLITE,
        streetViewControl: false
    };

    // Getting map DOM element
    var mapElement = document.getElementById('map');

    // Creating a map with DOM element which is just obtained
    map = new google.maps.Map(mapElement, mapOptions);

    rectangle = new google.maps.Rectangle({
        map: map,
        strokeWeight: 2,
        strokeOpacity: 0.8,
        fillOpacity: 0.35,
        editable: true,
        draggable: true,
        visible: false
    });

    rectangle.setMap(map);

    // add map listener to execute input actions
    google.maps.event.addListener(map, 'click', function (e) {
        var lat = e.latLng.lat();
        var lng = e.latLng.lng();
        if (action == 'single-placement' && selectedSchematic != null && selectedDirection != null) {
            addPoint({
                "lat": lat,
                "lng": lng,
                "type": selectedSchematic.schematic,
                "direction": selectedDirection
            });
        } else if ((action == 'multiple-placement' && selectedSchematic != null && selectedDirection != null)
            || action == 'multiple-delete') {
            if (!selection["first"]) {
                selection["first"] = e.latLng;
            } else {
                selection["second"] = e.latLng;
                $('button#place-selection').prop("disabled", false);
                $('button#delete-selection').prop("disabled", false);
                rectangle.setVisible(true);
                rectangle.setBounds(new google.maps.LatLngBounds(selection["first"], selection["second"]));
                $('button#cancel-selection').show();
            }
        }
    });
}

// Load the previously indexed geopoints and schematics from the api
function initIndexedData() {
    // Retrieve schematics data
    $.when(
        $.ajax({
            url: 'api/schematics',
            type: 'GET'
        })
    ).done(
        function (data) {
            // display options of schematicfiles to add to geo-point
            _.each(data.objects, function (schematic) {
                addSchematicSelection(schematic);
                schematics.push(schematic);
            });
        });

    // Retrieve geopoints from api and display on map
    $.when(
        $.ajax({
            url: 'api/datapoints',
            type: 'GET'
        })
    ).done(
        function (data) {
            points = data.objects;

            // Add indexed mapCircles to map
            _.map(points, drawCircle);
            updatePointCountDisplay(points.length);
        });
}

// Display ui input controls
function initUiControls() {
    // add a listener to remove last geo-point from database
    $('button#remove-last').click(function () {
        var lastPoint = points.slice(-1)[0];
        var lastCircle = circles.slice(-1)[0];
        if (points.length == 1) {
            $('button#remove-last').hide();
        }
        deletePoint(lastPoint.id, lastCircle);
    });

    // add a listener to export all indexed geo-points to csv
    $('button#export').click(function () {
        location.href = '/export';
    });

    // add an input field on certain input-options dropdown
    $('ul#input-options > li > a').click(function () {
        $("li#input-options-tab > a").html($(this).text() + ' <span class="caret">');
        action = $(this).attr('data-selection');
        toggleExtraOptionsDisplay(action);
    });

    $('button#place-selection').prop("disabled", true);
    $('button#delete-selection').prop("disabled", true);
    $('button#cancel-selection').click(function () {
        $(this).hide();
        selection = {};
        rectangle.setVisible(false);
        $('button#place-selection').prop("disabled", true);
        $('button#delete-selection').prop("disabled", true);
    });

    $('button#delete-selection').click(function () {
        var bounds = rectangle.getBounds();
        var maxLat = _.max([bounds.getNorthEast().lat(), bounds.getSouthWest().lat()]);
        var minLat = _.min([bounds.getNorthEast().lat(), bounds.getSouthWest().lat()]);
        var maxLng = _.max([bounds.getSouthWest().lng(), bounds.getNorthEast().lng()]);
        var minLng = _.min([bounds.getSouthWest().lng(), bounds.getNorthEast().lng()]);

        deletePointsByBounds(minLat, maxLat, minLng, maxLng);
        $('button#delete-selection').prop("disabled", true);
        $('button#cancel-selection').hide();
        rectangle.setVisible(false);
        selection = {};
    });

    $('button#place-selection').click(function () {
        var bounds = rectangle.getBounds();
        var maxLat = _.max([bounds.getNorthEast().lat(), bounds.getSouthWest().lat()]);
        var minLat = _.min([bounds.getNorthEast().lat(), bounds.getSouthWest().lat()]);
        var maxLng = _.max([bounds.getSouthWest().lng(), bounds.getNorthEast().lng()]);
        var minLng = _.min([bounds.getSouthWest().lng(), bounds.getNorthEast().lng()]);

        var count = $('input#num-option').val();
        var points = [];
        for (var i = 0; i < count; i++) {
            var lat = _.random(minLat, maxLat);
            var lng = _.random(minLng, maxLng);
            var point = {
                "lat": lat,
                "lng": lng,
                "type": selectedSchematic.schematic,
                "direction": selectedDirection
            };
            points.push(point);
        }
        addMultiplePoints(points);
        $('button#place-selection').prop("disabled", true);
        $('button#cancel-selection').hide();
        rectangle.setVisible(false);
        selection = {};
    });

    $('div#radius-slider').slider({
        range: "min",
        value: 0,
        min: 0,
        max: 150,
        step: 5,
        slide: function () {
            $('p#radius-num').text('Radius: ' + $(this).slider("value"))
        },
        change: function () {
            $('p#radius-num').text('Radius: ' + $(this).slider("value"))
        }
    });
    $("#red, #green, #blue").slider({
        orientation: "horizontal",
        range: "min",
        max: 255,
        value: 127,
        slide: refreshSwatch,
        change: refreshSwatch
    });
    $("#red").slider("value", 255);
    $("#green").slider("value", 140);
    $("#blue").slider("value", 60);

    $("li#direction-tab > ul > li > a").click(function () {
        selectedDirection = $(this).attr("id");
        $("li#direction-tab > a").html($(this).text() + ' <span class="caret">');
    });

    $("button[id*='e-schematic']").click(function () {
        var schematic;
        var radius = $('div#radius-slider').slider("value");
        var r = $("#red").slider("value");
        var g = $("#green").slider("value");
        var b = $("#blue").slider("value");
        var color = "#" + hexFromRGB(r, g, b);
        if ($(this).attr("id") == 'create-schematic') {
            schematic = $('#schematic-name').val();
            createSchematic(schematic, color, radius);
        } else if ($(this).attr("id") == 'update-schematic') {
            updateSchematic(selectedSchematic.id, selectedSchematic.schematic, color, radius);
        } else if ($(this).attr("id") == 'delete-schematic') {
            deleteSchematic(selectedSchematic);
        }
        $('div#schematic-modal').modal('hide');
    });

    $('a#create-schematic-option').click(function () {
        $('button#update-schematic').hide();
        $('button#delete-schematic').hide();
        $('div#schematic-options').hide();

        $('button#create-schematic').show();
        $('div#schematic-name-field').show();
        $('input#create-schematic').show();
        $('h4#schematic-modal-title').text('Nieuwe schematic maken');
    });

    var modalControlUpdate = function () {
        var rgb = hexToRgb(selectedSchematic.color);
        $("#red").slider("value", rgb[0]);
        $("#green").slider("value", rgb[1]);
        $("#blue").slider("value", rgb[2]);
        $("div#radius-slider").slider("value", selectedSchematic.radius);
    };

    $('a#update-schematic-option').click(function () {
        modalControlUpdate();
        $('div#schematic-name-field').hide();
        $('input#create-schematic').hide();
        $('button#create-schematic').hide();

        $('button#update-schematic').show();
        $('button#delete-schematic').show();
        $('div#schematic-options').show();
        $('h4#schematic-modal-title').text('Bestaande schematic bewerken');
    });

    $('ul#schematic-select > li > a').click(modalControlUpdate());

    toggleExtraOptionsDisplay(action);
}

var addSchematicSelection = function (schematic) {
    var selection = $('<a></a>').text(schematic.schematic)
        .click(function () {
            $('ul.select-schematic').prev()
                .html(schematic.schematic + ' <span class="caret">');
            selectedSchematic = schematic;
        });
    var option = $('<li></li>').attr('data-value', schematic.schematic).append(selection);
    $('ul.select-schematic').prepend(option);
};

var addMultiplePoints = function (_points) {
    $.when(
        $.ajax({
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            url: 'api/multihandler',
            type: 'POST',
            data: JSON.stringify({"objects": _points}
            )
        })
    ).done(
        function (data) {
            _.forEach(data.objects, function (point) {
                drawCircle(point);
                points.push(point);
            });
            toggleInfoDisplays();
        }
    )
};

// add a geo-point to database
var addPoint = function (point) {
    $.when($.ajax({
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        url: 'api/datapoints',
        type: 'POST',
        data: JSON.stringify(point)
    })).done(function (data) {
        points.push(data);
        drawCircle(data);
        toggleInfoDisplays();
    });
};

// add a circle to the map
var drawCircle = function (point) {
    var schematic = _.find(schematics, {"schematic": point.type});
    var color = schematic.color;
    var radius = parseInt(schematic.radius);

    // Defining options for circle
    var options = {
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.35,
        map: map,
        radius: radius,
        center: new google.maps.LatLng(point.lat, point.lng)
    };

    // Add circle to map
    var circle = new google.maps.Circle(options);

    // Handle a onclick
    google.maps.event.addListener(circle, 'click', function () {
        if (action == 'single-delete') {
            deletePoint(point.id, circle);
        }
    });
    circles.push(circle);
};

// delete a geo-point from the database
var deletePoint = function (idx, circle) {
    $.when($.ajax({
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        url: 'api/datapoints/' + idx,
        type: 'DELETE'
    })).done(function () {
        circle.setMap(null);
        _.remove(circles, function (c) {
            return c.getCenter().lat() == circle.getCenter().lat() &&
                c.getCenter().lng() == circle.getCenter().lng();
        });
        _.remove(points, function (n) {
            return n.id == idx;
        });
        toggleInfoDisplays();
    });
};

// delete all points within a rectangle
var deletePointsByBounds = function (minLat, maxLat, minLng, maxLng) {
    var filters = [{
        'name': 'lat',
        'op': 'le',
        'val': maxLat
    }, {
        'name': 'lat',
        'op': 'ge',
        'val': minLat
    }, {
        'name': 'lng',
        'op': 'ge',
        'val': minLng
    }, {
        'name': 'lng',
        'op': 'le',
        'val': maxLng
    }];
    $.when($.ajax({
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        url: 'api/datapoints',
        data: {"q": JSON.stringify({"filters": filters})},
        dataType: "json",
        type: 'GET'
    })).then(
        function (data) {
            if (data.num_results > 0) {
                $.ajax({
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    url: 'api/multihandler',
                    data: JSON.stringify({"objects": data.objects}),
                    dataType: "json",
                    type: 'DELETE'
                });
            }
        }
    ).done(
        function () {
            _.eachRight(circles, function (circle) {
                var center = circle.getCenter();
                var inBounds = center.lat() <= maxLat && center.lat() >= minLat &&
                    center.lng() <= maxLng && center.lng() >= minLng;
                if (inBounds) {
                    circle.setMap(null);
                    var idx = circles.indexOf(circle);
                    circles.splice(idx, 1);
                }
            });

            _.remove(points, function (point) {
                return point.lat <= maxLat && point.lat >= minLat &&
                    point.lng <= maxLng && point.lng >= minLng;
            });
            toggleInfoDisplays();
        }
    );
};

var deletePointsByType = function (schematic) {
    var filters = [{
        'name': 'type',
        'op': 'le',
        'val': schematic.schematic
    }];
    $.when($.ajax({
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        url: 'api/datapoints',
        data: {"q": JSON.stringify({"filters": filters})},
        dataType: "json",
        type: 'GET'
    })).then(
        function (data) {
            if (data.num_results > 0) {
                $.ajax({
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    url: 'api/multihandler',
                    data: JSON.stringify({"objects": data.objects}),
                    dataType: "json",
                    type: 'DELETE'
                });
            }
        }
    ).done(
        function () {
            _.remove(points, function (point) {
                return point.type == schematic.schematic;
            });
            redrawCircles();
            toggleInfoDisplays();
        }
    );
};

var redrawCircles = function () {
    _.each(circles, function (circle) {
        circle.setMap(null);
    });

    circles = [];

    _.each(points, function (point) {
        drawCircle(point);
    });
};

var reloadSchematicsSelect = function () {
    $('ul.select-schematic').empty();
    _.each(schematics, function (schematic) {
        addSchematicSelection(schematic);
    });
    $('li#schematics-tab > ul')
        .append('<li role="separator" class="divider"></li>' +
        '<li><a href="#" data-toggle="modal" data-target="#schematic-modal" ' +
        'id="create-schematic-option">Nieuwe schematic aanmaken</a></li>' +
        '<li><a href="#" data-toggle="modal" data-target="#schematic-modal" ' +
        'id="update-schematic-option">Bestaande schematic bewerken</a></li>')
};

function hexFromRGB(r, g, b) {
    var hex = [
        r.toString(16),
        g.toString(16),
        b.toString(16)
    ];
    $.each(hex, function (nr, val) {
        if (val.length === 1) {
            hex[nr] = "0" + val;
        }
    });
    return hex.join("").toUpperCase();
}

var hexToRgb = function(hex) {
  if (hex.length != 7) {
    hex = hex.match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
    hex.shift();
    if (hex.length != 3)
      return null;
    var rgb = [];
    for ( var i = 0; i < 3; i++) {
      var value = hex[i];
      if (value.length == 1)
        value += value;
      rgb.push(parseInt(value, 16));
    }
    return rgb;
  } else {
    hex = parseInt(hex.slice(1), 16);
    return [ hex >> 16, hex >> 8 & 0xff, hex & 0xff ];
  }
};

function refreshSwatch() {
    var red = $("#red").slider("value"),
        green = $("#green").slider("value"),
        blue = $("#blue").slider("value"),
        hex = hexFromRGB(red, green, blue);
    $("#swatch").css("background-color", "#" + hex);
}

var createSchematic = function (schematic, color, radius) {
    $.when($.ajax({
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        url: 'api/schematics',
        type: 'POST',
        data: JSON.stringify({
            "schematic": schematic,
            "color": color,
            "radius": radius
        })
    })).done(function (data) {
        addSchematicSelection(data);
        schematics.push(data);
        toggleInfoDisplays();
    });
};

var updateSchematic = function (id, schematic, newColor, newRadius) {
    $.when($.ajax({
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        url: 'api/schematics/' + id,
        type: 'PUT',
        data: JSON.stringify({
            "color": newColor,
            "radius": newRadius
        })
    })).done(
        function () {
            var schematic = _.find(schematics, {"id": id});
            schematic.color = newColor;
            schematic.radius = newRadius;
            redrawCircles();
            toggleInfoDisplays();
        }
    );
};

var deleteSchematic = function (schematic) {
    $.when($.ajax({
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        url: 'api/schematics/' + schematic.id,
        type: 'DELETE'
    })).done(function () {
        deletePointsByType(schematic);
        var idx = schematics.indexOf(schematic);
        schematics.splice(idx, 1);
        reloadSchematicsSelect();
        selectedSchematic = null;
        $('ul.select-schematic').prev()
            .html('Selecteer schematic <span class="caret">');
        toggleInfoDisplays();
    });
};

// toggle info display windows
var toggleInfoDisplays = function () {
    updatePointCountDisplay(points.length);
    toggleExportButtonDisplay(points.length);
    toggleSchematicSelectDisplay(schematics.length);
    toggleRemoveLast(points.length);
};

// toggle visibility of elements belonging to certain dropdown options
var toggleExtraOptionsDisplay = function (val) {
    $('li#schematics-tab').hide();
    $('li#schematics-tab > a').hide();
    $('li#num-option-tab').hide();
    $('button#place-selection').hide();
    $('button#cancel-selection').hide();
    $('button#delete-selection').hide();
    $('li#direction-tab').hide();
    toggleRemoveLast(0);

    if (val == 'multiple-placement') {
        $('li#num-option-tab').show();
        $('li#schematics-tab').show();
        $('li#schematics-tab > a').show();
        $('button#place-selection').show();
        $('li#direction-tab').show();
        toggleRemoveLast(0);
    } else if (val == 'single-placement') {
        $('li#direction-tab').show();
        $('li#schematics-tab').show();
        $('li#schematics-tab > a').show();
        toggleRemoveLast(points.length);
    } else if (val == 'multiple-delete') {
        $('button#delete-selection').show();
        toggleRemoveLast(0);
    } else if (val == 'single-delete') {
        toggleRemoveLast(0);
    }
};

// toggle the display of the delete last point button
var toggleRemoveLast = function (num) {
    var elem = $('button#remove-last');
    if (action == 'single-placement' && num > 0) {
        elem.show();
    } else {
        elem.hide();
    }
};

// toggle the display of the export button
var toggleExportButtonDisplay = function (num) {
    var elem = $('button#export');
    if (num > 0) {
        elem.show();
    } else {
        elem.hide();
    }
};

// toggle the display of the schematic selection dropdown
var toggleSchematicSelectDisplay = function (num) {
    var elem = $('li#schematics-tab');
    if (num > 0) {
        elem.show();
    } else {
        elem.hide();
    }
};

// toggle the display of number of indexed geo-points
var updatePointCountDisplay = function (num) {
    $('p#num').html(num + ' coordinaten geindexeerd');
};