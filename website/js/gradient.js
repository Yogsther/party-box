var ct = new ColorThief();

function getCssValuePrefix() {
	var rtrnVal = "";
	var prefixes = ["-o-", "-ms-", "-moz-", "-webkit-"];
	var dom = document.createElement("div");
	for (var i = 0; i < prefixes.length; i++) {
		dom.style.background =
			prefixes[i] + "linear-gradient(#000000, #ffffff)";

		if (dom.style.background) {
			rtrnVal = prefixes[i];
		}
	}
	dom = null;
	delete dom;
	return rtrnVal;
}

var backgroundColors = ["#0b2746", "#2c5d92"];

setInterval(() => {
	document.body.style.background =
		getCssValuePrefix() +
		`linear-gradient(${(Date.now() / 50) % 360}deg, ${
			backgroundColors[0]
		}, ${backgroundColors[1]})`;
}, 30);
