function DrawTogheter (container, server) {
	this.container = container;
	this.container.style.position = "relative";
	this.chatcontainer = this.container.appendChild(document.createElement('div'));
	this.canvascontainer = this.container.appendChild(document.createElement('div'));

	this.messages = this.chatcontainer.appendChild(document.createElement('div'));
	this.messageinputcontainer = this.chatcontainer.appendChild(document.createElement('div'));
	this.messageinput = this.messageinputcontainer.appendChild(document.createElement('input'));
	this.messageinputbutton = this.messageinputcontainer.appendChild(document.createElement('div'));
	this.messageinputbutton.innerText = 'Send';
	this.messageinputbutton.addEventListener('click', this.sendMessage.bind(this));
	this.messageinput.addEventListener('keypress', function (event) {
		if (event.keyCode === 13) this.sendMessage();
	}.bind(this));

	this.chatcontainer.className = 'chatcontainer';
	this.canvascontainer.className = 'canvascontainer';
	this.messages.className = 'messages';
	this.messageinputcontainer.className = 'messageinputcontainer';
	this.messageinput.className = 'messageinput';
	this.messageinputbutton.className = 'messageinputbutton toolbutton';

	this.background = this.canvascontainer.appendChild(document.createElement("canvas"));
	this.canvas = this.canvascontainer.appendChild(document.createElement("canvas"));
	this.effects = this.canvascontainer.appendChild(document.createElement("canvas"));

	this.setCanvasPosition(this.canvas);
	this.setCanvasPosition(this.effects);

	this.tiledCanvas = new TiledCanvas(this.canvas, {
		chunkSize: 256
	});
	this.bTiledCanvas = new TiledCanvas(this.background, {
		chunkSize: 256
	});

	this.eCtx = this.effects.getContext('2d');

	this.localDrawings = [];
	this.offsetX = 0;
	this.offsetY = 0;
	this.ink = 0;

	window.addEventListener("resize", this.resizeHandler.bind(this));

	this.effects.addEventListener("click", this.callTool.bind(this));
	this.effects.addEventListener("mousedown", this.callTool.bind(this));
	this.effects.addEventListener("mouseup", this.callTool.bind(this));
	this.effects.addEventListener("mousemove", this.callTool.bind(this));
	this.effects.addEventListener("mouseleave", this.callTool.bind(this));
	this.effects.addEventListener("touchstqrt", this.callTool.bind(this));
	this.effects.addEventListener("touchend", this.callTool.bind(this));
	this.effects.addEventListener("touchmove", this.callTool.bind(this));

	this.setTool("brush");
	this.setToolSize("5");
	this.setToolColor("#F0BC11");

	this.resizeHandler();

	this.connect(server);
}

DrawTogheter.prototype.setCanvasPosition = function setCanvasPosition (canvas) {
	canvas.style.position = "absolute";
	canvas.style.left = "0";
	canvas.style.top = "0";
};

DrawTogheter.prototype.connect = function connect (server) {
	this.socket = io(server);
	this.socket.on("drawing", this.drawing.bind(this));
	this.socket.on("drawings", this.alldrawings.bind(this));
	this.socket.on("chat", this.chat.bind(this));
	this.socket.on("safechat", this.safechat.bind(this));
	this.socket.on("ink", function (ink) {
		this.ink = ink;
	}.bind(this));
	this.socket.on("name", function (name) {
		document.getElementById('nameinput').value = name;
	});
	this.socket.on('disconnect', function () {
		this.chat('You have been disconnected, attemting to reconnect');
	}.bind(this));
	this.socket.on('reconnect', function () {
		this.chat('You have been reconnected, joining main room');
		this.socket.emit("join", this.room || 'main');
	}.bind(this));
	this.socket.on('room', function (room) {
		location.hash = room;
		this.room = room;
		this.chat('You can share this room: ' + location.href);
	}.bind(this));
	this.socket.emit("join", location.hash.substring(1) || "main");
};

DrawTogheter.prototype.safechat = function safechat (msg) {
	if (this.messages.scrollTop >= this.messages.scrollHeight - this.messages.offsetHeight - 10) var scroll = true;

	var msgContainer = this.messages.appendChild(document.createElement('div'));
	msgContainer.className = "messagecontainer";
	if (typeof msg === "string") {
		var message = msgContainer.appendChild(document.createElement('div'));
		message.className = "message";
		message.innerHTML = msg;
	} else {
		var name = msgContainer.appendChild(document.createElement('div'));
		name.className = "name";
		name.appendChild(document.createTextNode(msg.name + ':'))
		var message = msgContainer.appendChild(document.createElement('div'));
		message.className = "message";
		message.innerHTML = msg.msg;
	}

	if (scroll) this.messages.scrollTop = this.messages.scrollHeight;
};

DrawTogheter.prototype.chat = function chat (msg) {
	if (this.messages.scrollTop >= this.messages.scrollHeight - this.messages.offsetHeight - 10) var scroll = true;

	var msgContainer = this.messages.appendChild(document.createElement('div'));
	msgContainer.className = "messagecontainer";
	if (typeof msg === "string") {
		msgContainer.appendChild(document.createTextNode(msg));
	} else {
		var name = msgContainer.appendChild(document.createElement('div'));
		name.className = "name";
		name.appendChild(document.createTextNode(msg.name + ':'))
		var message = msgContainer.appendChild(document.createElement('div'));
		message.className = "message";
		message.appendChild(document.createTextNode(msg.msg))
	}

	if (scroll) this.messages.scrollTop = this.messages.scrollHeight;
};

DrawTogheter.prototype.changeRoom = function changeRoom (room) {
	this.chat("Changing rooms, the app may hang for about three minutes.");
	this.socket.emit("join", room);
};

DrawTogheter.prototype.changeName = function changeName (name) {
	this.socket.emit("changename", name);
};

DrawTogheter.prototype.sendMessage = function sendMessage () {
	if (this.messageinput.value == '') return;
	this.socket.emit("chat", this.messageinput.value);
	this.messageinput.value = '';
};

DrawTogheter.prototype.setTool = function setTool (tool) {
	if (typeof this.tools[this.tool] === "function") {
		this.tools[this.tool].call(this, "remove");
	}
	this.tool = tool;
};

DrawTogheter.prototype.setToolSize = function setToolSize (size) {
	if (size > 50) return;
	if (size < 0) return;
	this.toolSize = size;
};

DrawTogheter.prototype.setToolColor = function setToolColor (color) {
	this.toolColor = color;
};

DrawTogheter.prototype.addDrawing = function addDrawing (drawing) {
	this.localDrawings.push(drawing);
	this.socket.emit("drawing", drawing, function () {
		var index = this.localDrawings.indexOf(drawing);
		if (index !== -1) {
			this.localDrawings.splice(index, 1);
			this.drawDrawings(this.tiledCanvas, this.localDrawings);
		}
	}.bind(this));
	this.tiledCanvas.clearAll();
	this.drawDrawings(this.tiledCanvas, this.localDrawings);
};

DrawTogheter.prototype.addNewLine = function addNewLine (point1, point2, size, color) {
	var size = size || this.toolSize;
	var color = color || this.toolColor;
	//4000000 = 2000 * 2000
	if (this.sqDistance(point1, point2) > 4000000) return;
	var drawing = [0, point1, point2, size, color];
	this.addDrawing(drawing);
};

DrawTogheter.prototype.addNewDot = function addNewDot (x, y, size, color) {
	var size = size || this.toolSize;
	var color = color || this.toolColor;
	var drawing = [1, x, y, size, color];
	this.addDrawing(drawing);
};

DrawTogheter.prototype.drawDrawing = function drawDrawing (ctx, drawing) {
	switch (drawing[0]) {
		case 0:
			this.drawLine(ctx, drawing[1][0], drawing[1][1], drawing[2][0], drawing[2][1], drawing[3], drawing[4]);
		break;
		case 1:
			this.drawDot(ctx, drawing[1], drawing[2], drawing[3], drawing[4]);
		break;
	}
};

DrawTogheter.prototype.drawDrawings = function drawDrawings (tiledCanvas, drawings) {
	var drawingRegion;
	for (var d = 0; d < drawings.length; d++) {
		this.drawDrawing(tiledCanvas.context, drawings[d]);
		var tempRegion = this.sortDrawingRegion(this.getDrawingRegion(drawings[d]));
		drawingRegion = this.minimumDrawingRegion(drawingRegion || tempRegion, tempRegion);
	}
	if (drawingRegion) {
		tiledCanvas.drawingRegion(drawingRegion[0], drawingRegion[1], drawingRegion[2], drawingRegion[3], drawingRegion[4]);
		tiledCanvas.execute();
	}
};

DrawTogheter.prototype.minimumDrawingRegion = function minimumDrawingRegion (drawingRegion, tempRegion) {
	if (drawingRegion[0] > tempRegion[0]) {
		drawingRegion[0] = tempRegion[0];
	}
	if (drawingRegion[1] > tempRegion[1]) {
		drawingRegion[1] = tempRegion[1];
	}
	if (drawingRegion[2] < tempRegion[2]) {
		drawingRegion[2] = tempRegion[2];
	}
	if (drawingRegion[3] < tempRegion[3]) {
		drawingRegion[3] = tempRegion[3];
	}
	if (drawingRegion[4] < tempRegion[4]) {
		drawingRegion[4] = tempRegion[4];
	}
	return drawingRegion;
};

DrawTogheter.prototype.sortDrawingRegion = function sortDrawingRegion (drawingRegion) {
	if (drawingRegion[0] > drawingRegion[2]) {
		var temp = drawingRegion[0];
		drawingRegion[0] = drawingRegion[2];
		drawingRegion[2] = temp;
	}
	if (drawingRegion[1] > drawingRegion[3]) {
		var temp = drawingRegion[1];
		drawingRegion[1] = drawingRegion[3];
		drawingRegion[3] = temp;
	}
	return drawingRegion;
};

DrawTogheter.prototype.drawing = function drawing (drawing) {
	this.drawDrawing(this.bTiledCanvas.context, drawing);
	var drawingRegion = this.getDrawingRegion(drawing);
	this.bTiledCanvas.drawingRegion(drawingRegion[0], drawingRegion[1], drawingRegion[2], drawingRegion[3], parseInt(drawingRegion[4]));
	this.bTiledCanvas.execute();
};

DrawTogheter.prototype.getDrawingRegion = function getDrawingRegion (drawing) {
	switch (drawing[0]) {
		case 0:
			return [drawing[1][0], drawing[1][1], drawing[2][0], drawing[2][1], drawing[3]];
		break;
		case 1:
			return [drawing[1], drawing[2], drawing[1], drawing[2], drawing[3]];
		break;
	}
	return [0, 0, 0, 0, 0];
};

DrawTogheter.prototype.alldrawings = function drawings (drawings) {
	this.localDrawings = [];
	this.bTiledCanvas.clearAll();
	this.drawDrawings(this.bTiledCanvas, drawings);
	this.bTiledCanvas.execute();
};

DrawTogheter.prototype.drawLine = function (ctx, sx, sy, ex, ey, size, color) {
	if (size < 1) return;
	ctx.beginPath();
	ctx.moveTo(sx, sy);
	ctx.lineTo(ex, ey);
	ctx.lineWidth = size;
	ctx.strokeStyle = color;
	ctx.stroke();
};

DrawTogheter.prototype.drawDot = function (ctx, x, y, size, color) {
	if (size < 1) return;
	ctx.beginPath();
	ctx.arc(x, y, size, 0, 2*Math.PI);
	ctx.fillStyle = color;
	ctx.fill();
};

DrawTogheter.prototype.sqDistance = function (p1, p2) {
	return (p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1]);
};

DrawTogheter.prototype.tools = {};

DrawTogheter.prototype.tools.grab = function (event) {
	if (typeof event !== 'object') {
		if (event === 'remove') {
			delete this.lastPoint;
			delete this.moving;
			this.effects.style.cursor = '';
		}
		return;
	}

	var clientX = (typeof event.clientX === 'number') ? event.clientX : event.changedTouches[0].clientX,
		clientY = (typeof event.clientY === 'number') ? event.clientY : event.changedTouches[0].clientY,
		target = event.target || document.elementFromPoint(clientX, clientY),
		boundingBox = target.getBoundingClientRect(),
		relativeX = clientX - boundingBox.left,
		relativeY = clientY - boundingBox.top;

	if (event.type === 'mousedown' || event.type === 'touchstart') {
		this.moving = true;
		this.lastPoint = [relativeX, relativeY];
		this.effects.style.cursor = 'move';
	}
	if (event.type === 'mouseup' || event.type === 'touchend' || event.type === 'mouseleave') {
		delete this.moving;
		delete this.lastPoint;
		this.effects.style.cursor = '';
	}

	if (event.type === 'mousemove' || event.type === 'touchmove') {
		if (this.moving || event.type === 'touchmove') {
			this.lastPoint = this.lastPoint || [relativeX, relativeY];
			this.offsetX += this.lastPoint[0] - relativeX;
			this.offsetY += this.lastPoint[1] - relativeY;
			this.bTiledCanvas.goto(this.offsetX, this.offsetY);
			this.tiledCanvas.goto(this.offsetX, this.offsetY);
			this.lastPoint = [relativeX, relativeY];
			event.preventDefault();
		}
	}
};

DrawTogheter.prototype.tools.line = function (event) {
	if (typeof event !== 'object') {
		if (event === 'remove') {
			this.eCtx.clearRect(0, 0, this.effects.width, this.effects.height);
			delete this.linePoint;
		}
		return;
	}

	var clientX = (typeof event.clientX === 'number') ? event.clientX : event.changedTouches[0].clientX,
	    clientY = (typeof event.clientY === 'number') ? event.clientY : event.changedTouches[0].clientY,
		target = event.target || document.elementFromPoint(clientX, clientY),
		boundingBox = target.getBoundingClientRect(),
	    relativeX = clientX - boundingBox.left,
	    relativeY = clientY - boundingBox.top;

	if (event.type === 'click' || event.type === 'touchend') {
		if (this.linePoint) {
			this.addNewLine(this.linePoint, [relativeX + this.offsetX, relativeY + this.offsetY]);
			this.eCtx.clearRect(0, 0, this.effects.width, this.effects.height);
			delete this.linePoint;
		} else {
			this.linePoint = [relativeX + this.offsetX, relativeY + this.offsetY];
		}
	}

	if ((event.type === 'mousemove' || event.type === 'touchmove') && this.linePoint) {
		this.eCtx.clearRect(0, 0, this.effects.width, this.effects.height);
		this.drawLine(this.eCtx, this.linePoint[0] - this.offsetX, this.linePoint[1] - this.offsetY, relativeX, relativeY, this.toolSize, this.toolColor);
		event.preventDefault();
	}
};

DrawTogheter.prototype.tools.brush = function (event) {
	if (typeof event !== 'object') {
		if (event === 'remove') {
			this.eCtx.clearRect(0, 0, this.effects.width, this.effects.height);
			delete this.lastPoint;
			delete this.brushing;
		}
		return;
	}

	var clientX = (typeof event.clientX === 'number') ? event.clientX : event.changedTouches[0].clientX,
		clientY = (typeof event.clientY === 'number') ? event.clientY : event.changedTouches[0].clientY,
		target = event.target || document.elementFromPoint(clientX, clientY),
		boundingBox = target.getBoundingClientRect(),
		relativeX = clientX - boundingBox.left,
		relativeY = clientY - boundingBox.top;

	if (event.type === 'mousedown' || event.type === 'touchstart') {
		this.brushing = true;
		this.lastPoint = [relativeX + this.offsetX, relativeY + this.offsetY];
		this.addNewDot(relativeX + this.offsetX, relativeY + this.offsetY);
	}
	if (event.type === 'mouseup' || event.type === 'touchend' || event.type === 'mouseleave') {
		delete this.brushing;
		delete this.lastPoint;
	}

	if (event.type === 'mousemove' || event.type === 'touchmove') {
		if (this.brushing || event.type === 'touchmove') {
			this.lastPoint = this.lastPoint || [relativeX + this.offsetX, relativeY + this.offsetY];
			// If the distance is bigger than half the toolSize we draw a line
			if (this.sqDistance(this.lastPoint, [relativeX + this.offsetX, relativeY + this.offsetY]) > (this.toolSize * this.toolSize) / 4) {
				this.addNewLine(this.lastPoint, [relativeX + this.offsetX, relativeY + this.offsetY], this.toolSize * 2);
			}
			this.addNewDot(relativeX + this.offsetX, relativeY + this.offsetY);
			this.lastPoint = [relativeX + this.offsetX, relativeY + this.offsetY];
			event.preventDefault();
		}

		this.eCtx.clearRect(0, 0, this.effects.width, this.effects.height);
		this.drawDot(this.eCtx, relativeX, relativeY, this.toolSize, this.toolColor);
	}
};

DrawTogheter.prototype.callTool = function () {
	if (typeof this.tools[this.tool] === "function") {
		this.tools[this.tool].apply(this, arguments);
	}
};

DrawTogheter.prototype.resizeHandler = function () {
	this.background.width = this.canvascontainer.offsetWidth;
	this.background.height = this.canvascontainer.offsetHeight;
	this.canvas.width = this.canvascontainer.offsetWidth;
	this.canvas.height = this.canvascontainer.offsetHeight;
	this.effects.width = this.canvascontainer.offsetWidth;
	this.effects.height = this.canvascontainer.offsetHeight;
	this.tiledCanvas.redraw();
	this.bTiledCanvas.redraw();
};
