const http = require("http");
const https = require("https");
const bp = require("body-parser");
const express = require("express");
const request = require("request");

var app = express();

app.use(express.static("./website"));
app.use(bp.json());
app.use(
    bp.urlencoded({
        extended: true
    })
);

var active_key = 0;
var keys = [
    "AIzaSyBHLSE803wpbtKKrec0PaiYaSPBM_Xs4IA",
    "AIzaSyDudzVtsTefKQbNFIVFlhJLuIBGxDqcO7I",
    "AIzaSyC5ZKGEogWk8rhXNBHArR9TiVjIEBI5qds",
    "AIzaSyCmd7oWDTTF-E68KkvnpwbMeG2Aq4Dg_Gc",
    "AIzaSyA013f3U9ScDMvRLDjcXL1ZIEDyB9C9PSs",
    "AIzaSyB_EMbkzOEWJpIq2pp5gJ0Yu57D8nQlhJI",
    "AIzaSyAWMuS6W47o2A72FVJTzKD7lJ9HlvleDiA"
];

var cachedSearches = [];

setInterval(() => {
    for (let room of rooms) {
        if (
            !room.paused &&
            room.queue.length > 0 &&
            room.members.length > 0 &&
            room.length > room.progress
        ) {
            room.progress++;
        }
    }
}, 1000);

class CachedItem {
    constructor(id, title, image) {
        this.id = id;
        this.title = title;
        this.image = image;
    }
}

class User {
    constructor(uuid, socket_id) {
        this.uuid = uuid;
        this.socket_id = socket_id;
    }
}

class QueueItem {
    constructor(id, title, image, type, socket_id, uuid) {
        this.id = id;
        this.title = title;
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
        this.code = this.generateCode();
        this.members = [];
        this.socket_id = socket_id;
        this.access_token = access_token;
        this.refresh_token = refresh_token;

        this.serverPlayedTrack = false;
        this.queue = [];
        this.length = 0;
        this.progress = 0;
        this.title;
        this.paused = false;
        this.skips = [];
        this.skips_needed = 0;
    }

    add(item) {
        for (var entry of this.queue) {
            if (entry.id == item.id) return false;
        }

        this.queue.push(item);
        this.update();
        return true;
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
        request.put(options, (error, response, body) => {});
    }

    next() {
        if (this.queue[0].type == "song" && this.queue[1].type == "video") {
            this.controlAudio(false);
        }
        this.skips = [];
        this.progress = 0;
        this.length = 0;
        this.queue.splice(0, 1);
        this.serverPlayedTrack = false;
        this.update();
    }

    update() {
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
                    this.serverPlayedTrack = true;
                    this.paused = false;
                });
            }
        }

        this.updateUser(this.socket_id);

        for (let member of this.members) {
            this.updateUser(member.socket_id);
        }
    }

    updateUser(socket_id) {
        let room = Object.assign({}, this);
        room.access_token = undefined;
        room.refresh_token = undefined;

        io.to(socket_id).emit("update", room);
    }

    refreshToken() {
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
                        new Buffer(client_id + ":" + client_secret).toString(
                            "base64"
                        )
                },
                json: true
            };

            request.post(options, (error, response, body) => {
                this.access_token = body.access_token;
            });
        }
    }

    generateCode() {
        var vowels = "AEIOUY".split("");
        var consonants = "BCDFGHJKLMNPRSTV";

        var code = "";
        for (var i = 0; i < 5; i++) {
            var set = consonants;
            if (i == 0) set = consonants;
            else if (consonants.indexOf(code[i - 1]) != -1) {
                // Last char was consonant
                set = vowels;
            } else {
                if (Math.random() > 0.5) {
                    set = vowels;
                    set.splice(set.indexOf(code[i - 1]), 1);
                }
            }
            code += set[Math.floor(Math.random() * set.length)];
        }
        return code;
    }
}

var rooms = [];

// Create the server and start it on the port in config.json
var server = http.createServer(app).listen(5500);
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

var redirect_uri = "http://localhost:5500/auth";
var client_id = "e78ad0408c9043d1a05fd5d34fdfac54";
var client_secret = "50ab169c11fa4c719ee5ea6e642da963";

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
                new Buffer(client_id + ":" + client_secret).toString("base64")
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
                    if (!room.access_token) return;
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
                                            item.album.images[0].url
                                        );
                                        songs.push(song);
                                        cachedSearches[item.id] = song;
                                    }
                                    socket.emit("songs", songs);
                                }
                            });
                        }
                    );
                }
            }
        }
    });

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
                    new Buffer(client_id + ":" + client_secret).toString(
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
                    room.members.splice(i, 1);
                }
            }
        }

        for (let room of rooms) {
            if (room.code == req.code.toUpperCase()) {
                room.members.push(new User(req.uuid, socket.id));
                room.update();
                socket.emit("joined", room);
            }
        }
    });

    socket.on("host", cred => {
        var room = new Room(socket.id, cred.access_token, cred.refresh_token);
        rooms.push(room);
        socket.emit("room_created", room.code);
    });

    socket.on("disconnect", () => {
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].socket_id == socket.id) {
                for (var member of rooms[i].members) {
                    io.to(member.socket_id).emit("kick");
                }
                rooms.splice(i, 1);
            }
        }
        for (var room of rooms) {
            for (var i = 0; i < room.members.length; i++) {
                if (room.members[i].socket_id == socket.id) {
                    room.members.splice(i, 1);
                    room.update();
                }
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
                            var options = {
                                url:
                                    "https://api.spotify.com/v1/me/player/seek",
                                qs: { position_ms: room.progress * 1000 },
                                headers: {
                                    Authorization: "Bearer " + room.access_token
                                },
                                json: true
                            };
                            request.put(options, (error, response, body) => {});
                        }

                        room.update();
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
                        if (room.queue[0].socket_id == socket.id) {
                            room.next();
                        } else if (room.skips.indexOf(socket.id) == -1) {
                            room.skips.push(socket.id);

                            if (room.skips.length >= room.skips_needed) {
                                room.next();
                            }
                        }
                        return;
                    }
                }
            }
        }
    });

    socket.on("status", status => {
        for (var room of rooms) {
            if (room.socket_id == socket.id) {
                room.progress = status.progress;
                room.length = status.length;
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
                            room.controlAudio(!room.paused);
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
                                    video.snippet.thumbnails.medium.url
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
