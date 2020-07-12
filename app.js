/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */
//standard tool for wiritng to file, using for test
fs = require('fs');
var userData;

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var wixEndPoint = "https://jlight2016.wixsite.com/mysite/_functions-dev/rating";
var client_id = "c20c4d8ad9f14196b616cdd00c4279c0";//"c0886afc0445464a8f609baf87d5bc62";//'CLIENT_ID'; // Your client id
var client_secret = "d4915903bc6e42b5bff2e048268fe6da";//"6ca63ef840fc4b898f8b40819c82d236";//'CLIENT_SECRET'; // Your secret
var redirect_uri = "http://localhost:8888/callback";
//"http://localhost:8888/callback"; //'REDIRECT_URI'; // Your redirect uri
//wrapper for accessing data
// var SpotifyWebApi = require('spotify-web-api-node');
// var spotifyApi = new SpotifyWebApi();
/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-top-read';
  //passes clientID, scope, redirect, -- get users authorization
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };
    ////
    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=10',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };
        
        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          // console.log(body);
          // const userData = JSON.parse(JSON.stringify(body));
          fs.writeFileSync('data/recentTracks.json',JSON.stringify(body));
        });

        var options = {
          url: 'https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=10',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };
        
        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          // console.log(body);
          // const userData = JSON.parse(JSON.stringify(body));
          fs.writeFileSync('data/allTracks.json',JSON.stringify(body));
        });

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          // console.log(body);
          fs.writeFileSync('data/profile.json',JSON.stringify(body))
        });


        // userData = JSON.parse(fs.readFileSync('data/recentTracks.json'));
        //request.post(url, userData);
        // console.log(userData);

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });




  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.get('/portal', function(req,res){ 
  userData = JSON.parse(fs.readFileSync('data/profile.json'));
  // console.log(userData);
  request.post(wixEndPoint, userData);
  res.redirect("https://jmk212.wixsite.com/hackathon1");
});

// spotifyApi.getFollowedArtists({ limit : 1 })
//   .then(function(data) {
//     // 'This user is following 1051 artists!'
//     console.log('This user is following ', data.body.artists.total, ' artists!');
//   }, function(err) {
//     console.log('Something went wrong!', err);
//   });

console.log('Listening on 8888');
app.listen(8888);
