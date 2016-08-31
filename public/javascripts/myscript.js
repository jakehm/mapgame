var map;
var searchBox;
var directionsDisplay;
var directionsService;


//from google maps api documentation
var inventoryButton = function(controlDiv, map) {

    //set css for border
    var controlUI = document.createElement('div');
    controlUI.style.backgroundColor = '#fff';
    controlUI.style.border = '2px solid #fff';
    controlUI.style.borderRadius = '3px';
    controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    controlUI.style.cursor = 'pointer';
    controlUI.style.marginBottom = '22px';
    controlUI.style.textAlign = 'center';
    controlUI.title = 'Click to recenter the map';
    controlDiv.appendChild(controlUI);

    //set css for interior
    var controlText = document.createElement('div');
    controlText.style.color = 'rgb(25,25,25)';
    controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
    controlText.style.fontSize = '16px';
    controlText.style.lineHeight = '38px';
    controlText.style.paddingLeft = '5px';
    controlText.style.paddingRight = '5px';
    controlText.innerHTML = 'Inventory';
    controlUI.appendChild(controlText);

    //setup click even listener
    controlUI.addEventListener('click', function() {
        map.setCenter(chicago);
    });

}

//HELPER FUNCTIONS
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

//This function is called if the current user is dead or dies.
//It is checked for in two places:
//1 on loading the page
//2 on the death event created by socket.io
var deathScreen = function(user){
    var contentString =
    'You were killed by '
    +user.killedBy
    +'<br><a class="button" href ="/logout">Back</a>';
    document.write(contentString);
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

    while (i < (coordList.length - 1)) {
        var interpCoords = interp(coordList[i], coordList[i + 1], speed);
        for (var coord in interpCoords) {
            newCoords.push(interpCoords[coord]);
        }
        i++;
    }

    return newCoords;
}

// stops user movement and deletes the marker
// used after client updates the user from the server
var clearUser = function(user){

    clearInterval(user.timerId);
    user.marker.setMap(null);
};

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

//Game Logic

//currentUser needs to be passed as well, since it needs to know distance
//between the user and the currentUser
var genKillButton = function(user, currentUser){

    var div = document.getElementById(user.username);
    var killButton = div.querySelector("#killButton");
    //check if button doesn't already exist
    if (!killButton) {
        var killButton = document.createElement("button");
        var killText = document.createTextNode("Kill");
        killButton.appendChild(killText);
        div.appendChild(killButton);
        killButton.setAttribute("id", "killButton");
        killButton.addEventListener("click", function(){ 
            socket.emit('kill', {
                killed: user.username,
                killedBy: currentUser.username
            }); 
            clearUser(user);
        });
    } 
    //this is a placeholder for what will be user.stats.killRange
    var range = 1;

    //this section is repeated in the generateInfoWindow function,
    //so it shoudl be factored out
    var markerLoc1 = currentUser.marker.getPosition();
    var markerLoc2 = user.marker.getPosition();
    var coordA = [markerLoc1.lat(), markerLoc1.lng()];
    var coordB = [markerLoc2.lat(), markerLoc2.lng()];
    var dist = calcDistance(coordA, coordB);
    //-----------------
    if (dist>range) killButton.disabled=true;
};



//creates an info window that shows various information about a user
//including a kill button
var genInfoWindow = function(user, currentUser) {
    var markerLoc1 = currentUser.marker.getPosition();
    var markerLoc2 = user.marker.getPosition();
    var coordA = [markerLoc1.lat(), markerLoc1.lng()];
    var coordB = [markerLoc2.lat(), markerLoc2.lng()];
    var dist = calcDistance(coordA, coordB);
    var contentString = user.username+'<br>distance: '+dist
        +'<br><div id="'+user.username+'"></div>';

    var infoWindow = new google.maps.InfoWindow({
        content: contentString
    });
    return infoWindow;
};

//generate other users markers
var genMarker = function(user, currentUser) {
    var markerOptions = {
        position: {
            lat: user.coordList[0][0],
            lng: user.coordList[0][1]
        },
        map: map,
    };
    user.marker = new google.maps.Marker(markerOptions);

    //shows information about a player when you click on their marker
    var infoWindow = genInfoWindow(user, currentUser);
    user.marker.addListener('click', function() { 
        infoWindow.open(map, user.marker);
        genKillButton(user, currentUser);    
    });

    return user;
};

var genPlayerMarker = function(user) {

    //image of the player's marker
    //placeholder until use picks his own image
    user.image = 'https://aerpro.com/sites/default/files/styles/minipic/public/images/photo/2004-2007_volvo_xc70_le_station_wagon_2011-03-23.jpg.jpg?itok=V0Dr6xqb';

    var markerOptions = {
        position: {
            lat: user.coordList[0][0],
            lng: user.coordList[0][1]
        },
        map: map,
        icon: user.image
    };

    user.marker = new google.maps.Marker(markerOptions);
};


//moves the marker along the coordList
//In the future maybe but all the movements in the same setInterval
//and then vary the amount of coords depending on duration of route
var travel = function(user) {
    //added another 0 to this number to make it smoother for walking
    user.coordList = expandCoords(user.coordList, 0.00001);
    user.interval = (user.duration-getTimePassed(user.updatedAt)) * 1000 / user.coordList.length;

    user.counter = 0;
    user.timerId = setInterval(function() {
        if (user.counter > (user.coordList.length - 1)) {
            clearInterval(user.timerId);
        } else {
            var newLoc = 
                new google.maps.LatLng(
                    user.coordList[user.counter][0],
                    user.coordList[user.counter][1]
                );
            user.marker.setPosition(newLoc);
            if (user.username == username) map.setCenter(newLoc);
            user.counter++;
        }
    }, user.interval);
};


//this initializes a single user.  It makes use of above helpers.    
var initUser = function(user, currentUser) {
    if(user.killedBy) {
        return;
    } else {
        extrapolate(user);
        genMarker(user, currentUser);
        travel(user);
    }
};

//this takes a list of other user objects and maps them all
var initOtherUsers = function (userList, otherUser) {
    userList.forEach(function (user) {
        initUser(user, otherUser);
    });
};


//this updates the server when a new route is chosen
var updateServer = function(user) {
    socket.emit('updateServer', {
        username: user.username,
        totalDuration: user.duration,
        coordList: user.coordList
    });
    user.updatedAt = new Date();
};

//getRoute() only needs to be run on the currentUser.
//It replaces some of the old calcAndDisplayRoute().
//user.desitination must exist
//NOTE: this is on the WALKING setting
var getRoute = function(user, cb) {
    var routeOptions = {
        origin: user.marker.getPosition(),
        destination: user.destination,
        travelMode: google.maps.TravelMode.WALKING
    };
    directionsService.route(routeOptions, function(response, status) {
        if (status === google.maps.DirectionsStatus.OK) {
            directionsDisplay.setOptions({ preserveViewport: true, suppressMarkers: true });
            directionsDisplay.setDirections(response);

            //getting coords from inner lists
            var coords = [];
            var legs = response.routes[0].legs;
            var totalDuration = 0;
            for (var i = 0; i < legs.length; i++) {
                totalDuration += legs[i].duration.value; 
                var steps = legs[i].steps;
                for (var j = 0; j < steps.length; j++) {
                    var path = steps[j].path;
                    for (k = 0; k < path.length; k++) {
                        coords.push([path[k].lat(), path[k].lng()]);
                    }
                }	
            }
            user.duration = totalDuration;
            user.coordList = coords;
            cb(user);
        } else {
            window.alert('Directions request failed due to ' + status);
        }
    });
};

//used on player the first time they log in
//returns coord in form of [x,y]
var getRandomLocation = function(){
    //define the bounds for the random spawn
    var polyCoords = [
        {lat: 44.79803805, lng: -68.80651474},
        {lat: 44.82361249, lng: -68.77098083},
        {lat: 44.79060716, lng: -68.73767853},
        {lat: 44.77866701, lng: -68.75329971}
    ];

    //construct polygon
    var randBounds = new google.maps.Polygon({
        paths: polyCoords
    });
    
    //randBounds.setMap(map);

    //I don't know what this next part is doing but
    //I saw it on stackoverflow
    var bounds = new google.maps.LatLngBounds();
    for (var i=0; i<randBounds.getPath().getLength(); i++) {
        bounds.extend(randBounds.getPath().getAt(i));
    }
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();

    while(true) {
        var ptLat = Math.random()*(ne.lat()-sw.lat())+sw.lat();
        var ptLng = Math.random()*(ne.lng()-sw.lng())+sw.lng();
        var point = new google.maps.LatLng(ptLat, ptLng);
        if (google.maps.geometry.poly.containsLocation(point, randBounds)) {
            return [ptLat, ptLng];
            break;
        }
    }
}

var listenForClick = function(user){
    google.maps.event.addListener(map, 'click', function(event){
        user.destination = event.latLng;
        clearInterval(user.timerId);
        getRoute(user, function(user){
            updateServer(user);
            travel(user);
        });
    });
};

//This functions waits for a user to enter a new location in the ui
var listenForSearch = function(user) {

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

            user.destination = places[0].geometry.location;
            clearInterval(user.timerId);
            getRoute(user, function(user){
                updateServer(user);
                travel(user);
            });
        }); //end of places for each loop
    }); //end of places_changed


}

var populateInventory = function(user){
    var inventory = document.getElementById('playerInventory');
    var contentString = '';
    if (!user.inventory){
        contentString ='You have nothing in your inventory.';
    }
    else {
        for (var item in user.inventory){
            contentString+='<p>'+item+': '+user.inventory[item];
            if (item=='money') contentString+=' usd';
            contentString+='</p>';
        }
    }
    inventory.innerHTML = contentString;
};

var genInventoryButton = function(map) {

    var inventoryButton = document.getElementById('inventoryButton');
    var inventoryModal = document.getElementById('inventoryModal');
    var span = document.getElementsByClassName("close")[0];

    inventoryButton.onclick = function() {
        inventoryModal.style.display = "block";
    }

    span.onclick = function() {
        inventoryModal.style.display = "none";
    }

    window.onclick = function(event) {
        if(event.target==inventoryModal) inventoryModal.style.display = "none"; 
    }

    inventoryButton.index = 1;    
    map.controls[google.maps.ControlPosition.BOTTOM_LEFT].push(inventoryButton);
};


// starts all the google maps service functions
var initialize = function(user, otherUsers) {

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


    genInventoryButton(map);
    populateInventory(user);
    //---------------------------------- 
    extrapolate(user);
    genPlayerMarker(user);
    var destination = user.coordList[user.coordList.length-1];
    user.destination = toLatLng(destination[0], destination[1]);
    getRoute(user, function(user) {
        travel(user);
    });

    listenForSearch(user);
    listenForClick(user);
    initOtherUsers(otherUsers, user);
};


//initialize socket conection, first part that runs on the page
var socket = io.connect();
socket.emit('mapInit', {username: username});

socket.on('users', function (users) {

    // declaring initialization variables for the current user
    var otherUsers = getOtherUsers(username, users);
    var currentUser = findUser(username, users);
    if (currentUser.killedBy) deathScreen(currentUser);
    else {

        //checking if player is new
        if (currentUser.createdAt == currentUser.updatedAt) {
            //spawning player in a ranadom location    
            currentUser.coordList = [getRandomLocation()];
            updateServer(currentUser);
        }
        var loc = currentUser.coordList[0];
        loc = toLatLng(loc[0], loc[1]); 
        var mapOptions = {
            zoom: currentUser.stats.range,
            center: loc,
            mapTypeControl: false,
            //the following options make the map fixed
            draggable: false,
            zoomControl: false,
            scrollwheel: false,
            disableDoubleClickZoom: true
        };
        map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
        //this is where everything  starts
        google.maps.event.addDomListener(window, "load", initialize(currentUser, otherUsers));

        //this goes off after the server has received another client's update
        socket.on('updateClient', function(user){
            // clear the old users setInterval and make a new user object
            if (!user.killedBy) {
                var oldUser = findUser(user.username, otherUsers);
                if (oldUser) clearUser(oldUser);
                else otherUsers.push(user);
                initUser(user, currentUser);
            }
        });

        //If someone dies, broadcast it to everyone but the killer.
        //(The killer doesn't need to send data to the server to see the effects
        //of a kill.)
        //If the current user is the one that is killed, send them to the death screen.
        socket.on('death', function(user){
            if (user.username == username) {
                deathScreen(user);
            }
            else { 
                var oldUser = findUser(user.username, otherUsers);
                clearUser(oldUser);
            }
        });
    }
});


