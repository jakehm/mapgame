
var updateLocation = function() {
	var hiddenForm = document.getElementById('hiddenForm');
	
	var hiddenLoc = document.getElementById('hiddenLoc');
	hiddenLoc.value=currentLocation.toUrlValue();

	var hiddenDest = document.getElementById('hiddenDest');
	hiddenDest.value=destination.toUrlValue();
	hiddenForm.submit();
};

//updateLocation();

setInterval(updateLocation,10000);
