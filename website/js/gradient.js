var ct = new ColorThief();
var palette = ["#0b2746", "#2c5d92"];
var gradientParticles = [];
var loopRunning = false;

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

function resizeCanvas() {
	canvas.width = document.body.offsetWidth;
	canvas.height = document.body.offsetHeight;
	fillGradientParticles();
}

function startLoop() {
	loopRunning = true;
}

function stopLoop() {
	loopRunning = false;
}

function gradientLoop() {
	if (loopRunning) {
		stepParticles();
		renderCanvas();
	}
	requestAnimationFrame(gradientLoop);
}

function fillGradientParticles() {
	gradientParticles = [];
	for (var i = 0; i < 20; i++) {
		gradientParticles.push({
			x: Math.random() * canvas.width,
			y: Math.random() * canvas.height,
			direction: Math.random() * 360,
			color: undefined
		});
	}
	updatePalette();
}

function updatePalette() {
	for (let i = 0; i < gradientParticles.length; i++) {
		gradientParticles[i].color = palette[i % palette.length];
	}
}

function stepParticles() {
	var speed = 0.15;
	for (let particle of gradientParticles) {
		if (outOfBound(particle)) particle.direction += 270;
		particle.x += Math.cos(particle.direction / (180 / Math.PI)) * speed;
		particle.y += Math.sin(particle.direction / (180 / Math.PI)) * speed;
	}

	function outOfBound(particle) {
		if (
			particle.x > canvas.width ||
			particle.x < 0 ||
			particle.y > canvas.height ||
			particle.y < 0
		)
			return true;
		return false;
	}
}

function renderCanvas() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	for (var particle of gradientParticles) {
		drawGradient(particle.x, particle.y, particle.color);
	}

	function drawGradient(x, y, color) {
		var size = 1000;
		var gradient = ctx.createRadialGradient(x, y, size / 100, x, y, size);
		gradient.addColorStop(0, color);
		gradient.addColorStop(1, "rgba(0,0,0,0)");
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}
}

function setPaletteFromImage(image) {
	palette = [];
	var colors = ct.getPalette(image);
	for (var i = 0; i < colors.length; i++) {
		var colorSet = colors[i];
		palette.push(`rgb(${colorSet[0]}, ${colorSet[1]}, ${colorSet[2]})`);
	}
	updatePalette();
}

function setPalleteColors() {
	palette = [];
	for (var color of arguments) palette.push(color);
	updatePalette();
}
