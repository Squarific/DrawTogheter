var io = require('socket.io')(8475);
var utils = require('./utils.js');
var mysql = require("mysql");
var database = mysql.createConnection({
	host: "localhost",
	user: "drawtogheter",
	password: 'secret',
	database: "drawtogheter"
});
var Cache = require('./cache.js');
var cache = new Cache(15000);

function sqDistance (p1, p2) {
	return (p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1]);
}

var callbacksOnRoomDone = {};
var waitingPrivateChatRoom;
var suggestions = ['a giraffe', 'a bear', 'a farm', 'a clown', 'space', 'mario being a real plumber', 'advertisment for a silly product', 'something strange saving the world', 'something secret', 'a zoo', 'mountains', 'someone programming', 'fear', 'darkness', 'happiness', 'product placement', 'what the other looks like', 'living numbers', 'something blocky', 'someone being sassy', 'yourself', 'a superhero', 'unexpected violence', 'unexpected happiness', 'unexpected kindness'];

io.on('connection', function (socket) {
    socket.dName = "guest_" + utils.randomString(6);
    console.log("New connectedion: " + socket.dName);
	socket.emit('name', socket.dName);

	socket.on('privatechat', function () {
		if (Object.keys(io.nsps['/'].adapter.rooms[waitingPrivateChatRoom] || {}).length !== 1) {
			waitingPrivateChatRoom = "private_" + utils.randomString(5);
			var alone = true;
		}

		utils.putSocketInRoom(io, database, cache, callbacksOnRoomDone, socket, waitingPrivateChatRoom, false, function (socket, room) {
			if (alone) {
				socket.emit('chat', "We are looking for a random stranger to join you. In the meantime you can draw already.");
			} else {
				var suggestion = suggestions[Math.floor(suggestions.length * Math.random())];
				io.to(room).emit('chat', "Why don't you draw " + suggestion + "?")

		        database.query('INSERT INTO msg SET ?', {
					name: "suggestions",
					msg: "Why don't you draw " + suggestion + "?",
					now: new Date()
				}, function (err) {
					if (err) console.log(err);
				});
			}
		});
	});

    socket.on('chat', function (msg) {
		if (msg == "") return;

		var msgObj = {
			name: socket.dName,
			msg: msg
		};

        io.to(socket.drawroom).emit("chat", msgObj);
        console.log('Chat: ' + socket.dName + ': ' + msg);
		msgObj.now = new Date();

        database.query('INSERT INTO msg SET ?', msgObj, function (err) {
			if (err) console.log(err);
		});
    });

    socket.on('changename', function (name) {
        io.to(socket.drawroom).emit("chat", socket.dName + " changed hes name to " + name);
		console.log('Chat: ' + socket.dName + " changed hes name to " + name);
        socket.dName = name;
    });

	socket.on('disconnect', function () {
		io.to(socket.drawroom).emit("chat", socket.dName + " left.");
		//console.log(socket.dName + " left.");
	});

    socket.on('join', function (room) {
		utils.putSocketInRoom(io, database, cache, callbacksOnRoomDone, socket, room, false, function (socket, room) {
			var suggestion = suggestions[Math.floor(suggestions.length * Math.random())];
			io.to(room).emit('chat', "Why don't you draw " + suggestion + "?")

	        database.query('INSERT INTO msg SET ?', {
				name: "suggestions",
				msg: "Why don't you draw " + suggestion + "?",
				now: new Date()
			}, function (err) {
				if (err) console.log(err);
			});
		});
    });

    socket.on('drawing', function (drawing, callback) {
        if (typeof drawing !== 'object') {
            console.log("Someone send a non object as drawing");
			callback();
            return;
        }

        if (drawing[0] < 0 || drawing[0] > 1) {
            console.log("Someone send an unknown drawing type");
			callback();
            return;
        }

		if (drawing[3] < 0 || drawing[3] > 50) {
			//console.log("Someone drew a negative size or too big");
			callback();
			return;
		}

        var normalizedDrawing = {
            dtype: drawing[0]
        };

        if (typeof drawing[1] === 'object') {
            normalizedDrawing.x1 = drawing[1][0];
            normalizedDrawing.y1 = drawing[1][1];
        } else {
            normalizedDrawing.x1 = drawing[1];
            normalizedDrawing.y1 = drawing[2];
        }

        if (typeof drawing[2] === 'object') {
            normalizedDrawing.x2 = drawing[2][0];
            normalizedDrawing.y2 = drawing[2][1];
			if (sqDistance(drawing[1], drawing[2]) > 4000000) {
				callback();
				return;
			}
        }

        normalizedDrawing.size = drawing[3];
        normalizedDrawing.color = drawing[4];
        normalizedDrawing.room = socket.drawroom;
        normalizedDrawing.now = new Date();

		io.to(socket.drawroom).emit('drawing', drawing);
		callback();

        database.query('INSERT INTO drawings SET ?', normalizedDrawing, function (err) {
            if (err) {
                console.log(err);
                return;
            }

			cache.pushTo(socket.drawroom, drawing);
        });
    });
});
