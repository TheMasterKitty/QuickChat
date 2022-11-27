var http = require('http');
var { Server } = require("socket.io");
var fs = require("fs");
var app = require("express")();
const server = http.createServer(app);
var io = new Server(server);
var port = process.env.PORT || 8080;

var peopleWaiting = {};
var users = {
    "kitcat": "themasterkitty"
};
var pfps = {
    "kitcat": "cat.png"
};

try {
    const data = fs.readFileSync(__dirname + '/users.txt', 'utf8');
    users = JSON.parse(data);
} catch (err) {
    console.error(err);
}

try {
    const data = fs.readFileSync(__dirname + '/pfps.txt', 'utf8');
    pfps = JSON.parse(data);
} catch (err) {
    console.error(err);
}

console.log("Users: " + JSON.stringify(users));
console.log("PFPs: " + JSON.stringify(pfps));

var sockets = {};
var peopleOnline = [];
var DMable = [];

function replaceURLs(text) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) { return '<a target="_blank" href="' + url + '">' + url + '</a>'; } );
}

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
                sockets[username] = socket;
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
    socket.on("acceptdm", function(enable) {
        try {
            if (enable == "true" && !DMable.includes(username))
                DMable.push(username);
            else if (enable == "false" && DMable.includes(username))
                DMable.splice(DMable.indexOf(username), 1);
        }
        catch {}
    });
    socket.on("getdm", function(data) {
        if (DMable.includes(username))
            socket.emit("dms", DMable);
        else
            socket.emit("dms", ["err dms"]);
    });
    socket.on("admin",  function(command) {
        try {
            if (username === "kitcat") {
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
                        console.log("Users: " + JSON.stringify(users));
                        console.log("PFPs: " + JSON.stringify(pfps));
                        fs.writeFileSync(__dirname + "/users.txt", JSON.stringify(users));
                        fs.writeFileSync(__dirname + "/pfps.txt", JSON.stringify(pfps));
                        delete peopleWaiting[i];
                    }
                }
                else if (command == "getpeople") {
                    socket.emit("adminusers", Object.keys(users));
                }
                else if (command.startsWith("removepeople:")) {
                    var data = command.split(":")[1].split(";");
                    for (const i of data) {
                        if (i != "kitcat") {
                            delete users[i];
                            delete pfps[i];
                            io.emit("remove", i);
                        }
                    }
                    console.log("Users: " + JSON.stringify(users));
                    console.log("PFPs: " + JSON.stringify(pfps));
                    fs.writeFileSync(__dirname + "/users.txt", JSON.stringify(users));
                    fs.writeFileSync(__dirname + "/pfps.txt", JSON.stringify(pfps));
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
            if (loggedIn && Date.now() > lastMessageTime + 1000 && text.replace(/<(?=.*? .*?\/ ?>|br|hr|input|!--|wbr)[a-z]+.*?>|<([a-z]+).*?<\/\1>/i, "") .trim() != "") {
                io.emit("message", [pfps[username], username, replaceURLs(text.replace(/<(?=.*? .*?\/ ?>|br|hr|input|!--|wbr)[a-z]+.*?>|<([a-z]+).*?<\/\1>/i, "").trim())]);
                lastMessageTime = Date.now();
            }
        }
        catch {}
    });
    socket.on("dm",  function(data) {
        try {
            if (loggedIn && DMable.includes(data.user) && DMable.includes(username) && data.message.trim() != "") {
                sockets[data.user].emit("dm", [pfps[username], username, replaceURLs(data.message.replace(/<(?=.*? .*?\/ ?>|br|hr|input|!--|wbr)[a-z]+.*?>|<([a-z]+).*?<\/\1>/i, "").trim())]);
                socket.emit("dmsend", [pfps[username], data.user, replaceURLs(data.message.replace(/<(?=.*? .*?\/ ?>|br|hr|input|!--|wbr)[a-z]+.*?>|<([a-z]+).*?<\/\1>/i, "").trim())]);
            }
        }
        catch {}
    });
    socket.on("disconnect",  function() {
        if (loggedIn) {
            peopleOnline.splice(peopleOnline.indexOf(username), 1);
            if (DMable.includes(username))
                DMable.splice(DMable.indexOf(username), 1);
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

app.get("/goat.png", function(req, res) {
    res.sendFile(__dirname + "/public/goat.png");
});

server.listen(port);

console.log(`Running on port ${port}`);
