var socket = io.connect();
var uuid = localStorage.getItem("uuid");
if (!uuid || uuid.length == 0) {
	uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
		var r = (Math.random() * 16) | 0,
			v = c == "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
	localStorage.setItem("uuid", uuid);
}

var isHost = false;
var currentlyPlaying = false;

window.onload = () => {
	initializeHost();
	if (!inRoom) document.getElementById("room-code-input").focus();
	if (localStorage.getItem("room")) {
		socket.emit("join", {
			code: localStorage.getItem("room"),
			uuid
		});
	}
};

function code(el) {
	el.value = el.value.toUpperCase();
	if (el.value.length == 5) {
		// Send code
		socket.emit("join", {
			code: el.value,
			uuid
		});
	}
}

function host() {
	socket.emit("host", {
		access_token,
		refresh_token
	});
}

socket.on("room_created", code => {
	document.getElementById("wrap").style.display = "none";
	document.getElementById(
		"room-status"
	).innerHTML = `<span id="title">Room <span style='color:var(--blu);'>${code}</span>
                    <span id="room-status-description">0 members</span>`;
	isHost = true;
});

// Only for seeking videos
socket.on("seek", progress => {
	if (room.queue[0].type == "video") youtubePlayer.seekTo(progress);
});

document.getElementById("album").onload = () => {
	var pallete = ct.getPalette(document.getElementById("album"));
	for (var i = 0; i < 2; i++) {
		var colorSet = pallete[i];
		backgroundColors[
			i
		] = `rgb(${colorSet[0]}, ${colorSet[1]}, ${colorSet[2]})`;
	}
};

socket.on("update", r => {
	console.log("Updated packets ", Object.keys(r));
	for (var packet in r) {
		room[packet] = r[packet];
	}

	if (isHost) {
		document.getElementById("room-status-description").innerText =
			room.members.length + " members";

		if (room.access_token) {
			access_token = room.access_token;
			localStorage.setItem("access-token", access_token);
		}
		if (room.queue.length > 0) {
			if (room.queue[0].type == "video") {
				hideRoomStatus();
				showYoutube();
				playVideo(room.queue[0].id);
				if (room.paused && youtubePlayer.pauseVideo)
					youtubePlayer.pauseVideo();
				else youtubePlayer.playVideo();
			} else {
				if (youtubePlayer.pauseVideo) youtubePlayer.pauseVideo();
				playAudio(room.queue[0].id);

				document.getElementById("album").src =
					room.queue[0].image + "?" + new Date().getTime();

				document
					.getElementById("album")
					.setAttribute("crossOrigin", "");
			}
		} else {
			showRoomStatus();
			if (youtubePlayer.pauseVideo) youtubePlayer.pauseVideo();
		}
	} else {
		onUpdate();
	}
});

socket.on("debug", () => {
	socket.emit("debug_join", uuid);
});

socket.on("joined", r => {
	room = r;
	joinRoom();
});

function showYoutube() {
	hideRoomStatus();
	hideSpotify();
	document.getElementById("youtube-player").style.display = "block";
}

function hideYoutube() {
	document.getElementById("youtube-player").style.display = "none";
}
function showRoomStatus() {
	hideYoutube();
	hideSpotify();
	document.getElementById("room-status").style.display = "block";
}

function hideRoomStatus() {
	document.getElementById("room-status").style.display = "none";
}

var youtubePlayer;
var videoElement;
var videoPlaying = false;

function onPlayerStateChange(event) {
	/* if (event.data == YT.PlayerState.BUFFERING) videoPlaying = false; */
	/*     if (event.data == YT.PlayerState.PLAYING) videoPlaying = true;
    if (event.data == YT.PlayerState.PAUSED) videoPlaying = false; */
	if (event.data == YT.PlayerState.ENDED) {
		showRoomStatus();
		socket.emit("ended");
	}
	updateRoom();
}

function updateRoom() {
	socket.emit("status", {
		length: youtubePlayer.getDuration(),
		progress: youtubePlayer.getCurrentTime()
	});
}

function initializeHost() {
	if (!inRoom) {
		youtubePlayer = new YT.Player("youtube-player", {
			width: document.body.offsetWidth,
			height: document.body.offsetHeight,
			videoId: "",
			playerVars: {
				autoplay: true,
				rel: 0,
				showinfo: 0
			},
			events: {
				onReady: onYoutubeReady,
				onStateChange: onPlayerStateChange
			}
		});

		document.getElementById("youtube-player").style.display = "none";
	}
}

function onYoutubeReady() {
	console.log("YouTube Ready.");
}

window.onresize = () => {
	if (youtubePlayer) {
		youtubePlayer.setSize(
			document.body.offsetWidth,
			document.body.offsetHeight
		);
	}

	if (inRoom) {
		resizeClient();
	}
};

function playVideo(id) {
	if (currentlyPlaying == id) return;
	currentlyPlaying = id;
	hideRoomStatus();
	showYoutube();
	videoPlaying = true;
	room.paused = false;
	youtubePlayer.loadVideoById(id);
	updateRoom();
}
