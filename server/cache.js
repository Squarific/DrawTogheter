function Cache (max) {
    this.max = max;
    this.cache = {};
}

Cache.prototype.get = function get (category) {
    return this.cache[category] || [];
};

Cache.prototype.pushTo = function pushTo (category, value) {
    this.cache[category] = this.cache[category] || [];
    if (this.cache[category].length > this.max) {
        this.cache[category].shift();
    }
    this.cache[category].push(value);
};

var module;
if (module && module.exports) {
	module.exports = Cache;
}
