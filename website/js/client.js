var inRoom = false;
var controllsOpen = false;
var mouseLocked = false;

var room = {
	progress: 150,
	length: 300
};

var point;
var clientPosition = 0;

/* alert(document.body.offsetHeight); */

function joinRoom() {
	localStorage.setItem("room", room.code);
	inRoom = true;
	document.body.innerHTML = `
<div id="player">
    
    <span onclick="togglePlayer()" style="cursor:pointer;">
        <span id="content-title"></span>
        <span id="time"></span>
    </span>

    <div id="track">
        <div id="progress"></div>
        <div id="point"></div>
    </div>

    <div id="controlls">
       
        <svg xmlns="http://www.w3.org/2000/svg" id="play-button" onclick="pause()" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/><path d="M0 0h24v24H0z" fill="none"/></svg>
      
        <svg xmlns="http://www.w3.org/2000/svg" id="skip-button" onclick="skip()" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/><path d="M0 0h24v24H0z" fill="none"/></svg>
    </div>

    <div id="bottom-controlls">
    <div id="skip-box">
        <span id="skip-info">?/?</span>
        <span id="skip-text">SKIPS</span>
    </div>
    <button id="leave-button" onclick="leave()">LEAVE</button>
    </div>

</div>

<div id="media-queue">
    <div id="tab-menu">
        <div class="tab-button" onclick="tab(tabs.queue)">
            <svg xmlns="http://www.w3.org/2000/svg" class="tab-icon" id="queue-svg" viewBox="0 0 24 24" ><path d="M4 10h12v2H4zm0-4h12v2H4zm0 8h8v2H4zm10 0v6l5-3z"/></svg>
        </div>
        <div class="tab-button" onclick="tab(tabs.youtube)"  id="youtube-svg">
            <svg class="tab-icon" height=50 width=50  xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" version="1.1" id="Layer_1" x="0px" y="0px" viewBox="0 0 71.412065 50" xml:space="preserve" inkscape:version="0.91 r13725" sodipodi:docname="YouTube_full-color_icon (2017).svg" ><metadata id="metadata33"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage" /><dc:title></dc:title></cc:Work></rdf:RDF></metadata><defs id="defs31" /><sodipodi:namedview pagecolor="#ffffff" bordercolor="#666666" borderopacity="1" objecttolerance="10" gridtolerance="10" guidetolerance="10" inkscape:pageopacity="0" inkscape:pageshadow="2" inkscape:window-width="1366" inkscape:window-height="715" id="namedview29" showgrid="false" fit-margin-top="0" fit-margin-left="0" fit-margin-right="0" fit-margin-bottom="0" inkscape:zoom="1.3588925" inkscape:cx="-71.668263" inkscape:cy="39.237696" inkscape:window-x="-8" inkscape:window-y="-8" inkscape:window-maximized="1" inkscape:current-layer="Layer_1" /><style type="text/css" id="style3"> .st0{fill:#FF0000;} .st1{fill:#FFFFFF;} .st2{fill:#282828;} </style><g id="g5" transform="scale(0.58823529,0.58823529)"><path class="st0" d="M 118.9,13.3 C 117.5,8.1 113.4,4 108.2,2.6 98.7,0 60.7,0 60.7,0 60.7,0 22.7,0 13.2,2.5 8.1,3.9 3.9,8.1 2.5,13.3 0,22.8 0,42.5 0,42.5 0,42.5 0,62.3 2.5,71.7 3.9,76.9 8,81 13.2,82.4 22.8,85 60.7,85 60.7,85 c 0,0 38,0 47.5,-2.5 5.2,-1.4 9.3,-5.5 10.7,-10.7 2.5,-9.5 2.5,-29.2 2.5,-29.2 0,0 0.1,-19.8 -2.5,-29.3 z" id="path7" inkscape:connector-curvature="0" style="fill:var(dark)" /><polygon class="st1" points="80.2,42.5 48.6,24.3 48.6,60.7 " id="polygon9" style="fill:#e4e4e4" /></g></svg class="tab-icon">
        </div>
        <div class="tab-button" onclick="tab(tabs.spotify)" id="spotify-svg" >
            <svg xmlns="http://www.w3.org/2000/svg" class="tab-icon" height=40 width=40  version="1.1" viewBox="0 0 168 168"> <path fill="var(--dark)" d="m83.996 0.277c-46.249 0-83.743 37.493-83.743 83.742 0 46.251 37.494 83.741 83.743 83.741 46.254 0 83.744-37.49 83.744-83.741 0-46.246-37.49-83.738-83.745-83.738l0.001-0.004zm38.404 120.78c-1.5 2.46-4.72 3.24-7.18 1.73-19.662-12.01-44.414-14.73-73.564-8.07-2.809 0.64-5.609-1.12-6.249-3.93-0.643-2.81 1.11-5.61 3.926-6.25 31.9-7.291 59.263-4.15 81.337 9.34 2.46 1.51 3.24 4.72 1.73 7.18zm10.25-22.805c-1.89 3.075-5.91 4.045-8.98 2.155-22.51-13.839-56.823-17.846-83.448-9.764-3.453 1.043-7.1-0.903-8.148-4.35-1.04-3.453 0.907-7.093 4.354-8.143 30.413-9.228 68.222-4.758 94.072 11.127 3.07 1.89 4.04 5.91 2.15 8.976v-0.001zm0.88-23.744c-26.99-16.031-71.52-17.505-97.289-9.684-4.138 1.255-8.514-1.081-9.768-5.219-1.254-4.14 1.08-8.513 5.221-9.771 29.581-8.98 78.756-7.245 109.83 11.202 3.73 2.209 4.95 7.016 2.74 10.733-2.2 3.722-7.02 4.949-10.73 2.739z"/> </svg>
        </div>
    </div>
    <div id="media-content">
    
    </div>
</div>`;

	point = document.getElementById("point");

	document.body.addEventListener("touchstart", e => {
		mousedown(e);
	});

	document.body.addEventListener("touchend", e => {
		mouseup(e);
	});

	document.body.addEventListener("touchmove", e => {
		mousemove(e);
	});

	document.body.addEventListener("mousedown", e => {
		mousedown(e);
	});

	document.body.addEventListener("mouseup", e => {
		mouseup(e);
	});

	document.body.addEventListener("mousemove", e => {
		mousemove(e);
	});

	function mousedown(e) {
		if (e.target.id == "point") {
			mouseLocked = true;
		}
	}

	function mouseup(e) {
		if (mouseLocked) {
			mouseLocked = false;
			socket.emit("seek", room.progress);
		}
	}

	function mousemove(e) {
		if (mouseLocked) {
			if (e.touches) {
				updatePlayer(e.touches[0].clientX);
			} else {
				updatePlayer(e.clientX);
			}
		}
	}

	setInterval(() => {
		if (
			room.progress < room.length &&
			!room.paused &&
			!mouseLocked &&
			room.queue.length > 0
		)
			room.progress++;
		else if (room.queue.length == 0) room.progress = 0;
		updatePlayer();
	}, 1000);

	tabs.youtube = document.createElement("div");
	tabs.youtube.id = "yt-tab";
	tabs.youtube.innerHTML = `
    <input class="search" placeholder="Search YouTube..." id="youtube-search">
    <svg xmlns="http://www.w3.org/2000/svg" onclick="searchYoutube()" class="search-button" fill="var(--dark)" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/><path d="M0 0h24v24H0z" fill="none"/></svg>

    <div class="results" id="yt-results">
        
    </div>

    `;
	tabs.spotify = document.createElement("div");
	tabs.spotify.id = "spotify-tab";
	tabs.spotify.innerHTML = `
    <input class="search" placeholder="Search Spotify..." id="spotify-search">
    <svg xmlns="http://www.w3.org/2000/svg" onclick="searchSpotify()" class="search-button" fill="var(--dark)" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/><path d="M0 0h24v24H0z" fill="none"/></svg>

    <div class="results" id="spotify-results">
        
    </div>
    `;
	tabs.queue = document.createElement("div");
	tabs.queue.innerHTML =
		"<span class='center-text' style='top: 10px;'>Queue empty</span>";
	tabs.queue.id = "queue-list";

	resizeClient();
	tab(tabs.queue);
}

var tabs = {};
var currentTab = "";

document.addEventListener("keypress", e => {
	if (e.key == "Enter") {
		if (currentTab == "spotify-tab") searchSpotify();
		if (currentTab == "yt-tab") searchYoutube();
	}
});

function tab(content) {
	currentTab = content.id;
	// spotify #1db954 // yt #f00
	document.getElementById("spotify-svg").innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="tab-icon" height=40 width=40  version="1.1" viewBox="0 0 168 168"> <path fill="${
		currentTab == "spotify-tab" ? "#1db954" : "var(--dark)"
	}" d="m83.996 0.277c-46.249 0-83.743 37.493-83.743 83.742 0 46.251 37.494 83.741 83.743 83.741 46.254 0 83.744-37.49 83.744-83.741 0-46.246-37.49-83.738-83.745-83.738l0.001-0.004zm38.404 120.78c-1.5 2.46-4.72 3.24-7.18 1.73-19.662-12.01-44.414-14.73-73.564-8.07-2.809 0.64-5.609-1.12-6.249-3.93-0.643-2.81 1.11-5.61 3.926-6.25 31.9-7.291 59.263-4.15 81.337 9.34 2.46 1.51 3.24 4.72 1.73 7.18zm10.25-22.805c-1.89 3.075-5.91 4.045-8.98 2.155-22.51-13.839-56.823-17.846-83.448-9.764-3.453 1.043-7.1-0.903-8.148-4.35-1.04-3.453 0.907-7.093 4.354-8.143 30.413-9.228 68.222-4.758 94.072 11.127 3.07 1.89 4.04 5.91 2.15 8.976v-0.001zm0.88-23.744c-26.99-16.031-71.52-17.505-97.289-9.684-4.138 1.255-8.514-1.081-9.768-5.219-1.254-4.14 1.08-8.513 5.221-9.771 29.581-8.98 78.756-7.245 109.83 11.202 3.73 2.209 4.95 7.016 2.74 10.733-2.2 3.722-7.02 4.949-10.73 2.739z"/> </svg>
    `;

	document.getElementById("queue-svg").style.fill =
		currentTab == "queue-list" ? "var(--blu)" : "var(--dark)";

	document.getElementById(
		"youtube-svg"
	).innerHTML = `<svg class="tab-icon" height=50 width=50  xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" version="1.1" id="Layer_1" x="0px" y="0px" viewBox="0 0 71.412065 50" xml:space="preserve" inkscape:version="0.91 r13725" sodipodi:docname="YouTube_full-color_icon (2017).svg" ><metadata id="metadata33"><rdf:RDF><cc:Work rdf:about=""><dc:format>image/svg+xml</dc:format><dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage" /><dc:title></dc:title></cc:Work></rdf:RDF></metadata><defs id="defs31" /><sodipodi:namedview pagecolor="#ffffff" bordercolor="#666666" borderopacity="1" objecttolerance="10" gridtolerance="10" guidetolerance="10" inkscape:pageopacity="0" inkscape:pageshadow="2" inkscape:window-width="1366" inkscape:window-height="715" id="namedview29" showgrid="false" fit-margin-top="0" fit-margin-left="0" fit-margin-right="0" fit-margin-bottom="0" inkscape:zoom="1.3588925" inkscape:cx="-71.668263" inkscape:cy="39.237696" inkscape:window-x="-8" inkscape:window-y="-8" inkscape:window-maximized="1" inkscape:current-layer="Layer_1" /><style type="text/css" id="style3"> .st0{fill:#FF0000;} .st1{fill:#FFFFFF;} .st2{fill:#282828;} </style><g id="g5" transform="scale(0.58823529,0.58823529)"><path class="st0" d="M 118.9,13.3 C 117.5,8.1 113.4,4 108.2,2.6 98.7,0 60.7,0 60.7,0 60.7,0 22.7,0 13.2,2.5 8.1,3.9 3.9,8.1 2.5,13.3 0,22.8 0,42.5 0,42.5 0,42.5 0,62.3 2.5,71.7 3.9,76.9 8,81 13.2,82.4 22.8,85 60.7,85 60.7,85 c 0,0 38,0 47.5,-2.5 5.2,-1.4 9.3,-5.5 10.7,-10.7 2.5,-9.5 2.5,-29.2 2.5,-29.2 0,0 0.1,-19.8 -2.5,-29.3 z" id="path7" inkscape:connector-curvature="0" style="fill:${
		currentTab == "yt-tab" ? "#ff0000" : "var(--dark)"
	}" /><polygon class="st1" points="80.2,42.5 48.6,24.3 48.6,60.7 " id="polygon9" style="fill:#e4e4e4" /></g></svg class="tab-icon">`;
	document.getElementById("media-content").innerHTML = "";
	document.getElementById("media-content").appendChild(content);
}

socket.on("kick", () => {
	leave();
});

function onUpdate() {
	if (tabs.queue && room.queue.length == 0) {
		tabs.queue.innerHTML =
			"<span class='center-text' style='top: 10px;'>Queue empty</span>";
	} else if (tabs.queue) {
		var html = "";
		for (let item of room.queue) {
			html += createQueueEntry(
				item.title,
				item.image,
				item.id,
				item.votes.indexOf(uuid) != -1
			);
		}
		tabs.queue.innerHTML = html;
	}

	updateQueueButtons();
}

function bump(id) {
	socket.emit("bump", id);
}

function createQueueEntry(title, thumbnail, id, bumped) {
	return `
<div class="entry">
    <img class="thumbnail" src="${thumbnail}">
    <span class="video-title">${title}</span>
    <svg xmlns="http://www.w3.org/2000/svg" title="Bump item" onclick="bump('${id}')" style="fill:var(${
		bumped ? "--blu" : "--dark"
	});" class="add-button" viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/><path d="M0 0h24v24H0z" fill="none"/></svg>
</div>`;
}

function togglePlayer() {
	controllsOpen = !controllsOpen;
	document.getElementById("media-queue").style.transition =
		"all 0.2s ease-out";
	setTimeout(() => {
		document.getElementById("media-queue").style.transition = "none";
	}, 200);
	resizeClient();
}

function leave() {
	localStorage.removeItem("room");
	location.reload();
}

function pause() {
	socket.emit("pause");
	room.paused = !room.paused;
	updatePlayer();
}

function skip() {
	socket.emit("skip");
}

function updatePlayer(xPos) {
	document.getElementById("content-title").innerText =
		room.queue.length > 0
			? room.title.substr(0, 25) + (room.title.length > 25 ? "..." : "")
			: "Queue empty";

	document.getElementById("progress").style.width =
		(room.progress / room.length) * 100 + "%";

	if (room.queue.length == 0) {
		document.getElementById("point").style.background = "#272727";
		document.getElementById("progress").style.width = "0px";
		document.getElementById("point").style.left = "0px";
	} else {
		document.getElementById("point").style.background = "var(--blu)";
		document.getElementById("point").style.display =
			room.queue[0].uuid == uuid ? "block" : "none";
	}

	if (mouseLocked && xPos && room.queue.length > 0) {
		var offset =
			(document.body.offsetWidth -
				document.getElementById("track").offsetWidth) /
			2;

		var percentage =
			(xPos - offset) / document.getElementById("track").offsetWidth;
		if (percentage > 1) percentage = 1;
		if (percentage < 0) percentage = 0;

		room.progress = Math.round(room.length * percentage);
	}

	var trackWidth = document.getElementById("track").offsetWidth;
	point.style.left = trackWidth * (room.progress / room.length) - 10 + "px";

	document.getElementById("time").innerText =
		room.queue.length > 0
			? `${formatTime(room.progress)} / ${formatTime(room.length)}`
			: "Add from YouTube or Spotify";

	document.getElementById(
		"skip-info"
	).innerText = `${room.skips.length}/${room.skips_needed}`;

	document.getElementById("play-button").innerHTML = !room.paused
		? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/><path d="M0 0h24v24H0z" fill="none"/>'
		: '<path d="M8 5v14l11-7z"/><path d="M0 0h24v24H0z" fill="none"/>';
	('<svg xmlns="http://www.w3.org/2000/svg"  id="play-button" viewBox="0 0 24 24"></svg>');

	document.getElementById("skip-button").style.fill =
		room.skips.indexOf(uuid) != -1 ? "grey" : "white";
}

function searchYoutube() {
	socket.emit("search", document.getElementById("youtube-search").value);
	document.getElementById("yt-results").innerHTML =
		"<span class='center-text'>Searching...</span>";
}

socket.on("videos", results => {
	var html = "";

	for (var video of results) {
		html += createEntry(video.title, video.image, video.id, "queueVideo");
	}

	if (results.length == 0)
		document.getElementById("yt-results").innerHTML =
			"<span class='center-text'>No videos found.</span>";
	else document.getElementById("yt-results").innerHTML = html;
	updateQueueButtons();
});

function createEntry(title, thumbnail, id, fun) {
	return `
<div class="entry">
    <img class="thumbnail" src="${thumbnail}">
    <span class="video-title">${title}</span>
    <svg xmlns="http://www.w3.org/2000/svg" onclick="${fun}('${id}')" item-id="${id}" class="add-button" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/><path d="M0 0h24v24H0z" fill="none"/></svg>
</div>`;
}

function updateQueueButtons() {
	for (var el of document.getElementsByClassName("add-button")) {
		let id = el.getAttribute("item-id");
		if (!id) return;
		el.style.fill = inQueue(id) ? "var(--blu)" : "var(--dark)";
	}
}

function inQueue(id) {
	for (var item of room.queue) {
		if (item.id == id) return true;
	}
	return false;
}

function queueVideo(id) {
	socket.emit("queue_video", id);
}

socket.on("msg", msg => {});

function formatTime(seconds) {
	var minutes = formatLength(seconds / 60);
	var seconds = formatLength(seconds - minutes * 60);

	function formatLength(num) {
		num = Math.floor(num);
		while (num.toString().length < 2) num = "0" + num;
		return num;
	}
	return `${minutes}:${seconds}`;
}

function showControlls() {
	controllsOpen = true;
}

function hideControlls() {
	controllsOpen = false;
}

function resizeClient() {
	if (controllsOpen) {
		document.getElementById("media-queue").style.height =
			"calc(100vh - 280px)";
	} else {
		document.getElementById("media-queue").style.height =
			"calc(100vh - 85px)";
	}

	updatePlayer();
}
