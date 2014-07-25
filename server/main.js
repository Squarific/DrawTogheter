var io = require('socket.io')(8475);
var utils = require('./utils.js');
var mysql = require("mysql");
var database = mysql.createConnection({
	host: "localhost",
	user: "drawtogheter",
	password: 'secret',
	database: "drawtogheter"
});
var users = 0;
var Cache = require('./cache.js');
var cache = new Cache(8000);

io.on('connection', function (socket) {
    socket.dName = utils.randomString(8);
    console.log("New connectedion: " + socket.dName);
	socket.emit('name', socket.dName);
	socket.emit('chat', 'Welcome to drawtogheter');
	socket.emit('chat', 'This is an opensource project, the source code can be found here: https://github.com/Squarific/DrawTogheter');
	socket.emit('chat', 'If you like this project, please share it with your friends.');
	socket.emit('chat', 'If you want to see new features, consider donating: 148a4MsNDoRh7cpCidxUNwM63eQr1UNtkb.');

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
		io.to(socket.drawroom).emit("chat", socket.dName + " left " + socket.drawroom + ".");
		console.log(socket.dName + " left " + socket.drawroom + ".");
        socket.leave(socket.drawroom);
        socket.drawroom = room;

		socket.emit('drawings', cache.get(socket.drawroom));
		socket.join(socket.drawroom);
		io.to(socket.drawroom).emit("chat", socket.dName + " joined " + socket.drawroom + ". There are now " + Object.keys(io.nsps['/'].adapter.rooms[socket.drawroom] || {}).length + ' users in this room.');
		console.log(socket.dName + " joined " + socket.drawroom + ". There are now " + Object.keys(io.nsps['/'].adapter.rooms[socket.drawroom] || {}).length + ' users in this room.');
		socket.emit('room', socket.drawroom);
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
			cache.pushTo(socket.drawroom, drawing);
        });
    });
});
