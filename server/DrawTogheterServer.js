function DrawTogheterServer (database, io, cache) {
	this.database = database;
	this.io = io;
	this.cache = cache;
	this.callbacksOnRoomDone = {};
	this.bindSocketEvents();
}

DrawTogheterServer.prototype.suggestions = ['a giraffe', 'a bear', 'a farm', 'a clown', 'space', 'mario being a real plumber', 'advertisment for a silly product', 'something strange saving the world', 'something secret', 'a zoo', 'mountains', 'someone programming', 'fear', 'darkness', 'happiness', 'product placement', 'what the other looks like', 'living numbers', 'something blocky', 'someone being sassy', 'yourself', 'a superhero', 'unexpected violence', 'unexpected happiness', 'unexpected kindness'];

DrawTogheterServer.prototype.sqDistance = function sqDistance (p1, p2) {
	return (p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1]);
};

DrawTogheterServer.prototype.randomString = function randomString (length) {
	var chars = "abcdefghijklmnopqrstuvwxyz",
		string = "";
	for (var k = 0; k < length; k++) {
		string += chars.charAt(Math.floor(chars.length * Math.random()));
	}
	return string;
};

DrawTogheterServer.prototype.bindSocketEvents = function bindSocketEvents () {
	this.io.on('connection', function (socket) {
	    socket.dName = "guest_" + this.randomString(6);
	    console.log("New connectedion: " + socket.dName);
		socket.emit('name', socket.dName);

		socket.on('privatechat', this.newPrivateChat.bind(this, socket));
	    socket.on('chat', this.chatMessage.bind(this, socket));
	    socket.on('join', this.joinProtocol.bind(this, socket));
	    socket.on('drawing', this.drawingProtocol.bind(this, socket));

	    socket.on('changename', function (name) {
	        this.io.to(socket.drawroom).emit("chat", socket.dName + " changed hes name to " + name);
			console.log('Chat: ' + socket.dName + " changed hes name to " + name);
	        socket.dName = name;
	    }.bind(this));

		socket.on('disconnect', function () {
			this.io.to(socket.drawroom).emit("chat", socket.dName + " left.");
			console.log(socket.dName + " left.");
		}.bind(this));
	}.bind(this));
};

DrawTogheterServer.prototype.drawingProtocol = function drawingProtocol (socket, drawing, callback) {
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
		console.log("Someone drew a negative size or too big");
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
		if (this.sqDistance(drawing[1], drawing[2]) > 4000000) {
			console.log("Someone drew a too long line");
			socket.emit("That line was a bit long don't you think?");
			callback();
			return;
		}
    }

    normalizedDrawing.size = drawing[3];
    normalizedDrawing.color = drawing[4];
    normalizedDrawing.room = socket.drawroom;
    normalizedDrawing.now = new Date();

	this.io.to(socket.drawroom).emit('drawing', drawing);
	callback();

    this.database.query('INSERT INTO drawings SET ?', normalizedDrawing, function (err) {
        if (err) {
            console.log(err);
            return;
        }

		this.cache.pushTo(socket.drawroom, drawing);
    }.bind(this));
};

DrawTogheterServer.prototype.joinProtocol = function joinProtocol (socket, reqRoom) {
	var room = this.getFirstOpenRoom(reqRoom);
	if (room != reqRoom) socket.emit(reqRoom + " was full. You have been moved to " + room + ".");

	this.prepareRoom(room, function () {
		this.socketJoinRoom(socket, room);
	}.bind(this));
};

DrawTogheterServer.prototype.chatMessage = function chatMessage (socket, msg) {
	if (msg == "") return;

	var msgObj = {
		name: socket.dName,
		msg: msg
	};

    this.io.to(socket.drawroom).emit("chat", msgObj);
    console.log('Chat: ' + socket.dName + ': ' + msg);

	msgObj.now = new Date();
    this.database.query('INSERT INTO msg SET ?', msgObj, function (err) {
		if (err) console.log(err);
	});
};

DrawTogheterServer.prototype.newPrivateChat = function newPrivateChat (socket) {
	if (Object.keys(this.io.nsps['/'].adapter.rooms[this.waitingPrivateChatRoom] || {}).length !== 1) {
		this.waitingPrivateChatRoom = "private_" + this.randomString(5);
		var alone = true;
	}

	this.prepareRoom(this.waitingPrivateChatRoom, function (room) {
		this.socketJoinRoom(socket, room);
		if (alone) {
			socket.emit("chat", "We are looking for a random stranger. In the meantime you are free to draw.");
		}
	}.bind(this, this.waitingPrivateChatRoom));
};

DrawTogheterServer.prototype.socketLeaveRoom = function socketLeaveRoom (socket) {
	if (socket.drawroom) {
		this.io.to(socket.drawroom).emit("chat", socket.dName + " left " + socket.drawroom + ".");
		console.log(socket.dName + " left " + socket.drawroom + ".");
	}

	socket.leave(socket.drawroom);
};

DrawTogheterServer.prototype.getSuggestion = function getSuggestion () {
	return this.suggestions[Math.floor(this.suggestions.length * Math.random())];
};

DrawTogheterServer.prototype.socketJoinRoom = function socketJoinRoom (socket, room) {
	this.socketLeaveRoom(socket);
	socket.drawroom = room;

	socket.emit('drawings', this.cache.get(room));
	socket.join(socket.drawroom);
	socket.emit('room', socket.drawroom);

	this.io.to(socket.drawroom).emit("chat", socket.dName + " joined " + socket.drawroom + ". There are now " + Object.keys(this.io.nsps['/'].adapter.rooms[socket.drawroom] || {}).length + ' users in this room.');
	this.io.to(socket.drawroom).emit("chat", "How about drawing " + this.getSuggestion() + "?");
	console.log(socket.dName + " joined " + socket.drawroom + ". There are now " + Object.keys(this.io.nsps['/'].adapter.rooms[socket.drawroom] || {}).length + ' users in this room.');
	socket.emit('chat', 'You are ready to draw.');
};

DrawTogheterServer.prototype.convertRowsToDrawings = function convertRowsToDrawings (rows) {
	var drawings = [];
	for (var d = 0; d < rows.length; d++) {
		if (typeof rows[d].x2 === 'number') {
			drawings[d] = [rows[d].dtype, [rows[d].x1, rows[d].y1], [rows[d].x2, rows[d].y2], rows[d].size, rows[d].color];
		} else {
			drawings[d] = [rows[d].dtype, rows[d].x1, rows[d].y1, rows[d].size, rows[d].color];
		}
	}
	return drawings;
};

DrawTogheterServer.prototype.getFirstOpenRoom = function getFirstOpenRoom (baseRoom) {
	var number = 1;
	if (Object.keys(this.io.nsps['/'].adapter.rooms[baseRoom] || {}).length > 9) {
		while (Object.keys(this.io.nsps['/'].adapter.rooms[baseRoom + number] || {}).length > 9) {
			number++;
		}
		baseRoom += number;
	}
	return baseRoom;
}

DrawTogheterServer.prototype.prepareRoom = function prepareRoom (room, callback) {
	if (this.cache.exists(room)) {
		callback();
		return;
	}

	this.callbacksOnRoomDone[room] = this.callbacksOnRoomDone[room] || [];
	this.callbacksOnRoomDone[room].push(callback);

	console.log('Room ' + room + ' is being loaded for the first time since restart.');

	this.database.query('SELECT * FROM (SELECT * FROM drawings WHERE room = ? ORDER BY now DESC LIMIT ' + this.cache.max + ') AS T ORDER BY now ASC', [room], function (err, rows, fields) {
		if (err) {
			console.log('Drawings select error on join', err);
			return;
		}

		this.cache.pushMultiTo(room, DrawTogheterServer.prototype.convertRowsToDrawings(rows));
		console.log('Room ' + room + ' loaded');

		for (var k = 0; k < this.callbacksOnRoomDone[room].length; k++) {
			this.callbacksOnRoomDone[room][k]();
		}

		delete this.callbacksOnRoomDone[room];
	}.bind(this));
};

module.exports = DrawTogheterServer;