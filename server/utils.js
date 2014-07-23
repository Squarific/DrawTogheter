var utils = {};

utils.randomString = function randomString (length) {
	var chars = "abcdefghijklmnopqrstuvwxyz0123456789",
		string = "";
	for (var k = 0; k < length; k++) {
		string += chars.charAt(Math.floor(chars.length * Math.random()));
	}
	return string;
};

module.exports = utils;
