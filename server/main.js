var io = require('socket.io')(8475);

var mysql = require("mysql");
var database = mysql.createConnection({
	host: "localhost",
	user: "drawtogheter",
	password: 'secret',
	database: "drawtogheter"
});

var Cache = require('./cache.js');

var DrawTogheterServer = require("./DrawTogheterServer.js");
var drawTogheterServer = new DrawTogheterServer(database, io, new Cache(1500));