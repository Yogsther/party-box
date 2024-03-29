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
    for (var i = 0; i < 5; i++) {
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

function enableSpinning() {
    //https://i.scdn.co/image/8b49a035b93b16d52113dffba0a895a45f70a8ae
    document.getElementById("album").classList.add("rotate");
    document.getElementById("canvas").style.display = "none";
    document.body.style.background = "white";
}

function disableSpinning() {
    document.getElementById("album").classList.remove("rotate");
    document.getElementById("canvas").style.display = "block";
    document.body.style.background = "black";
}

function stepParticles() {
    var speed = 0.2;
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
        if (!color) return;
        var size = 1500;
        var gradient = ctx.createRadialGradient(x, y, size / 50, x, y, size);
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
    socket.emit("set_color", palette[0]);
    updatePalette();
}

function setPalleteColors() {
    palette = [];
    for (var color of arguments) palette.push(color);
    updatePalette();
}
