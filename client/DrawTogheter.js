function DrawTogheter (container, server) {
	this.container = container;
	this.container.style.position = "relative";

	this.background = container.appendChild(document.createElement("canvas"));
	this.canvas = container.appendChild(document.createElement("canvas"));
	this.effects = container.appendChild(document.createElement("canvas"));

	this.setCanvasPosition(this.canvas);
	this.setCanvasPosition(this.effects);

	this.ctx = this.canvas.getContext("2d");
	this.bCtx = this.background.getContext("2d");
	this.eCtx = this.effects.getContext("2d");

	this.drawings = [];
	this.localDrawings = [];

	window.addEventListener("resize", this.resizeHandler.bind(this));

	this.effects.addEventListener("click", this.callTool.bind(this));
	this.effects.addEventListener("mousedown", this.callTool.bind(this));
	this.effects.addEventListener("mouseup", this.callTool.bind(this));
	this.effects.addEventListener("mousemove", this.callTool.bind(this));
	this.effects.addEventListener("touchstqrt", this.callTool.bind(this));
	this.effects.addEventListener("touchend", this.callTool.bind(this));
	this.effects.addEventListener("touchmove", this.callTool.bind(this));

	this.setTool("brush");
	this.setToolSize("5");
	this.setToolColor("#F0BC11");

	this.resizeHandler();

	//this.connect(server);
}

DrawTogheter.prototype.setCanvasPosition = function setCanvasPosition (canvas) {
	canvas.style.position = "absolute";
	canvas.style.left = "0";
	canvas.style.top = "0";
};

DrawTogheter.prototype.connect = function connect (server) {
	this.socket = io(server);
	this.socket.on("drawing", this.drawing);
};

DrawTogheter.prototype.setTool = function setTool (tool) {
	if (typeof this.tools[this.tool] === "function") {
		this.tools[this.tool].call(this, "remove");
	}
	this.tool = tool;
};

DrawTogheter.prototype.setToolSize = function setToolSize (size) {
	this.toolSize = size;
};

DrawTogheter.prototype.setToolColor = function setToolColor (color) {
	this.toolColor = color;
};

DrawTogheter.prototype.drawLine = function (ctx, sx, sy, ex, ey, size, color) {
	ctx.beginPath();
	ctx.moveTo(sx, sy);
	ctx.lineTo(ex, ey);
	ctx.lineWidth = size;
	ctx.strokeStyle = color;
	ctx.stroke();
};

DrawTogheter.prototype.drawDot = function (ctx, x, y, size, color) {
	ctx.beginPath();
	ctx.arc(x, y, size, 0, 2*Math.PI);
	ctx.fillStyle = color;
	ctx.fill();
};

DrawTogheter.prototype.drawing = function (data) {

};

DrawTogheter.prototype.tools = {};

DrawTogheter.prototype.tools.grab = function (event) {
};

DrawTogheter.prototype.tools.line = function (event) {
	if (typeof event !== 'object') {
		if (event === 'remove') {
			this.eCtx.clearRect(0, 0, this.effects.width, this.effects.height);
			delete this.linePoint;
		}
		return;
	}

	var clientX = (event.clientX || event.changedTouches[0].clientX),
	    clientY = (event.clientY || event.changedTouches[0].clientY),
		target = event.target || document.elementFromPoint(clientX, clientY),
		boundingBox = target.getBoundingClientRect(),
	    relativeX = clientX - boundingBox.left,
	    relativeY = clientY - boundingBox.top;

	if (event.type === 'click' || event.type === 'touchend') {
		if (this.linePoint) {
			this.addNewLine(this.linePoint, [relativeX, relativeY]);
			delete this.linePoint;
		} else {
			this.linePoint = [relativeX, relativeY];
		}
	}
	if ((event.type === 'mousemove' || event.type === 'touchmove') && this.linePoint) {
		this.eCtx.clearRect(0, 0, this.effects.width, this.effects.height);
		this.drawLine(this.eCtx, this.linePoint[0], this.linePoint[1], relativeX, relativeY, this.toolSize, this.toolColor);
		event.preventDefault();
	}
};

DrawTogheter.prototype.tools.brush = function (event) {
};

DrawTogheter.prototype.callTool = function () {
	if (typeof this.tools[this.tool] === "function") {
		this.tools[this.tool].apply(this, arguments);
	}
};

DrawTogheter.prototype.resizeHandler = function () {
	this.background.width = this.container.offsetWidth;
	this.background.height = this.container.offsetHeight;
	this.canvas.width = this.container.offsetWidth;
	this.canvas.height = this.container.offsetHeight;
	this.effects.width = this.container.offsetWidth;
	this.effects.height = this.container.offsetHeight;
};
