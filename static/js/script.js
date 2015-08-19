// Defining global variables to access from other functions
var map, num;
var circles = [],
        points = [],
        schematics = {};

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

    $.when(
        $.ajax({
            url: 'api/schematics',
            type: 'GET'
        })
    ).done(function (data) {
        // display options of schematicfiles to add to geo-point
        for (var i = 0; i < data.num_results; i++) {
            var type = data.objects[i].schematic;
            var option = $('<option></option>')
                .attr("value", type)
                .text(type);
            $('select#schematic').append(option);
            schematics[type] = data.objects[i];
        }
        toggleSchematicSelectDisplay(Object.keys(schematics).length);
    });

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

        // Add indexed circles to map
        for (var i = 0; i < num; i++) {
            var point = points[i];
            var type = schematics[point.type];
            drawCircle(point, type);
        }
    });

    // add map listener to index get geo-points
    google.maps.event.addListener(map, 'click', function (e) {
        var lat = e.latLng.lat();
        var lng = e.latLng.lng();
        var type = $('#schematic').val();
        addPoint(lat, lng, type);
    });

    // add a listener to remove last geo-point from database
    $('button#remove-last').click(function () {
        deletePoint(num);
    });

    // add a listener to export all indexed geo-points to csv
    $('button#export').click(function () {
        location.href = '/export';
    });

    // add an input field on certain input-options dropdown
    $('select#input-options').change(function () {
        var val = $(this).find("option:selected").val();
        toggleExtraOptionsDisplay(val);
    });
}

google.maps.event.addDomListener(window, 'load', initMap);

// add a geo-point to database
var addPoint = function (lat, long, type) {
    $.ajax({
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        url: 'api/datapoints',
        type: 'POST',
        data: JSON.stringify({
            "lat": lat,
            "long": long,
            "type": type
        }),
        success: function (data) {
            var file = schematics[data.type];
            drawCircle(data, file);
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
        center: new google.maps.LatLng(point.lat, point.long)
    };

    // Add point to map
    var circle = new google.maps.Circle(options);

    // Handle a point click
    google.maps.event.addListener(circle, 'click', function () {
        var canDelete = $('select#input-options').val() == 'single-delete';
        if (canDelete) {
            deletePointBySelection(circle);
        }
    });
    circles.push(circle);
};

// delete a geo-point from the database
var deletePoint = function (idx, circle) {
    $.ajax({
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        url: 'api/datapoints/' + idx,
        type: 'DELETE',
        success: function () {
            if (circle == null) {
                circle = circles.pop();
            }
            circle.setMap(null);
            num--;
            toggleInfoDisplays(num);
        }
    });
};

var deletePointBySelection = function (circle) {
    var lat = circle.getCenter().lat();
    var lng = circle.getCenter().lng();
    var filters = [{
            'name': 'lat',
            'op': 'eq',
            'val': lat
        },
        {
            'name': 'long',
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
        type: 'GET',
        success: function (data) {
            var idx = data.objects[0].id;
            deletePoint(idx, circle);
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
    $('span#num-option').hide();
    $('button#remove').hide();
    $('select#schematic').hide();
    if (val == 'multiple-placement') {
        $('span#num-option').show();
    } else if (val == 'single-placement') {
        if (num > 0) {
            $('button#remove').show();
        }
        $('select#schematic').show();
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
    var elem = $('select#schematic');
    if (num > 0) {
        elem.show();
    } else {
        elem.hide();
    }
};

// toggle the display of number of indexed geo-points
var toggleNumCoordsDisplay = function (num) {
    var elem = $('span#num');
    if (num > 0) {
        elem.show();
    } else {
        elem.hide();
    }
    elem.html(num + ' coordinaten geindexeerd');
};