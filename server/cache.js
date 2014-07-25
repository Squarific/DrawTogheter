function Cache (max) {
    this.max = max;
    this.cache = {};
}

Cache.prototype.get = function get (category) {
    return this.cache[category] || [];
};

Cache.prototype.exists = function exists (category) {
    return typeof this.cache[category] === 'object';
};

Cache.prototype.pushTo = function pushTo (category, value) {
    this.cache[category] = this.cache[category] || [];
    if (this.cache[category].length > this.max) {
        this.cache[category].shift();
    }
    this.cache[category].push(value);
};

Cache.prototype.pushMultiTo = function pushTo (category, values) {
    this.cache[category] = this.cache[category] || [];
    this.cache[category].concat(values);
    if (this.cache[category].length > this.max) {
        this.cache[category].splice(0, Math.min(0, this.max - values.length));
    }
};

var module;
if (module && module.exports) {
	module.exports = Cache;
}
