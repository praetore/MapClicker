// Defining global variables to access from other functions
var map, num, selectedSchematic, selectedOption, rectangle;
var mapCircles = [],
    points = [],
    schematics = {},
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
        center: new google.maps.LatLng(51.958581, 4.024580),
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.SATELLITE,
        streetViewControl: false
    };

    // Getting map DOM element
    var mapElement = document.getElementById('map');

    // Creating a map with DOM element which is just obtained
    map = new google.maps.Map(mapElement, mapOptions);

    rectangle = new google.maps.Rectangle({
        //fillColor: '#FF0000',
        //strokeColor: '#FF0000',
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
        if (selectedOption == 'single-placement' && selectedSchematic != null) {
            var type = schematics[selectedSchematic];
            drawCircle({"lat": lat, "lng": lng}, type);
            addPoint(lat, lng, selectedSchematic);
        } else if ((selectedOption == 'multiple-placement' && selectedSchematic != null)
            || selectedOption == 'multiple-delete') {
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
    ).done(function (data) {
            // display options of schematicfiles to add to geo-point
            for (var i = 0; i < data.num_results; i++) {
                var schematic = data.objects[i].schematic;
                var selection = $('<a></a>').text(schematic)
                    .click(function () {
                        selectedSchematic = $(this).text();
                        $('li#schematics-tab > a').html(selectedSchematic + ' <span class="caret">');
                    });
                var option = $('<li></li>');
                option.append(selection);
                $('li#schematics-tab > ul').prepend(option);
                schematics[schematic] = data.objects[i];
            }
            toggleSchematicSelectDisplay(Object.keys(schematics).length);
        });

    // Retrieve geopoints from api and display on map
    $.when(
        $.ajax({
            url: 'api/datapoints',
            type: 'GET'
        })
    ).done(function (data) {
            points = data.objects;
            num = data.num_results;

            // Init info display
            toggleInfoDisplays(num);

            // Add indexed mapCircles to map
            for (var i = 0; i < num; i++) {
                var point = points[i];
                var type = schematics[point.type];
                drawCircle(point, type);
            }
        });
}

// Display ui input controls
function initUiControls() {
    // add a listener to remove last geo-point from database
    $('button#remove-last').click(function () {
        deletePoint(num);
    });

    // add a listener to export all indexed geo-points to csv
    $('button#export').click(function () {
        location.href = '/export';
    });

    // add an input field on certain input-options dropdown
    $('ul#input-options > li > a').click(function () {
        $("li#input-options-tab > a").html($(this).text() + ' <span class="caret">');
        selectedOption = $(this).attr('data-selection');
        toggleExtraOptionsDisplay(selectedOption);
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
        var recBounds = rectangle.getBounds();
        var bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(recBounds.getNorthEast().lat(), recBounds.getSouthWest().lng()),
            new google.maps.LatLng(recBounds.getSouthWest().lat(), recBounds.getNorthEast().lng())
        );

        deletePointsByBounds(bounds.getSouthWest(), bounds.getNorthEast());
        $('button#delete-selection').prop("disabled", true);
        $('button#cancel-selection').hide();
        rectangle.setVisible(false);
        selection = {};
    });

    $('button#place-selection').click(function () {
        var count = $('input#num-option').val();
        var bounds = rectangle.getBounds();
        for (var i = 0; i < count; i++) {
            var lat = _.random(bounds.getNorthEast().lat(), bounds.getSouthWest().lat());
            var lng = _.random(bounds.getSouthWest().lng(), bounds.getNorthEast().lng());
            var type = schematics[selectedSchematic];
            drawCircle({"lat": lat, "lng": lng}, type);
            addPoint(lat, lng, selectedSchematic);
        }
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
        step: 10,
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

    $('button#button-create-schematic').click(function () {
        var schematic = $('#schematic-name').val();
        var radius = $('div#radius-slider').slider("value");
        var r = $("#red").slider("value");
        var g = $("#green").slider("value");
        var b = $("#blue").slider("value");
        var color = "#" + hexFromRGB(r, g, b);
        createSchematic(schematic, color, radius);
    });

    toggleExtraOptionsDisplay(selectedOption);
}

var deletePointsByBounds = function (sw, ne) {
    var filters = [{
        'name': 'lat',
        'op': '<',
        'val': ne.lat()
    },
        {
            'name': 'lat',
            'op': '>',
            'val': sw.lat()
        },
        {
            'name': 'lng',
            'op': '>',
            'val': sw.lng()
        },
        {
            'name': 'lng',
            'op': '<',
            'val': ne.lng()
        }];
    $.ajax({
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        url: 'api/datapoints',
        data: {"q": JSON.stringify({"filters": filters})},
        dataType: "json",
        type: 'DELETE',
        success: function () {
            var bounds = new google.maps.LatLngBounds(sw, ne);
            for (var i = 0; i < mapCircles.length; i++) {
                var circle = mapCircles[i];
                var inBounds = bounds.contains(circle.getCenter());
                if (inBounds) {
                    circle.setMap(null);
                }
                num--;
            }
            toggleInfoDisplays(num);
        }
    });
};

// add a geo-point to database
var addPoint = function (lat, lng, type) {
    $.ajax({
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        url: 'api/datapoints',
        type: 'POST',
        data: JSON.stringify({
            "lat": lat,
            "lng": lng,
            "type": type
        }),
        success: function () {
            num++;
            toggleInfoDisplays(num);
        }
    });
};

// add a circle to the map
var drawCircle = function (point, file) {
    var color = file.color;
    var radius = parseInt(file.radius);

    // Defining options for circle
    var options = {
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.35,
        map: map,
        radius: radius,
        center: new google.maps.LatLng(point["lat"], point["lng"])
    };

    // Add point to map
    var circle = new google.maps.Circle(options);

    // Handle a point click
    google.maps.event.addListener(circle, 'click', function () {
        if (selectedOption == 'single-delete') {
            deletePointByLocation(point["lat"], point["lng"]);
        }
    });
    mapCircles.push(circle);
};

// delete a geo-point from the database
var deletePoint = function (idx) {
    $.ajax({
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        url: 'api/datapoints/' + idx,
        type: 'DELETE',
        success: function () {
            var circle = mapCircles[idx - 1];
            circle.setMap(null);
            mapCircles.splice(idx - 1, 1);
            num--;
            toggleInfoDisplays(num);
        }
    });
};

// retrieve the id of selected point from the database, and remove the point
var deletePointByLocation = function (lat, lng) {
    var filters = [{
        'name': 'lat',
        'op': 'eq',
        'val': lat
    },
        {
            'name': 'lng',
            'op': 'eq',
            'val': lng
        }];
    $.ajax({
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        url: 'api/datapoints',
        data: {"q": JSON.stringify({"filters": filters})},
        dataType: "json",
        type: 'DELETE',
        success: function () {
            var point = new google.maps.LatLng(lat, lng);
            _.forEach(mapCircles, function (circle) {
                if (circle.getCenter().equals(point)) {
                    circle.setMap(null);
                    var idx = mapCircles.indexOf(circle);
                    mapCircles.splice(idx, 1);
                    num--;
                }
            });
            toggleInfoDisplays(num);
        }
    });
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
function refreshSwatch() {
    var red = $("#red").slider("value"),
        green = $("#green").slider("value"),
        blue = $("#blue").slider("value"),
        hex = hexFromRGB(red, green, blue);
    $("#swatch").css("background-color", "#" + hex);
}

var createSchematic = function (schematic, color, radius) {
    $.ajax({
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
        }),
        success: function (data) {
            var schematic = data.schematic;
            var selection = $('<a></a>').text(schematic)
                .click(function () {
                    selectedSchematic = $(this).text();
                    $('li#schematics-tab > a').html(selectedSchematic + ' <span class="caret">');
                });
            var option = $('<li></li>');
            option.append(selection);
            $('li#schematics-tab > ul').prepend(option);
            schematics[schematic] = data;
            toggleSchematicSelectDisplay(Object.keys(schematics).length);
            $('div#create-schematic').modal('hide');
        }
    });
};

var updateSchematic = function (id, schematic, color, radius) {
    $.ajax({
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        url: 'api/schematics/' + id,
        type: 'PUT',
        data: JSON.stringify({
            "schematic": schematic,
            "color": color,
            "radius": radius
        }),
        success: function (data) {
            $('li#schematics-tab > ul > a:contains("' + schematic + '")').remove();
            var newSchematic = data.objects[0].schematic;
            var selection = $('<a></a>').text(newSchematic)
                .click(function () {
                    selectedSchematic = $(this).text();
                    $('li#schematics-tab > a').html(selectedSchematic + ' <span class="caret">');
                });
            var option = $('<li></li>');
            option.append(selection);
            $('li#schematics-tab > ul').prepend(option);
            schematics[newSchematic] = data.objects[0];
            toggleSchematicSelectDisplay(Object.keys(schematics).length);
        }
    });
};

var deleteSchematic = function (schematic) {
    var filters = [{
        'name': 'schematic',
        'op': 'eq',
        'val': schematic
    }];
    $.ajax({
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        url: 'api/datapoints',
        data: {"q": JSON.stringify({"filters": filters})},
        dataType: "json",
        type: 'DELETE',
        success: function () {
            $('li#schematics-tab > ul > a:contains("' + schematic + '")').remove();
        }
    });
};

// toggle info display windows
var toggleInfoDisplays = function (num) {
    toggleRemoveButtonDisplay(num);
    toggleNumCoordsDisplay(num);
    toggleExportButtonDisplay(num);
};

// toggle visibility of elements belonging to certain dropdown options
var toggleExtraOptionsDisplay = function (val) {
    $('li#schematics-tab').hide();
    $('li#schematics-tab > a').hide();
    $('li#num-option-tab').hide();
    $('button#remove-last').hide();
    $('button#place-selection').hide();
    $('button#cancel-selection').hide();
    $('button#delete-selection').hide();
    $('button#remove-last').hide();
    $('button#export').hide();
    if (val == 'multiple-placement') {
        $('li#num-option-tab').show();
        $('li#schematics-tab').show();
        $('li#schematics-tab > a').show();
        $('button#place-selection').show();
        if (num > 0) {
            $('button#export').show();
        }
    } else if (val == 'single-placement') {
        if (num > 0) {
            $('button#remove-last').show();
            $('button#export').show();
        }
        $('li#schematics-tab').show();
        $('li#schematics-tab > a').show();
    } else if (val == 'multiple-delete') {
        $('button#delete-selection').show();
    }
};

// toggle the display of the remove button
var toggleRemoveButtonDisplay = function (num) {
    var elem = $('button#remove-last');
    if (num > 0) {
        elem.show();
    } else {
        elem.hide();
    }
};

// toggle the display of the remove button
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
var toggleNumCoordsDisplay = function (num) {
    var elem = $('p#num');
    if (num > 0) {
        elem.show();
    } else {
        elem.hide();
    }
    elem.html(num + ' coordinaten geindexeerd');
};