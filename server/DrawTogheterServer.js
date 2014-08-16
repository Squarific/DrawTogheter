function DrawTogheterServer (database, io, cache) {
	this.database = database;
	this.io = io;
	this.cache = cache;
	this.callbacksOnRoomDone = {};
	this.gamerooms = {};
	this.bindSocketEvents();
}

DrawTogheterServer.prototype.maxPeople = 10;

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
	    socket.on('newgame', this.newgameProtocol.bind(this, socket));

	    socket.on('changename', function (name) {
	    	this.socketRoom(socket).emit("chat", socket.dName + " changed hes name to " + name);
			console.log('Chat: ' + socket.dName + " changed hes name to " + name);
	        socket.dName = name;
	    }.bind(this));

		socket.on('disconnect', function () {
			this.socketRoom(socket).emit("chat", socket.dName + " left.");
			console.log(socket.dName + " left.");
		}.bind(this));
	}.bind(this));
};

DrawTogheterServer.prototype.roomUserCount = function roomuserCount (room) {
	return Object.keys(this.io.nsps['/'].adapter.rooms[room] || {}).length;
};

DrawTogheterServer.prototype.newgameProtocol = function newgameProtocol (socket, reqroom) {
	if (!reqroom) {
		for (var k in this.gamerooms) {
			if (this.roomUserCount("drawroom-" + k) === 0) {
				delete this.gamerooms[k];
			}
			if (this.roomUserCount("drawroom-" + k) < this.maxPeople) {
				reqroom = k;
				break;
			}
		}

		if (!reqroom) {
			socket.emit("chat", "No existing gameroom could be found. Creating a new room.");
			reqroom = "gameroom_" + this.randonString(7);
		}
	}

	var room = this.getFirstOpenRoom("gameroom-", reqroom);
	if (room !== reqroom) socket.emit(reqroom + " was full. You have been moved to " + room + ".");

	this.prepareRoom("gameroom-" + room, function () {
		this.socketJoinGameRoom(socket, room);
	}.bind(this));
};

DrawTogheterServer.prototype.socketStringRoom = function socketStringRoom (socket) {
	if (socket.drawroom) {
		return "drawroom-" + socket.drawroom;
	}
	if (socket.gameroom) {
		return "gameroom-" + socket.gameroom;
	}
	return false;
};

DrawTogheterServer.prototype.socketRoom = function socketRoom (socket) {
	return this.io.to(this.socketStringRoom(socket))
};

DrawTogheterServer.prototype.drawingProtocol = function drawingProtocol (socket, drawing, callback) {
	if (typeof callback !== "function") {
		return;
	}

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

	this.socketRoom(socket).emit('drawing', drawing);
	callback();

    this.database.query('INSERT INTO drawings SET ?', normalizedDrawing, function (err) {
        if (err) {
            console.log(err);
            return;
        }

		this.cache.pushTo(this.socketStringRoom(socket), drawing);
    }.bind(this));
};

DrawTogheterServer.prototype.joinProtocol = function joinProtocol (socket, reqRoom) {
	var room = this.getFirstOpenRoom("drawroom-", reqRoom);
	if (room !== reqRoom) socket.emit(reqRoom + " was full. You have been moved to " + room + ".");

	this.prepareRoom("drawroom-" + room, function () {
		this.socketJoinDrawRoom(socket, room);
	}.bind(this));
};

DrawTogheterServer.prototype.chatMessage = function chatMessage (socket, msg) {
	if (msg == "") return;

	var msgObj = {
		name: socket.dName,
		msg: msg
	};

    this.io.to("drawroom-" + socket.drawroom).emit("chat", msgObj);
    console.log('Chat: ' + socket.dName + ': ' + msg);

	msgObj.now = new Date();
    this.database.query('INSERT INTO msg SET ?', msgObj, function (err) {
		if (err) console.log(err);
	});
};

DrawTogheterServer.prototype.newPrivateChat = function newPrivateChat (socket) {
	if (Object.keys(this.io.nsps['/'].adapter.rooms["drawroom-" + this.waitingPrivateChatRoom] || {}).length !== 1) {
		this.waitingPrivateChatRoom = "private_" + this.randomString(5);
		var alone = true;
	}

	this.prepareRoom("drawroom-" + this.waitingPrivateChatRoom, function (room) {
		this.socketJoinDrawRoom(socket, room);
		if (alone) {
			socket.emit("chat", "We are looking for a random stranger. In the meantime you are free to draw.");
		}
	}.bind(this, this.waitingPrivateChatRoom));
};

DrawTogheterServer.prototype.socketLeaveRoom = function socketLeaveRoom (socket) {
	if (socket.drawroom) {
		this.io.to("drawroom-" + socket.drawroom).emit("chat", socket.dName + " left " + socket.drawroom + ".");
		console.log(socket.dName + " left " + socket.drawroom + ".");
		socket.leave("drawroom-" + socket.drawroom);
		delete socket.drawroom;
	}

	if (socket.gameroom) {
		this.io.to("gameroom-" + socket.drawroom).emit("chat", socket.dName + " left " + socket.drawroom + ".");
		console.log(socket.dName + " left " + socket.drawroom + ".");
		socket.leave("gameroom-" + socket.gameroom);
		delete socket.gameroom;
	}
};

DrawTogheterServer.prototype.getSuggestion = function getSuggestion () {
	return this.suggestions[Math.floor(this.suggestions.length * Math.random())];
};

DrawTogheterServer.prototype.socketJoinDrawRoom = function socketJoinDrawRoom (socket, room) {
	this.socketLeaveRoom(socket);
	socket.drawroom = room;

	socket.emit('drawings', this.cache.get("drawroom-" + room));
	socket.join("drawroom-" + socket.drawroom);
	socket.emit('room', socket.drawroom);

	this.io.to("drawroom-" + socket.drawroom).emit("chat", socket.dName + " joined " + socket.drawroom + ". There are now " + Object.keys(this.io.nsps['/'].adapter.rooms["drawroom-" + socket.drawroom] || {}).length + ' users in this room.');
	this.io.to("drawroom-" + socket.drawroom).emit("chat", "How about drawing " + this.getSuggestion() + "?");
	console.log(socket.dName + " joined " + socket.drawroom + ". There are now " + Object.keys(this.io.nsps['/'].adapter.rooms["drawroom-" + socket.drawroom] || {}).length + ' users in this room.');
	socket.emit('chat', 'You are ready to draw.');
};

DrawTogheterServer.prototype.socketJoinGameRoom = function socketJoinGameRoom (socket, room) {
	this.socketLeaveRoom(socket);
	socket.gameroom = room;

	socket.emit('drawings', this.cache.get("gameroom-" + room));
	socket.join("gameroom-" + room);
	socket.emit('gameroom', room);

	if (this.roomUserCount("gameroom-" + room) < 3) {
		socket.emit("chat", "The game will start once there are 3 people in this room.");
	} else {
		this.startGameRoom(room);
	}

	console.log(socket.dName + " joined gameroom " + room + ". There are now " + this.roomUserCount("gameroom-" + room) + " users");
	this.io.to("gameroom-" + room).emit("chat", socket.dName + " joined gameroom " + room + ". There are now " + this.roomUserCount("gameroom-" + room) + " users");

	if (!this.gamerooms[room]) {
		this.gamerooms[room] = {};
	}
};

DrawTogheterServer.prototype.startGameRoom = function startGameRoom (room) {
	if (!this.gamerooms[room] || this.gamerooms[room].started) return;
	this.gamerooms[room].started = true;

	this.gamerooms[room].pickingWords = "";
	console.log(this.io.nsps['/'].adapter.rooms["gameroom-" + room]);
	console.log(this.io.to("gameroom-" + room))
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

DrawTogheterServer.prototype.getFirstOpenRoom = function getFirstOpenRoom (type, baseRoom) {
	var number = 1;
	if (Object.keys(this.io.nsps['/'].adapter.rooms[type + baseRoom] || {}).length >= this.maxPeople) {
		while (Object.keys(this.io.nsps['/'].adapter.rooms[type + baseRoom + number] || {}).length >= this.maxPeople) {
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