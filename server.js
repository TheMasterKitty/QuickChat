const http = require('http');
var { Server } = require("socket.io");

var app = require("express")();
const server = http.createServer(app);
var io = new Server(server);
var port = process.env.PORT || 8080;
var peopleWaiting = {};
var peopleOnline = [];
var users = {
    "dylanz": "themasterkitty"
};
var pfps = {
    "dylanz": "cat.png"
};

io.on('connection',  function (socket) {
    var loggedIn = false;
    var username = "";
    var lastMessageTime = 0;
    socket.on("login",  function(data) {
        try {
            if (Object.keys(users).includes(data.username) && users[data.username] === data.password && !peopleOnline.includes(data.username)) {
                loggedIn = true;
                username = data.username;
                socket.emit("login", "valid-" + peopleOnline.join("<br>"));
                io.emit("statusadd", username);
                peopleOnline.push(username);
            }
            else if (peopleOnline.includes(data.username))
                socket.emit("login", "taken");
            else
                socket.emit("login", "invalid");
        }
        catch {}
    });
    socket.on("signup",  function(data) {
        try {
            if (!Object.keys(users).includes(data.username) && !Object.keys(peopleWaiting).includes(data.username) && !data.username.includes(" ") && !data.password.includes(" ") && data.username != "" && data.password != "") {
                peopleWaiting[data.username] = {"pass": data.password, "pfp": data.pfp};
            }
            else if (Object.keys(users).includes(data.username) && users[data.username] === data.password) {
                pfps[data.username] = data.pfp;
            }
        }
        catch {}
    });
    socket.on("reset",  function(data) {
        try {
            if (Object.keys(users).includes(data.username) && users[data.username] === data.password) {
                loggedIn = true;
                users[data.username] = data.newpass;
                io.emit("remove", data.username);
            }
        }
        catch {}
    });
    socket.on("admin",  function(command) {
        try {
            if (username === "dylanz") {
                if (command == "getwaiting") {
                    socket.emit("adminwaiting", Object.keys(peopleWaiting));
                }
                else if (command.startsWith("removewaiting:")) {
                    var data = command.split(":")[1].split(";");
                    for (const i of data) {
                        delete peopleWaiting[i];
                    }
                }
                else if (command.startsWith("allowwaiting:")) {
                    var data = command.split(":")[1].split(";");
                    for (const i of data) {
                        users[i] = peopleWaiting[i]["pass"];
                        pfps[i] = peopleWaiting[i]["pfp"];
                        io.emit("message", [pfps[i], "BROADCAST", i + " has been signed up! Say hi when they join."]);
                        delete peopleWaiting[i];
                    }
                }
                else if (command == "getpeople") {
                    socket.emit("adminusers", Object.keys(users));
                }
                else if (command.startsWith("removepeople:")) {
                    var data = command.split(":")[1].split(";");
                    for (const i of data) {
                        if (i != "dylanz") {
                            delete users[i];
                            delete pfps[i];
                            io.emit("remove", i);
                        }
                    }
                }
                else if (command.startsWith("getpass:")) {
                    socket.emit("adminpass", users[command.split(":")[1]]);
                }
            }
        }
        catch {}
    });
    socket.on("message",  function(text) {
        try {
            if (loggedIn && Date.now() > lastMessageTime + 1000) {
                io.emit("message", [pfps[username], username, text.trim()]);
                lastMessageTime = Date.now();
            }
        }
        catch {}
    });
    socket.on("disconnect",  function() {
        if (loggedIn) {
            peopleOnline.splice(peopleOnline.indexOf(username), 1)
            io.emit("statusremove", username);
        }
    })
});

app.get("/",  function(req, res) {
    res.sendFile(__dirname + "/public/index.html");
});

app.get("/icon.png", function(req, res) {
    res.sendFile(__dirname + "/public/icon.png");
});

app.get("/cat.png", function(req, res) {
    res.sendFile(__dirname + "/public/cat.png");
});

app.get("/horse.png", function(req, res) {
    res.sendFile(__dirname + "/public/horse.png");
});

app.get("/fox.png", function(req, res) {
    res.sendFile(__dirname + "/public/fox.png");
});

app.get("/parrot.png", function(req, res) {
    res.sendFile(__dirname + "/public/parrot.png");
});

app.get("/tiger.png", function(req, res) {
    res.sendFile(__dirname + "/public/tiger.png");
});

server.listen(port);

console.log(`Running on port ${port}`);