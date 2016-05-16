var request = require('request');
var http = require('http');
var _ = require('lodash');
var tiny = require('tinyurl');
var Twit = require('twit');
var base = "https://hacker233:k+UN8JzAAS8@distribution-xml.booking.com/json/bookings.";
var baseV2 = "https://hacker233:k+UN8JzAAS8@distribution-xml.booking.com/json/";
var fBase = "http://196.43.248.14:9800/jjwebservice/Booking.asmx/SearchFlights?"
var lBase = "http://localhost/jambo/fares_json.php?d="; 
var hotels = null;
var user = null;
var searchCity = null;

var cities = [
		{
			name: "nairobi",
			code: "NBO"
		},
		{
			name: "diani",
			code: "UKA"
		},
		{
			name: "mombasa",
			code: "MBA"
		},
		{
			name: "malindi",
			code: "MYD"
		},
		{
			name: "lamu",
			code: "LAU"
		},
		{
			name: "kisumu",
			code: "KIS"
		},
		{
			name: "eldoret",
			code: "ELD"
		}
	]

var config = require('./config');
var T = new Twit(config);

var botName = "bholidaybot";


/* Tweet functions */
function extractWordsFromTweet(botData) {
    var excludeNonAlpha = /[^a-zA-Z]+/;
    var excludeURLs = /https?:\/\/[-a-zA-Z0-9@:%_\+.~#?&\/=]+/g;
    var excludeShortAlpha = /\b[a-z][a-z]?\b/g;
    var excludeHandles = /@[a-z0-9_-]+/g;
    var excludePatterns = [excludeURLs, excludeShortAlpha, excludeHandles];
    botData.tweet = botData.baseTweet.toLowerCase();
    _.each(excludePatterns, function(pat) {
        botData.tweet = botData.tweet.replace(pat, '');
    });
    botData.tweet = botData.tweet.replace(' ', '');
    return botData;
};

/// Post Function
function tweetThis(msg) {
    var r = Math.floor((Math.random() * 1000) + 1);
    T.post('statuses/update', {
            status: msg //+ r
        },
        function(err, data, response) {
            if (!err) {
                console.log(' Tweeted successfully');
            } else {
                console.log('Error occured :' + err);
            }
        });
}


// Triggered Reply functionality
var replyStreamer = T.stream('user');
replyStreamer.on('tweet', function(tweet) {
    /// On mentions
    /// Start conversation
    var replyTo = tweet.in_reply_to_screen_name;
    if (replyTo === botName && tweet.text.indexOf("RT") === -1) {
        var botData = {
            baseTweet: tweet.text.toLowerCase(),
            tweetUsername: tweet.user.screen_name
        };

        user = tweet.user.screen_name;
        searchCity = tweet.user.screen_name;
        botData = extractWordsFromTweet(botData);

        // var hotel = getCityAutocomplete(botData.tweet);
        // console.log(hotel);
        // if(hotel.hotel_name != undefined ){
        // console.log("Response: @"+ tweet.user.screen_name + " You can visit "+ hotel.hotel_name +" ");
        // }else{
        // console.log("Response: @"+ tweet.user.screen_name + " Sorry, I couldn't find a hotel in "+ botData.tweet +" ");
        // }
        //
        getCityAutocomplete(botData.tweet);
        //replyStreamer.stop(); // limit for test purposes
    }
});





/*  End fo tweet functions */
 
/* Function getCityId   /*
***
@param cityName -- name of city to get code for
@result cityId -- Booking.com Id of the city
***
**/

function getCityId( cityName ){
	var url = base+"getCities";
	var cityName = cityName;
	return request({
    	url: url,
    	json: true
	}, function (error, response, body) {
    	if (!error && response.statusCode === 200) {
	        var city = searchJson(body, cityName);
	        var cityId = city.city_id;
	        // Don't return result because process is asynchronous. Consume here instead
	        var hotels = getHotelAvailability(cityId, 10);
	        // console.log(hotels);
	    }
	});
}

function getCityAutocomplete( term ){
	term = term;
	var url = base + "autocomplete?text="+term+"&languagecode=en&dest_type=city";

	return request({
    	url: url,
    	json: true
	}, function (error, response, body) {
    	if (!error && response.statusCode === 200) {
    		//take the first result
    		// console.log(body[0]);
    		if(body.length == 0){
    			console.log("No city was found that matches");
    			var message = "@"+ user +" Oops..Wait, we didn't get any city named "+ term;
				tweetThis(message);
    			console.log('not good');
    			return;
    		}
    		console.log("body");
    		console.log(body.length);
    		var city = body[0];
    		var cityId = city.dest_id;
	        // // Don't return result because process is asynchronous. Consume here instead
	        getHotelAvailability(cityId, 50);
	        getFlightsToCity(term, offsetDate(7));
	    }
	    else{

	    }
	});
}

/* Function searchJson   /*
***
Not optimised for speed and performance, but will work for now :-(
@param body -- json array to search from
@return element -- parameter to search/match
***
**/

function searchJson(body,searchTerm){
	for (var i = 0; i < body.length; i++){
		if(body[i].name == searchTerm) {
	    	return body[i];
	  	}
	}
}

function reverseCityCodeSearch(body,searchTerm){
	for (var i = 0; i < body.length; i++){
		if(body[i].code == searchTerm) {
	    	return body[i];
	  	}
	}
}

/* Function getHotels   /*
***
@param cityId -- Booking.com city Id
@result array -- json array of matched hotels
***
**/

function getHotels(cityId , rows){
	var cityId = cityId;
	var url = base + "getHotels?"+"city_ids="+ cityId + "&rows="+ rows +"&show_test=0";
	request({
		url : url,
		json : true
	}, function(error, response, body) {
		if( !error && response.statusCode == 200 ){
			// Gotten hotels array. Then what?
		}
	}) 
}


function getHotelAvailability(cityId , rows){
	var cityId = cityId;
	var checkIn = getFormattedDate() ;
	var checkOut = offsetDate(7);
	var url = baseV2 + "getHotelAvailabilityV2?output=hotel_details,hotel_amenities,room_details&checkin="+ checkIn +"&checkout="+ checkOut+"&room1=A&city_ids="+ cityId + "&rows="+ rows +"&order_by=price&order_dir=asc&min_review_score=3";
	request({
		url : url,
		json : true
	}, function(error, response, body) {
		if( !error && body.hotels.length > 0 && response.statusCode == 200 ){
			// Got hotel array. Fetch details?
			getHotelDetails(body.hotels[0].hotel_id);
		}
		else{
			console.log("No hotels found");
			var message = "@"+ user +" Oops..:( we couldn't find you a hotel there";
			tweetThis(message);
			// console.log(term);
			return;
		}
	}) 
}


function getFormattedDate(duration) {
    var date = new Date(); //now
    var month = date.getMonth() + 1;
    var day = date.getDate();

    month = (month < 10 ? "0" : "") + month;
    day = (day < 10 ? "0" : "") + day;

    var checkOut = date.getFullYear() + "-" + month + "-" + day;

    return checkOut;
}

function offsetDate(duration){
	var date = new Date(); //now
    var offsetStamp = date.setTime( date.getTime() + duration * 86400000);
    var offsetDate = new Date(offsetStamp);
    var month = offsetDate.getMonth() + 1;
    var day = offsetDate.getDate();

    month = (month < 10 ? "0" : "") + month;
    day = (day < 10 ? "0" : "") + day;

    var checkOut = date.getFullYear() + "-" + month + "-" + day;

    return checkOut;
}

function getHotelDetails( id ){
	var url = base + "getHotels?&hotel_ids="+id;

	request({
		url : url,
		json : true
	}, function(error, response, body) {
		if( !error && response.statusCode == 200 ){
			// Gotten available hotels array. Then what?
			var message = "@"+ user + " You can get a hotel from " + body[0].currencycode + " " + body[0].minrate +" a night";
			// shorten the link to the hotel;
			tiny.shorten( body[0].url , function(result) {
				//remove the preceeding http://
			    message = message + " here " + result;
			    console.log(message);
			    console.log("user");
			    console.log(user);
			    tweetThis(message);

			});
		}
		else{
		    console.log("Response: @"+ botData.tweetUsername + " Sorry, I couldn't find a hotel in "+ botData.tweet +" ");
		}
	}) 
}

function getFlightsToCity(city, date){
	var date = date.split("-");
	var date = date[1] + "/" + date[2] + "/" + date[0];
	var cityCode = searchJson(cities, city);
	if(cityCode == undefined ){
		console.log("Jambojet does not operate in that route. Try KLM in V2");
		return;
	}

	var cityCode = searchJson(cities, city).code;
	var u2 = lBase + date + "&to="+cityCode;
	request({
		url : u2,
		json : true
	}, function(error, response, body) {

		if( !error && response.statusCode == 200 ){
			// Got cheapest flight available. Then what?
			// console.log(body);
			var message = "@"+ user +" You can get flights to "+ reverseCityCodeSearch(cities, body.to).name +" for as low as $" + parseInt(body.fare) +" on Jambojet";
			tweetThis(message);
			// console.log(message);
		}
	}) 
}

// cityId = getCityAutocomplete("Kisumu");
