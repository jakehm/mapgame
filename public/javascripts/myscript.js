var inited = false;
var xLoc;
var xDest;
var yDest;
var yLoc;
var updatedAt;
var currentLocation;
var coordList = [];
var markers = [];
var map;
var searchBox;
var directionsDisplay;
var directionsService;
var timerId;
var goSignal;
var marker;
var movementOn = false;
var test = "test";
var timePassed;

//the following has to be done because I didn't set some below functions
//to equal variables (I think), so they are trying to do things with
//latlng objects when they are initialized, before the latlng objects
//are defined.
var loc = new google.maps.LatLng({
        lat: parseFloat(40.712),
        lng: parseFloat(-74.006)
});
var destination = new google.maps.LatLng({
        lat: parseFloat(42.360),
        lng: parseFloat(-71.059)
});



//HELPER FUNCTIONS
//find user object in a list of users by username
var findUser = function (username, userList) {
    var currentUser;
    userList.forEach(function (user) {    
        if (user.username == username) {
            currentUser =  user;
        }
    });
    return currentUser;
};

//get the current time in seconds
var getCurrentTime = function() {
    return new Date().getTime() / 1000;
};

//get the seconds that have passed since a given date
var getTimePassed = function(d) {
    currentTime = new Date().getTime()/1000;
    date = new Date(d);
    date = date.getTime() / 1000;
    return (currentTime - date);
};

//turn x and y coordinates into a google maps latlng object
var toLatLng = function (x, y) {
    var point = new google.maps.LatLng({
        lat: parseFloat(x),
        lng: parseFloat(y)
    });
    return point;
};
//END HELPER FUNCTIONS


//These functions all work with google maps directions services
var calculateAndDisplayRoute = function(loc, destination) {
	coordList = [];
	var routeOptions = {
		origin:loc,
		destination:destination,
		travelMode: google.maps.TravelMode.DRIVING
	};

	directionsService.route(routeOptions, function(response, status) {
		if (status === google.maps.DirectionsStatus.OK) {
			directionsDisplay.setDirections(response);

			//getting coords from inner lists      
			var legs = response.routes[0].legs;
			var totalDuration = 0;
			for (var i = 0; i < legs.length; i++) {
				totalDuration += legs[i].duration.value; 
				var steps = legs[i].steps;
				for (var j = 0; j < steps.length; j++) {
					var path = steps[j].path;
					for (k = 0; k < path.length; k++) {
						coordList.push([path[k].lat(), path[k].lng()]);
					}
				}	
			}
			//predicts location while you were gone
			if(timePassed) {
				var fractionTraveled = timePassed / totalDuration;
				if (fractionTraveled < 1){
					var startIndex = fractionTraveled*coordList.length;
					startIndex = Math.round(startIndex);
					coordList = coordList.slice(startIndex);
					timePassed = null;
				}
			}
            coordList.push([destination.lat(), destination.lng()]); 
			inited = true;
		} else {
			window.alert('Directions request failed due to ' + status);
		}
	});
}

var interp = function(coord1, coord2, speed) {
	var newCoords = [];
	var x1 = coord1[0];
	var x2 = coord2[0];
	var y1 = coord1[1];
	var y2 = coord2[1];

	while (true) {
		var dx = x2 - x1;
		var dy = y2 - y1;
		var d = Math.sqrt(dx * dx) + Math.sqrt(dy * dy);
		if (d > speed) {
			var ratio = speed / d;
			x1 += ratio * dx;
			y1 += ratio * dy;
			newCoords.push([x1, y1]);
		} else {
			newCoords.push(coord2);
			break;
		}
	} //while loop
	return newCoords;
}


var expandCoords = function(coordList, speed) {
	var newCoords = [];
	var i = 0;

	while (i < (coordList.length - 2)) {
		var interpCoords = interp(coordList[i], coordList[i + 1], speed);
		for (var coord in interpCoords) {
			newCoords.push(interpCoords[coord]);
		}
		i++;
	}
	return newCoords;
}


var moveMarker = function() {
	movementOn = true;
	goSignal = true;
	coordList = expandCoords(coordList, 0.0001);
	var i = 0;
	timerId = setInterval(function() {
		if (i > (coordList.length - 1)) {
			clearInterval(timerId);
		} else if (goSignal === false) {
			clearInterval(timerId);
		} else {
			x = coordList[i][0];
			y = coordList[i][1];

			var loc = new google.maps.LatLng(x, y);
			marker.setPosition(loc);
			i++;
		}
	}, 500);
	movementOn = false;
}
//END GOOGLE MAPS SERVICES FUNCTIONS


//This functions waits for a user to enter a new location in the ui
var listenForSearch = function() {

	//listen for eventlistenersent fired
	var markers = [];
	searchBox.addListener('places_changed', function() {
		var places = searchBox.getPlaces();
		if (places.length === 0) {
			return;
		}
		//clear out old markers
		markers.forEach(function(mark) {
			mark.setMap(null);
		});
		markers = [];

		//for each place, get icon, name and location
		var bounds = new google.maps.LatLngBounds();
		places.forEach(function(place) {
			var icon = {
				url: place.icon,
				size: new google.maps.Size(71, 71),
				origin: new google.maps.Point(0, 0),
				anchor: new google.maps.Point(17, 34),
				scaledSize: new google.maps.Size(25, 25)
			};

			//create a marker for each place
			markers.push(new google.maps.Marker({
				map: map,
				icon: icon,
				title: place.name,
				position: place.geometry.location
			}));

			if (place.geometry.viewport) {
				// Only geocodes have viewport.
				bounds.union(place.geometry.viewport);
			} else {
				bounds.extend(place.geometry.location);
			}

			map.fitBounds(bounds);

			goSignal = false;
			inited = false;

			var getResult3 = function() {
				if (movementOn === false) {
					calculateAndDisplayRoute(marker.getPosition(), places[0].geometry.location);
					destination = places[0].geometry.location;
				}
				else {
					setTimeout(getResult3, 100);
				}
			};
			getResult3();


			var getResult2 = function() {
				if (inited === true && movementOn === false) {
					moveMarker();
					
				} else {
					setTimeout(getResult2, 500);
				}
			};
			getResult2();
		}); //end of places for each loop
	});
}

// starts all the google maps service functions
var initialize = function(loc, destination) {

	directionsService = new google.maps.DirectionsService();
/* trying this thing where i bring map into global scope
	var mapOptions = {
		zoom: 13,
		center: loc
	};
	map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
*/

	var rendererOptions = {
		map: map
	};
	directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);

	//initializing searchBox
	var input = document.getElementById('pac-input');
	searchBox = new google.maps.places.SearchBox(input);

	map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);


	//bias searchbox results towards current map's viewport
	map.addListener('bounds_changed', function() {
		searchBox.setBounds(map.getBounds());
	});


	calculateAndDisplayRoute(loc, destination);



	var getResult = function() {
		if (inited) {
			
            //image of the player's marker
            var image = 'https://aerpro.com/sites/default/files/styles/minipic/public/images/photo/2004-2007_volvo_xc70_le_station_wagon_2011-03-23.jpg.jpg?itok=V0Dr6xqb';

			var markerOptions = {
				position: {
					lat: coordList[0][0],
					lng: coordList[0][1]
				},
				map: map,
				icon: image
			};

			marker = new google.maps.Marker(markerOptions);


			moveMarker();


			listenForSearch();
		} else {
			setTimeout(getResult, 500);
		}
	};
	getResult();
}



//initialize socket conection, first part that runs on the page
var socket = io.connect('http://localhost:3000');
socket.emit('mapInit');
socket.on('users', function (users) {
    // declaring initialization variables for the current user
    var currentUser = findUser(username, users);
    var coordList = currentUser.coordList;
    var loc = coordList[0];
    loc = toLatLng(loc[0], loc[1]);
    var destination = coordList[coordList.length-1];
    destination = toLatLng(destination[0], destination[1]);
    var timePassed = getTimePassed(currentUser.updatedAt);
    //initialize the map and all the junk above the new code
    //bringing map to outer global scope:
	var mapOptions = {
		zoom: 13,
		center: loc
	};
	map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    
    google.maps.event.addDomListener(window, "load", initialize(loc, destination));
});


