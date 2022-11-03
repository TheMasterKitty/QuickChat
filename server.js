var bodyParser = require('body-parser');
var app = require("express")();
var fs = require("fs");
var port = process.env.PORT || 8080;
var peopleWaiting = {};
var users = {"dylanz": "themasterkitty"};
var activeTokens = {};
var onlineUsers = {};
var onlineUsersOld = {};
var messages = [];

letters = "abcdefghijklmnopqrstuvwxyz";

fs.appendFile('waiting.txt', '');
fs.appendFile('users.txt', '');

fs.readFile('waiting.txt', function(err, data) {
    if (data.trim() != "")
        peopleWaiting = JSON.parse(data.trim());
});

fs.readFile('users.txt', function(err, data) {
    if (data.trim() != "")
        users = JSON.parse(data.trim());
});

function getRandom(max) {
    return Math.floor(Math.random() * max);
}

setInterval(() => {
    for (const i in Object.keys(onlineUsers)) {
        if (typeof(Object.keys(onlineUsersOld)[i]) != "undefined") {
            if (onlineUsersOld[i] == onlineUsers[i]) {
                delete onlineUsers[i];
                delete onlineUsersOld[i];
            }
            else {
                onlineUsersOld[i] = onlineUsers[i];
            }
        }
        else {
            onlineUsersOld[i] = onlineUsers[i];
        }
    }
}, 5000);

app.use(bodyParser.urlencoded({ extended: false }));

app.post("/api/getwaiting",  function(req, res) {
    if (typeof(req.body) != "undefined" && typeof(req.body.token) != "undefined")
        if (typeof(activeTokens[req.body.token]) != "undefined" && activeTokens[req.body.token] === "dylanz")
            res.send(Object.keys(peopleWaiting).join(";"));
});

app.post("/api/waitstatus",  function(req, res) {
    if (typeof(req.body) != "undefined" && typeof(req.body.token) != "undefined" && typeof(req.body.waitname) != "undefined" && typeof(req.body.status) != "undefined")
        if (typeof(activeTokens[req.body.token]) != "undefined" && activeTokens[req.body.token] === "dylanz" && Object.keys(peopleWaiting).includes(req.body.waitname)) {
            if (req.body.status == "allow") {
                users[req.body.waitname] = peopleWaiting[req.body.waitname];
                delete peopleWaiting[req.body.waitname];
            }
            else if (req.body.status == "deny")
                delete peopleWaiting[req.body.waitname];
            fs.writeFile("waiting.txt", JSON.stringify(peopleWaiting));
            fs.writeFile("users.txt", JSON.stringify(users));
        }
});

app.post("/api/signup",  function(req, res) {
    if (typeof(req.body) != "undefined" && typeof(req.body.username) != "undefined" && typeof(req.body.password) != "undefined")
        if (!Object.keys(users).includes(req.body.username) && !Object.keys(peopleWaiting).includes(req.body.username) && !req.body.username.includes(" ")) {
            peopleWaiting[req.body.username] = req.body.password;
            fs.writeFile("waiting.txt", JSON.stringify(peopleWaiting));
        }
});

app.post("/api/login",  function(req, res) {
    if (typeof(req.body) != "undefined" && typeof(req.body.username) != "undefined" && typeof(req.body.password) != "undefined") {
        if (Object.keys(users).includes(req.body.username) && Object.values(users)[Object.keys(users).indexOf(req.body.username)] === req.body.password) {
            var token = "";
            for (let i = 0; i < 50; i++)
                token += letters[getRandom(26)];
            activeTokens[token] = req.body.username;
            setTimeout(function() { delete activeTokens[token]; }, 7200000);
            res.send(token);
        }
        else if (typeof(peopleWaiting[req.body.username]) != "undefined")
            res.send("waiting");
        else
            res.send("invalid");
    }
});

app.post("/api/changepassword", function(req, res) {
    if (typeof(req.body) != "undefined" && typeof(req.body.username) != "undefined" && typeof(req.body.password) != "undefined" && typeof(req.body.newpass) != "undefined") {
        if (Object.keys(users).includes(req.body.username) && users[req.body.username] === req.body.password) {
            for (let i = 0; i < Object.values(activeTokens); i++) {
                const element = Object.values(activeTokens)[i];
                if (element === req.body.username)
                    delete activeTokens[Object.keys(activeTokens)[i]];
            }
            users[req.body.username] = req.body.newpass;
        }
    }
});

app.post("/api/message",  function(req, res) {
    if (typeof(req.body) != "undefined" && typeof(req.body.token) != "undefined" && typeof(req.body.message) != "undefined") {
        if (typeof(activeTokens[req.body.token]) != "undefined" && !req.body.message.includes("<br>") && req.body.message != "") {
            messages.push(activeTokens[req.body.token] + ": " + req.body.message);
        }
    }
});

app.post("/api/getmessages",  function(req, res) {
    if (typeof(req.body) != "undefined" && typeof(req.body.token) != "undefined") {
        if (typeof(activeTokens[req.body.token]) != "undefined") {
            res.send(messages.join("<br>"))
        }
    }
});

app.post("/api/getstatuses",  function(req, res) {
    if (typeof(req.body) != "undefined" && typeof(req.body.token) != "undefined") {
        if (typeof(activeTokens[req.body.token]) != "undefined") {
            res.send(Object.keys(onlineUsers).join("<br>"))
        }
    }
});

app.post("/api/validatetoken",  function(req, res) {
    if (typeof(req.body) != "undefined" && typeof(req.body.token) != "undefined") {
        if (typeof(activeTokens[req.body.token]) != "undefined") {
            onlineUsers[activeTokens[req.body.token]] = Date.now();
            res.send("valid");
        }
        else
            res.send("invalid")
    }
});

app.get("/",  function(req, res) {
    res.sendFile(__dirname + "/index.html");
})

app.listen(port);

console.log(`Running on port ${port}`)