// Defining global variables to access from other functions
var map, num;
var circles = [],
        points = [],
        files = {};

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

    $.when($.ajax({
        url: 'api/schematics',
        type: 'GET'
    })).done(function (data) {
        // display options of schematicfiles to add to geo-point
        for (var i = 0; i < data.num_results; i++) {
            var type = data.objects[i].type;
            var option = $('<option></option>')
                    .attr("value", type)
                    .text(type);
            $('select#schematic').append(option);
            files[type] = data.objects[i];
        }
    });

    $.when($.ajax({
        url: 'api/datapoints',
        type: 'GET'
    })).done(function (data) {
        points = data.objects;
        num = data.num_results;

        // Init info display
        toggleInfoDisplays(num);

        // Add indexed circles to map
        for (var i = 0; i < num; i++) {
            var point = points[i];
            var file = files[point.type];
            drawCircle(point, file);
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
    $('button#remove').click(function () {
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

var toggleExtraOptionsDisplay = function (val) {
    $('span#num-option').hide();
    $('button#remove').hide();
    if (val == 'multiple-placement') {
        $('span#num-option').show();
    } else if (val == 'single-placement') {
        $('button#remove').show();
    }
};

google.maps.event.addDomListener(window, 'load', initMap);

// add a geo-point to database
var addPoint = function (lat, long, type) {
    $.when($.ajax({
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
        })
    })).done(function (data) {
        var file = files[data.type];
        drawCircle(data, file);
        num++;
        toggleInfoDisplays(num);
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
            var lat = circle.getCenter().lat();
            var lng = circle.getCenter().lng();
            deletePointByCoords(lat, lng);
        }
    });
    circles.push(circle);
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
            var circle = circles.pop();
            circle.setMap(null);
            num--;
            toggleInfoDisplays(num);
        }
    });
};

var deletePointByCoords = function (lat, lng) {
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
            var id = data.objects[0].id;
            deletePoint(id);
        }
    });
};

// toggle info display windows
var toggleInfoDisplays = function (num) {
    toggleRemoveButtonDisplay(num);
    toggleNumCoordsDisplay(num);
    toggleExportButtonDisplay(num);
};


// toggle the display of the remove button
var toggleRemoveButtonDisplay = function (num) {
    var elem = $('button#remove');
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