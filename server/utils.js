var utils = {};

utils.randomString = function randomString (length) {
	var chars = "abcdefghijklmnopqrstuvwxyz0123456789",
		string = "";
	for (var k = 0; k < length; k++) {
		string += chars.charAt(Math.floor(chars.length * Math.random()));
	}
	return string;
};

utils.socketJoinRoom = function socketJoinRoom (io, socket, room, drawings) {
	socket.emit('drawings', drawings);
	socket.drawroom = room;
	socket.join(socket.drawroom);
	socket.emit('room', socket.drawroom);
	io.to(socket.drawroom).emit("chat", socket.dName + " joined " + socket.drawroom + ". There are now " + Object.keys(io.nsps['/'].adapter.rooms[socket.drawroom] || {}).length + ' users in this room.');
	console.log(socket.dName + " joined " + socket.drawroom + ". There are now " + Object.keys(io.nsps['/'].adapter.rooms[socket.drawroom] || {}).length + ' users in this room.');
	socket.emit('ink', 0);
	socket.emit('chat', 'You are ready to draw.');
};

utils.convertRowsToDrawings = function convertRowsToDrawings (rows) {
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

utils.getFirstOpenRoom = function getFirstOpenRoom (io, baseRoom) {
	var number = 1;
	if (Object.keys(io.nsps['/'].adapter.rooms[baseRoom] || {}).length > 9) {
		while (Object.keys(io.nsps['/'].adapter.rooms[baseRoom + number] || {}).length > 9) {
			number++;
		}
		socket.emit('chat', baseRoom + ' was full, you have been moved to ' + baseRoom + number);
		console.log(baseRoom + ' was full, ' + socket.dName + ' has been moved to ' + baseRoom + number);
		baseRoom += number;
	}
	return baseRoom;
}

utils.putSocketInRoom = function putSocketInRoom (io, database, cache, callbacksOnRoomDone, socket, room, ignoreUserCount, callback) {
	if (!ignoreUserCount) {
		room = this.getFirstOpenRoom(io, room);
	}

	socket.leave(socket.drawroom);

	if (socket.drawroom) {
		io.to(socket.drawroom).emit("chat", socket.dName + " left " + socket.drawroom + ".");
		console.log(socket.dName + " left " + socket.drawroom + ".");
	}

	if (!cache.exists(room)) {
		if (callbacksOnRoomDone[room]) {
			socket.emit('chat', 'The room is being loaded. Please wait a few seconds.');
			callbacksOnRoomDone[room].push(function (room) {
				utils.socketJoinRoom(io, socket, room, cache.get(room));
				callback(socket, room);
			});
			return;
		}

		socket.emit('chat', 'The room is being loaded. Please wait a few seconds.');
		console.log('Room ' + room + ' is being loaded.');

		callbacksOnRoomDone[room] = [function (room) {
			utils.socketJoinRoom(io, socket, room, cache.get(room));
			callback(socket, room);
		}];

		database.query('SELECT * FROM (SELECT * FROM drawings WHERE room = ? ORDER BY now DESC LIMIT 15000) AS T ORDER BY now ASC', [room], function (err, rows, fields) {
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
		callback(socket, room);
	}
};

module.exports = utils;
