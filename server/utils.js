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
	io.to(socket.drawroom).emit("chat", socket.dName + " joined " + socket.drawroom + ". There are now " + Object.keys(io.nsps['/'].adapter.rooms[socket.drawroom] || {}).length + ' users in this room.');
	console.log(socket.dName + " joined " + socket.drawroom + ". There are now " + Object.keys(io.nsps['/'].adapter.rooms[socket.drawroom] || {}).length + ' users in this room.');
	socket.emit('room', socket.drawroom);
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

module.exports = utils;
