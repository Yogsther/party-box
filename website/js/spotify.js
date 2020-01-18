var access_token = localStorage.getItem("access-token");
var refresh_token = localStorage.getItem("refresh-token");

if (access_token && refresh_token) {
	document.getElementById("spotify-login").innerHTML =
		"Retrieving spotify status";
	fetch("https://api.spotify.com/v1/me?access_token=" + access_token)
		.then(res => {
			return res.json();
		})
		.then(json => {
			document.getElementById("spotify-login").style.color = "#1db954";
			if (json.display_name) {
				document.getElementById("spotify-login").innerHTML =
					"Spotify enabled by " +
					json.display_name +
					"!<br><a href='javascript:logout()'>Logout</a>";
			} else {
				document.getElementById("spotify-login").innerHTML =
					"Spotify enabled.<br><a href='javascript:logout()'>Logout</a>";
				refreshToken();
			}
		});
}

function refreshToken() {
	socket.emit("refresh_token", refresh_token);
}

function logout() {
	localStorage.removeItem("access-token");
	localStorage.removeItem("refresh-token");
	location.reload();
}

function searchSpotify() {
	socket.emit(
		"search_spotify",
		document.getElementById("spotify-search").value
	);
	document.getElementById("spotify-results").innerHTML =
		"<span class='center-text'>Searching...</span>";
}

socket.on("new_token", token => {
	access_token = token;
	localStorage.setItem("access-token", access_token);
});

function queueSong(id) {
	socket.emit("queue_song", id);
}

socket.on("songs", songs => {
	var html = "";
	if (!songs) {
		document.getElementById("spotify-results").innerHTML =
			"<span class='center-text'>Host has not enabled spotify.</span>";
	} else {
		for (var song of songs) {
			html += createEntry(song.title, song.image, song.id, "queueSong");
		}

		if (songs.length == 0)
			document.getElementById("spotify-results").innerHTML =
				"<span class='center-text'>No songs found.</span>";
		else document.getElementById("spotify-results").innerHTML = html;
	}
	updateQueueButtons();
});

function playAudio(id) {
	hideRoomStatus();
	hideYoutube();
	showSpotify();
}

function displayAlbum() {
	setPaletteFromImage(document.getElementById("album"));
}

function showSpotify() {
	document.getElementById("spotify-viewer").style.display = "block";
	hideYoutube();
	hideRoomStatus();
	startLoop();
}

function hideSpotify() {
	stopLoop();
	document.getElementById("spotify-viewer").style.display = "none";
}

socket.on("spotify_disabled", () => {
	alert("Invalid spotify login credits, you will be logged out.");
	logout();
});

window.onSpotifyWebPlaybackSDKReady = () => {
	if (access_token) {
		window.spotifyPlayer = new Spotify.Player({
			name: "PartyBox",
			getOAuthToken: cb => {
				cb(access_token);
			}
		});

		// Error handling
		spotifyPlayer.addListener("initialization_error", ({ message }) => {
			refreshToken();
			alert("Init error, please contact olle");
		});
		spotifyPlayer.addListener("authentication_error", ({ message }) => {
			refreshToken();
			alert("Auth error, please logout from spotify and try again.");
		});
		spotifyPlayer.addListener("account_error", ({ message }) => {
			alert("Account error, you need preimum");
		});
		spotifyPlayer.addListener("playback_error", ({ message }) => {});

		// Playback status updates
		spotifyPlayer.addListener("player_state_changed", state => {
			socket.emit("spotify-status-changed");
			/* socket.emit("status", {
				length: Math.round(state.duration / 1000),
				progress: Math.round(state.position / 1000)
			});
			 */

			//console.log(state);
		});

		// Ready
		spotifyPlayer.addListener("ready", ({ device_id }) => {
			console.log("Spotify ready!");
			socket.emit("transfer", { id: device_id, access_token });
		});

		spotifyPlayer.connect();
	}
};
