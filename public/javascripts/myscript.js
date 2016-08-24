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
var timerId2;
var goSignal;
var marker;
var movementOn = false;
var test = "test";
var timePassed;
var totalDuration;


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

//return the users other than the current user in a list of objects
var getOtherUsers = function(username, userList){
    var resultList = [];
    userList.forEach(function(user) {
        if (user.username!=username) resultList.push(user);
    });
    return resultList;
};

//return the current user as object
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
//
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




//
//these functions are to deal with other users
//
//

//this function takes in a user object and returns a coordList taking 
//into account where he would be according to his last updated time
var extrapolate= function(user) {
    var timePassed = getTimePassed(user.updatedAt);
	var fractionTraveled = timePassed / user.duration;
	if (fractionTraveled < 1){
	    var startIndex = fractionTraveled*user.coordList.length;
		startIndex = Math.round(startIndex);
		user.coordList = user.coordList.slice(startIndex);
	}
    else if (fractionTraveled >=1) {
        user.coordList = user.coordList.slice(-1);
    }
    return user.coordList;
}

//calculates the distance between two user objects
//coords are in the form of [x,y]
var calcDistance = function (coordA, coordB) {
    var dx2 = Math.pow((coordA[0]-coordB[0]),2);
    var dy2 = Math.pow((coordA[1]-coordB[1]),2);
    return Math.sqrt(dx2 + dy2).toFixed(2);
};

//creates an info window that shows various information about a user
//including a kill button
var createInfoWindow = function(user) {
    var markerLoc1 = marker.getPosition();
    var markerLoc2 = user.marker.getPosition();
    var coordA = [markerLoc1.lat(), markerLoc1.lng()];
    var coordB = [markerLoc2.lat(), markerLoc2.lng()];
    var dist = calcDistance(coordA, coordB);
    var contentString = user.username+'<br>distance: '
        +dist;
    //if (dist<1) {
        contentString+='<br><button id="killButton">Kill</button>';
        
        //when kill button is clicked, socket emit to alter database
        $(document).on("click", "#killButton", function(e) {
           socket.emit('kill', {
                killed: user.username,
                killedBy: username
           }); 
        });
    //}
    var infoWindow = new google.maps.InfoWindow({
        content: contentString
    });

    return infoWindow;
};

//generate other users markers
var generateMarker = function(user) {
	var markerOptions = {
		position: {
			lat: user.coordList[0][0],
			lng: user.coordList[0][1]
		},
		map: map,
	};
	user.marker = new google.maps.Marker(markerOptions);
    
    //shows information about a player when you click on their marker
    user.marker.addListener('click', function() {
        infoWindow = createInfoWindow(user);
        infoWindow.open(map, user.marker);
    });
    
    return user;
};


//moves the marker along the coordList
//In the future maybe but all the movements in the same setInterval
//and then vary the amount of coords depending on duration of route
var travel = function(user) {
    user.coordList = expandCoords(user.coordList, 0.0001);
    user.interval = (user.duration-getTimePassed(user.updatedAt)) * 1000 / user.coordList.length;

	user.counter = 0;
	user.timerId = setInterval(function() {
		if (user.counter > (user.coordList.length - 1)) {
			clearInterval(user.timerId);
		} else {
            user.marker.setPosition(
                new google.maps.LatLng(
                    user.coordList[user.counter][0],
                    user.coordList[user.counter][1]
                )
            );
			user.counter++;
		}
	}, user.interval);
};

//this initializes a single user.  It makes use of above helpers.    
var initUser = function(user) {
    if(user.killedBy) {
        return;
    } else {
        extrapolate(user);
        generateMarker(user);
        travel(user);
    }
};

//this takes a list of other user objects and maps them all
var initOtherUsers = function (userList) {
    userList.forEach(function (user) {
        initUser(user);
    });
};



//this function serves several purposes.
//It calcultes the route and puts it into a list of coords [[x,y],[x,y]...]
//It displays the line.
//It sends the new route data to the server.
//Some functionality is there only for the initial route and some is
//only for a new route.
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
				}
                else if (fractionTraveled >=1) {
                    coordList = coordList.slice(-1);
                }
				timePassed = null;
			}
            else {
                socket.emit('updateServer', {
                    username: username,
                    totalDuration: totalDuration,
                    coordList: coordList
                });
            }
            coordList.push([destination.lat(), destination.lng()]); 
			inited = true;
		} else {
			window.alert('Directions request failed due to ' + status);
		}
	});
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
			var x = coordList[i][0];
			var y = coordList[i][1];

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
var initialize = function(loc, destination, timePassed, otherUsers) {

	directionsService = new google.maps.DirectionsService();

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


	calculateAndDisplayRoute(loc, destination, timePassed);
    timePassed = null;


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

    initOtherUsers(otherUsers);
}


//initialize socket conection, first part that runs on the page
var socket = io.connect();//'lightninging.us:3000',{secure:true});
socket.emit('mapInit');


socket.on('users', function (users) {

    // declaring initialization variables for the current user
    var otherUsers = getOtherUsers(username, users);
    var currentUser = findUser(username, users);
    coordList = currentUser.coordList;
    var loc = coordList[0];
    loc = toLatLng(loc[0], loc[1]);
    var destination = coordList[coordList.length-1];
    destination = toLatLng(destination[0], destination[1]);
    timePassed = getTimePassed(currentUser.updatedAt);
    //initialize the map and all the junk above the new code
    //bringing map to outer global scope:
	var mapOptions = {
		zoom: 13,
		center: loc
	};
	map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    
    google.maps.event.addDomListener(window, "load", initialize(loc, destination, timePassed, otherUsers));

    
    //this goes off after the server has received another client's update
    socket.on('updateClient', function(user){
        // clear the old users setInterval and make a new user object
        var clearUser = findUser(user.username, otherUsers);
        clearInterval(clearUser.timerId);
        initUser(user);
    });

    //If someone dies, broadcast it to everyone but the killer.
    //(The killer doesn't need to send data to the server to see the effects
    //of a kill.)
    //If the current user is the one that is killed, send them to the death screen.
    socket.on('death', function(user){
        if (user.username == username) {
            console.log("you're killed by "+ user.killedBy)//placeholder for send to deathScreen();
        }
        else { 
            var clearUser = findUser(user.username, otherUsers);
            clearInterval(clearUser.timerId);
        //send user to be reinitialized, which checks for killed condition
            initUser(user);
        }
    });
});


