const DEBUG = false;

const Color = require("color");
const http = require("http");
const https = require("https");
const bp = require("body-parser");
const express = require("express");
const request = require("request");
const fs = require("file-system");
const md5 = require("md5");
const beautify = require("json-beautify");

Array.prototype.equals = function(array) {
    if (!array) return false;

    if (this.length != array.length) return false;

    for (var i = 0, l = this.length; i < l; i++) {
        if (this[i] instanceof Array && array[i] instanceof Array) {
            if (!this[i].equals(array[i])) return false;
        } else if (this[i] != array[i]) {
            return false;
        }
    }
    return true;
};

Object.defineProperty(Array.prototype, "equals", { enumerable: false });

var app = express();
app.use(express.static("./website"));
app.use(bp.json());
app.use(
    bp.urlencoded({
        extended: true
    })
);

var localOptions = {
    port: 80,
    redirect: "http://localhost/auth",
    client_id: "SPOTIFY_CLIENT_ID",
    client_secret: "SPOTIFY_CLIENT_SECRET",
    youtube_keys: ["YOUTUBE_KEY"]
};

try {
    var optionsFile = JSON.parse(fs.readFileSync("options.json"));
    for (var key in optionsFile) {
        localOptions[key] = optionsFile[key];
    }
} catch (e) {}

fs.writeFileSync("options.json", beautify(localOptions, null, 4, 100));

var active_key = 0;
var port = localOptions.port;
var keys = localOptions.youtube_keys;
var redirect_uri = localOptions.redirect;
var client_id = localOptions.client_id;
var client_secret = localOptions.client_secret;

console.log(`Started server on port: ${port}
[${keys.length}] YT-KEYS`);

var cachedSearches = [];

setInterval(() => {
    for (let room of rooms) {
        room.routineCheck();
    }
}, 1000);

class CachedItem {
    constructor(id, title, image, artist) {
        this.id = id;
        this.title = title;
        this.image = image;
        this.artist = artist;
    }
}

class User {
    constructor(uuid, socket_id) {
        this.uuid = uuid;
        this.socket_id = socket_id;
    }
}

class QueueItem {
    constructor(id, title, artist, image, type, socket_id, uuid) {
        this.id = id;
        this.title = title;
        this.artist = artist;
        this.image = image;
        this.type = type;
        this.socket_id = socket_id;
        this.votes = [uuid];
        this.added = Date.now();
        this.uuid = uuid;
    }
}

class Room {
    constructor(socket_id, access_token, refresh_token) {
        this.code = this.generateCodeSafe();

        this.update_ids = 0;
        this.socket_id = socket_id;
        this.access_token = access_token;
        this.refresh_token = refresh_token;

        this.members = [];
        this.serverPlayedTrack = false;
        this.queue = [];
        this.length = 0;
        this.progress = 0;
        this.title;
        this.paused = false;
        this.skips = [];
        this.skips_needed = 0;
        this.skipped_ended_song = false;
        this.seeking = false;

        this.color = false;
        this.colors = [];

        this.last_sent_room = {};
        this.access_token_updated = 0;
        this.updating_spotify = false;

        this.ticks = 0;
    }

    routineCheck() {
        this.ticks++;
        if (
            !this.paused &&
            this.queue.length > 0 &&
            this.members.length > 0 &&
            this.length > this.progress
        ) {
            this.progress++;
        }

        if (this.queue[0] && this.queue[0].type == "song") {
            if (this.ticks % 10 == 0) this.statusUpdate();
            if (this.length > 5 && this.length - this.progress < 4) {
                // Less than 4 seconds left on a spotify track

                this.next();
            }
        }
    }

    statusUpdate() {
        this.checkSpotify(() => {
            var options = {
                url: "https://api.spotify.com/v1/me/player/",
                headers: {
                    Authorization: "Bearer " + this.access_token
                },
                json: true
            };
            request.get(options, (error, response, body) => {
                if (body && body.item) {
                    var diff = Math.abs(
                        this.progress - Math.round(body.progress_ms / 1000)
                    );
                    if (Date.now() - this.seeking > 1000) {
                        this.progress = Math.round(body.progress_ms / 1000);
                        this.length = Math.round(body.item.duration_ms / 1000);
                    }

                    //                    console.log("Spotify update");
                    this.update();
                }
            });
        });
    }

    add(item) {
        for (var entry of this.queue) {
            if (entry.id == item.id) return false;
        }

        if (this.queue.length == 0) this.progress = 0;
        this.queue.push(item);
        this.update();
        return true;
    }

    checkSpotify(callback = () => {}) {
        if (Date.now() - this.access_token_updated >= 60 * 60 * 1000) {
            // Token is older than 60 minutes, update!
            this.refreshToken(callback);
        } else {
            callback();
        }
    }

    controlAudio(play = true) {
        var options = {
            url:
                "https://api.spotify.com/v1/me/player/" +
                (play ? "play" : "pause"),
            headers: {
                Authorization: "Bearer " + this.access_token
            },
            json: true
        };
        request.put(options, (error, response, body) => {
            //console.log("Control update");
            this.update();
        });
    }

    next(callback = () => {}) {
        this.skips = [];
        this.progress = 0;
        this.length = 0;
        this.queue.splice(0, 1);

        if (this.queue.length == 0 || this.queue[0].type == "video") {
            this.controlAudio(false);
        }
        this.serverPlayedTrack = false;
        this.update(callback());
    }

    refreshUpdate() {
        this.last_sent_room = {};
        //console.log("Refresh update");
        this.update();
    }

    setColors() {
        this.colors = [];
        for (var i = 0; i < 5; i++) {
            this.colors.push(
                Color(this.color)
                    .darken(1 - 1 / (i + 1))
                    .rgb()
                    .toString()
            );
        }
    }

    update(callback = () => {}) {
        this.progress = Math.round(this.progress);
        this.skips_needed = Math.ceil(this.members.length / 2);

        var playingVideoId =
            this.queue.length > 0 ? this.queue[0].id : undefined;
        // First sort queue by added date
        // Newest video last (biggest date)
        this.queue.sort((a, b) => {
            if (a.id == playingVideoId || b.id == playingVideoId) return 0;
            return a.added - b.added;
        });

        // Sort queue by votes
        this.queue.sort((a, b) => {
            if (a.id == playingVideoId || b.id == playingVideoId) return 0;
            return b.votes.length - a.votes.length;
        });

        this.title = this.queue[0]
            ? cachedSearches[this.queue[0].id].title
            : "Queue empty";

        if (this.queue.length == 0 || this.queue[0].type == "video") {
            this.color = "#3370b5";
        }

        this.setColors();

        var packets = {};
        let room = Object.assign({}, this);
        for (let key in room) {
            if (
                room[key] !== undefined &&
                !equal(this.last_sent_room[key], room[key])
            ) {
                if (
                    ["access_code", "refresh_code", "last_sent_room"].indexOf(
                        key
                    ) == -1
                ) {
                    packets[key] = room[key];

                    this.last_sent_room[key] = JSON.parse(
                        JSON.stringify(room[key])
                    );
                }
            }
        }

        if (this.queue.length > 0 && !this.serverPlayedTrack) {
            if (this.queue[0].type == "song") {
                var options = {
                    url: "https://api.spotify.com/v1/me/player/play",
                    body: {
                        uris: ["spotify:track:" + this.queue[0].id]
                    },
                    headers: {
                        Authorization: "Bearer " + this.access_token
                    },
                    json: true
                };

                request.put(options, (error, response, body) => {
                    if (this.queue[0])
                        this.serverPlayedTrack = this.queue[0].id;
                    else {
                        this.controlAudio(false);
                        return;
                    }
                    this.skipped_ended_song = false;
                    this.paused = false;
                    callback();
                });
            } else {
                callback();
            }
        } else {
            callback();
        }

        function equal(a, b) {
            if (Array.isArray(a)) {
                if (a.length != b.length) return false;
                for (var key in a) {
                    if (a[key] != b[key]) return false;
                }
                return true;
            } else {
                return a == b;
            }
        }

        this.updateUser(this.socket_id, packets);

        for (let member of this.members) {
            this.updateUser(member.socket_id, packets);
        }

        this.update_ids++;
    }

    updateUser(socket_id, packets) {
        io.to(socket_id).emit("update", packets);
    }

    refreshToken(callback = () => {}) {
        if (this.refresh_token) {
            var options = {
                url: "https://accounts.spotify.com/api/token",
                form: {
                    grant_type: "refresh_token",
                    refresh_token: this.refresh_token
                },
                headers: {
                    Authorization:
                        "Basic " +
                        Buffer.from(client_id + ":" + client_secret).toString(
                            "base64"
                        )
                },
                json: true
            };

            request.post(options, (error, response, body) => {
                if (body.error) {
                    this.access_token = false;
                    this.refresh_token = false;
                    io.to(this.socket_id).emit("spotify_disabled");
                } else {
                    this.access_token = body.access_token;
                    this.access_token_updated = Date.now();
                    io.to(this.socket_id).emit("new_token", this.access_token);
                    callback();
                }
            });
        }
    }

    generateCodeSafe() {
        var code;
        var forbidden = [
            "c3e2d42739ddebabfd694c3c6942c165",
            "c02b7d24a066adb747fdeb12deb21bfa",
            "5f86bdf702e28db0b889adece851dfd9"
        ];
        do {
            code = this.generateCode();
        } while (forbidden.indexOf(md5(code)) != -1);

        return code;
    }

    generateCode() {
        var vowels = "AEIOU".split("");
        var consonants = "BDFGHJKLMNPRSTV";

        var code = "";
        for (var i = 0; i < 5; i++) {
            var set = consonants;
            if (i == 0) set = consonants;
            else if (consonants.indexOf(code[i - 1]) != -1) {
                // Last char was consonant
                set = vowels;
            }
            code += set[Math.floor(Math.random() * set.length)];
        }

        return code;
    }
}

var rooms = [];

if (DEBUG) rooms.push(new Room());

// Create the server and start it on the port in config.json
var server = http.createServer(app).listen(port);
// Bind socket.io to the webserver, (socket.io, REST API and the website are all on the same port)
var io = require("socket.io")(server);

app.get("/", (req, res) => {
    res.sendFile("/website/index.html");
});

app.get("/spotify", (req, res) => {
    var scopes =
        "streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state";
    res.redirect(
        "https://accounts.spotify.com/authorize" +
            "?response_type=code" +
            "&client_id=" +
            client_id +
            (scopes ? "&scope=" + encodeURIComponent(scopes) : "") +
            "&redirect_uri=" +
            encodeURIComponent(redirect_uri)
    );
});

app.get("/auth", (req, res) => {
    var options = {
        url: "https://accounts.spotify.com/api/token",
        form: {
            code: req.query.code,
            grant_type: "authorization_code",
            redirect_uri: redirect_uri
        },
        headers: {
            Authorization:
                "Basic " +
                Buffer.from(client_id + ":" + client_secret).toString("base64")
        },
        json: true
    };

    request.post(options, (error, response, body) => {
        res.send(`
        <html>
        <body>
        <script>
            localStorage.setItem('access-token', '${body.access_token}')
            localStorage.setItem('refresh-token', '${body.refresh_token}')
            location.href = "/"
        </script>
        </body>
        </html>
    `);
    });
});

io.on("connection", socket => {
    socket.on("search_spotify", query => {
        for (let room of rooms) {
            for (let member of room.members) {
                if (member.socket_id == socket.id) {
                    if (!room.access_token) {
                        socket.emit("songs", false);
                        return;
                    }
                    room.checkSpotify(() => {
                        https.get(
                            "https://api.spotify.com/v1/search?access_token=" +
                                room.access_token +
                                "&q=" +
                                encodeURIComponent(query) +
                                "&type=track",
                            stream => {
                                let data = "";
                                stream.on("data", chunk => {
                                    data += chunk;
                                });

                                stream.on("end", () => {
                                    data = JSON.parse(data);
                                    if (data.error) {
                                        room.refreshToken();
                                    } else {
                                        var songs = [];
                                        for (var item of data.tracks.items) {
                                            var song = new CachedItem(
                                                item.id,
                                                item.name,
                                                item.album.images[0].url,
                                                item.artists[0].name
                                            );

                                            songs.push(song);
                                            cachedSearches[item.id] = song;
                                        }
                                        socket.emit("songs", songs);
                                    }
                                });
                            }
                        );
                    });
                }
            }
        }
    });

    // !! DEPRECATED !!
    socket.on("refresh_token", refresh_token => {
        var options = {
            url: "https://accounts.spotify.com/api/token",
            form: {
                grant_type: "refresh_token",
                refresh_token: refresh_token
            },
            headers: {
                Authorization:
                    "Basic " +
                    Buffer.from(client_id + ":" + client_secret).toString(
                        "base64"
                    )
            },
            json: true
        };
        request.post(options, (error, response, body) => {
            socket.emit("new_token", body.access_token);
        });
    });

    socket.on("join", req => {
        for (let room of rooms) {
            for (var i = 0; i < room.members.length; i++) {
                if (
                    room.members[i].uuid == req.uuid ||
                    room.members[i].socket_id == socket.id
                ) {
                    io.to(room.members[i].socket_id).emit("kick");
                    room.members.splice(i, 1);
                }
            }
        }

        for (let room of rooms) {
            if (room.code == req.code.toUpperCase()) {
                room.members.push(new User(req.uuid, socket.id));
                socket.emit("joined", room);
                room.update();
                return;
            }
        }
        socket.emit("invalid_code");
    });

    socket.on("host", cred => {
        var room = new Room(socket.id, cred.access_token, cred.refresh_token);
        rooms.push(room);
        room.checkSpotify();
        socket.emit("room_created", room.code);
        console.log("Room created " + room.code);
    });

    socket.on("set_color", color => {
        for (var room of rooms) {
            if (room.socket_id == socket.id) {
                room.color = color;
                //console.log("Color update");
                room.update();
            }
        }
    });

    socket.on("disconnect", () => {
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].socket_id == socket.id) {
                for (var member of rooms[i].members) {
                    // Kick all users in lobby if the host leaves
                    io.to(member.socket_id).emit("kick");
                }
                rooms.splice(i, 1);
            }
        }
        for (var room of rooms) {
            if (room.members)
                for (var i = 0; i < room.members.length; i++) {
                    if (room.members[i].socket_id == socket.id) {
                        room.members.splice(i, 1);
                        room.update();
                    }
                }
        }
    });

    socket.on("sync", () => {
        for (let room of rooms) {
            var authorized = false;
            if (room.socket_id == socket.id) authorized = true;
            if (!authorized) {
                for (var member of room.members) {
                    if (member.socket_id == socket.id) {
                        authorized = true;
                    }
                }
            }
            if (authorized) {
                room.refreshUpdate();
            }
        }
    });

    socket.on("seek", progress => {
        for (let room of rooms) {
            for (let member of room.members) {
                if (room.queue.length > 0) {
                    if (member.socket_id == socket.id) {
                        room.progress = progress;
                        if (room.queue[0].type == "video") {
                            io.to(room.socket_id).emit("seek", room.progress);
                        } else {
                            // Audio, seek spotify
                            room.checkSpotify(() => {
                                var options = {
                                    url:
                                        "https://api.spotify.com/v1/me/player/seek",
                                    qs: { position_ms: room.progress * 1000 },
                                    headers: {
                                        Authorization:
                                            "Bearer " + room.access_token
                                    },
                                    json: true
                                };
                                request.put(
                                    options,
                                    (error, response, body) => {
                                        room.seeking = Date.now();
                                    }
                                );
                            });
                        }

                        return;
                    }
                }
            }
        }
    });

    socket.on("queue_song", id => {
        for (let room of rooms) {
            for (let member of room.members) {
                if (member.socket_id == socket.id) {
                    var cached = cachedSearches[id];

                    if (cached) {
                        room.add(
                            new QueueItem(
                                id,
                                cached.title,
                                cached.artist,
                                cached.image,
                                "song",
                                socket.id,
                                member.uuid
                            )
                        );
                    }
                    return;
                }
            }
        }
    });

    socket.on("bump", id => {
        for (let room of rooms) {
            for (let member of room.members) {
                if (member.socket_id == socket.id) {
                    for (var item of room.queue) {
                        if (item.id == id) {
                            if (item.votes.indexOf(member.uuid) == -1) {
                                item.votes.push(member.uuid);
                            } else {
                                item.votes.splice(
                                    item.votes.indexOf(member.uuid),
                                    1
                                );
                            }
                            room.update();
                            return;
                        }
                    }
                }
            }
        }
    });

    socket.on("skip", () => {
        for (let room of rooms) {
            for (let member of room.members) {
                if (room.queue.length > 0) {
                    if (member.socket_id == socket.id) {
                        if (room.queue[0].uuid == member.uuid) {
                            room.next();
                            return;
                        } else if (room.skips.indexOf(member.uuid) == -1) {
                            room.skips.push(member.uuid);

                            if (room.skips.length >= room.skips_needed) {
                                room.next();
                                return;
                            } else {
                                room.update();
                                return;
                            }
                        }
                        return;
                    }
                }
            }
        }
    });

    socket.on("spotify-status-changed", () => {
        for (var room of rooms) {
            if (room.socket_id == socket.id) {
                /* 	room.progress = status.progress;
				room.length = status.length; */
                room.statusUpdate();
            }
        }
    });

    socket.on("status", status => {
        for (var room of rooms) {
            if (room.socket_id == socket.id) {
                room.progress = status.progress;
                room.length = status.length;
                //console.log("Status update");
                room.update();
            }
        }
    });

    socket.on("ended", () => {
        for (var room of rooms) {
            if (room.socket_id == socket.id) {
                room.next();
            }
        }
    });

    socket.on("pause", () => {
        for (var room of rooms) {
            for (var member of room.members) {
                if (member.socket_id == socket.id) {
                    room.paused = !room.paused;
                    if (room.queue.length > 0) {
                        if (room.queue[0].type == "song") {
                            room.checkSpotify(() => {
                                room.controlAudio(!room.paused);
                            });
                        }
                    }
                    room.update();
                    break;
                }
            }
        }
    });

    socket.on("queue_video", id => {
        for (var room of rooms) {
            for (var member of room.members) {
                if (member.socket_id == socket.id) {
                    if (
                        room.add(
                            new QueueItem(
                                id,
                                cachedSearches[id].title,
                                cachedSearches[id].artist,
                                cachedSearches[id].image,
                                "video",
                                socket.id,
                                member.uuid
                            )
                        )
                    ) {
                        socket.emit("msg", {
                            success: true,
                            message: "Added video"
                        });
                    }
                    break;
                }
            }
        }
    });

    socket.on("transfer", req => {
        var options = {
            url: "https://api.spotify.com/v1/me/player",
            body: {
                device_ids: [req.id]
            },
            headers: {
                Authorization: "Bearer " + req.access_token
            },
            json: true
        };
        request.put(options, (error, response, body) => {});
    });

    socket.on("search", query => {
        if (!query || query.trim() == 0) {
            socket.emit("videos", []);
        } else {
            https.get(
                `https://www.googleapis.com/youtube/v3/search?&order=viewcount&type=video&key=${
                    keys[active_key % keys.length]
                }&fields=items(id, snippet)&part=snippet&maxResults=10&q=${encodeURIComponent(
                    encodeURIComponent(query)
                        .split("%20")
                        .join("+")
                )}`,
                stream => {
                    let data = "";
                    stream.on("data", chunk => {
                        data += chunk;
                    });

                    stream.on("end", () => {
                        data = JSON.parse(data);
                        if (data.error) {
                            socket.emit("videos", []);
                            active_key++;
                            console.log("Switched to key " + active_key);
                        } else {
                            var videos = data.items;
                            var cachedItems = [];

                            for (var video of videos) {
                                var cachedItem = new CachedItem(
                                    video.id.videoId,
                                    video.snippet.title,

                                    video.snippet.thumbnails.medium.url,
                                    video.snippet.channelTitle
                                );
                                cachedItems.push(cachedItem);
                                cachedSearches[cachedItem.id] = cachedItem;
                            }

                            socket.emit("videos", cachedItems);
                        }
                    });
                }
            );
        }
    });
});
