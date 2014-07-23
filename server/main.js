var io = require('socket.io')(8475);
var utils = require('./utils.js');
var mysql = require("mysql");
var database = mysql.createConnection({
	host: "localhost",
	user: "drawtogheter",
	password: "ljfa24y92fh9239",
	database: "drawtogheter"
});

io.on('connection', function (socket) {
    socket.dName = utils.randomString(8);
    console.log("New connectedion: " + socket.dName);

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

	socket.on('leave', function () {
		io.to(socket.drawroom).emit("chat", socket.dName + " left.");
	});

    socket.on('join', function (room) {
		io.to(socket.drawroom).emit("chat", socket.dName + " left the room.");
        socket.leave(socket.drawroom);
        socket.drawroom = room;
        database.query('SELECT * FROM drawings WHERE now > NOW() - INTERVAL 1 HOUR AND room = ?', [socket.drawroom], function (err, rows, fields) {
            var drawings = [];
            for (var d = 0; d < rows.length; d++) {
                if (typeof rows[d].x2 === 'number') {
                    drawings[d] = [rows[d].dtype, [rows[d].x1, rows[d].y1], [rows[d].x2, rows[d].y2], rows[d].size, rows[d].color];
                } else {
                    drawings[d] = [rows[d].dtype, rows[d].x1, rows[d].y1, rows[d].size, rows[d].color];
                }
            }
            socket.emit('drawings', drawings);
            socket.join(socket.drawroom);
            io.to(socket.drawroom).emit("chat", socket.dName + " joined this room.");
        });
    });

    socket.on('drawing', function (drawing, callback) {
        if (typeof drawing !== 'object') {
            console.log("Someone send a non object as drawing", drawing);
            return;
        }

        if (drawing[0] < 0 || drawing[0] > 1) {
            console.log("Someone send an unknown drawing type", drawing);
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
        }

        normalizedDrawing.size = drawing[3];
        normalizedDrawing.color = drawing[4];
        normalizedDrawing.room = socket.drawroom;
        normalizedDrawing.now = new Date();

        database.query('INSERT INTO drawings SET ?', normalizedDrawing, function (err) {
            if (err) {
                console.log(err);
                callback();
                return;
            }
            io.to(socket.drawroom).emit('drawing', drawing);
            callback();
        });
    });
});
