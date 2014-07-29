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
var cache = new Cache(20000);

function sqDistance (p1, p2) {
	return (p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1]);
};

var callbacksOnRoomDone = {};

io.on('connection', function (socket) {
    socket.dName = utils.randomString(8);
    console.log("New connectedion: " + socket.dName);
	socket.emit('name', socket.dName);
	socket.emit('safechat', 'Drew something cool? Share it: <a href="http://www.reddit.com/r/Drawtogheter">http://www.reddit.com/r/Drawtogheter</a>');

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
		var number = 1;
		if (Object.keys(io.nsps['/'].adapter.rooms[room] || {}).length > 9) {
			while (Object.keys(io.nsps['/'].adapter.rooms[room + number] || {}).length > 9) {
				number++;
			}
			socket.emit('chat', room + ' was full, you have been moved to ' + room + number);
			console.log(room + ' was full, ' + socket.dName + ' has been moved to ' + room + number);
			room += number;
		}

		socket.leave(socket.drawroom);

		if (socket.drawRoom) {
			io.to(socket.drawroom).emit("chat", socket.dName + " left " + socket.drawroom + ".");
			console.log(socket.dName + " left " + socket.drawroom + ".");
		}

		if (!cache.exists(room)) {
			if (callbacksOnRoomDone[room]) {
				socket.emit('chat', 'The room is being loaded. Please wait a few seconds.');
				callbacksOnRoomDone[room].push(function (room) {
					utils.socketJoinRoom(io, socket, room, cache.get(room));
				});
				return;
			}

			socket.emit('chat', 'The room is being loaded. Please wait a few seconds.');
			console.log('Room ' + room + ' is being loaded.');

			callbacksOnRoomDone[room] = [function (room) {
				utils.socketJoinRoom(io, socket, room, cache.get(room));
			}];

			database.query('SELECT * FROM (SELECT * FROM drawings WHERE room = ? ORDER BY now DESC LIMIT 20000) AS T ORDER BY now ASC', [room], function (err, rows, fields) {
				if (err) {
					console.log('Drawings select error on join', err);
					return;
				}

				cache.pushMultiTo(room, utils.convertRowsToDrawings(rows));
				console.log('Room ' + room + ' loaded');

				for (var k = 0; k < callbacksOnRoomDone[room].length; k++) {
					callbacksOnRoomDone[room][k](room);
				}

				delete callbacksOnRoomDone[room];
			});
		} else {
			utils.socketJoinRoom(io, socket, room, cache.get(room));
		}
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
