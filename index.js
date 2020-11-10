var app = require("express")();
var http = require("http").createServer(app);
var io = require("socket.io")(http);
var express = require("express");
var path = require("path");

app.use(express.static(path.join(__dirname, "public")));

app.get('/', function(req, res){
  res.sendFile(__dirname + "/index.html");
});

http.listen(3000, () => {
    console.log("listening on *:3000");
});

//set of online users
const onlineUsers = new Set();
//array containing message history
const messageHistory = new Array();

io.on("connection", function(socket){
  //add new user
  socket.on("new user", function(info) {
    socket.userID = info;
    onlineUsers.add(info);
    //show message history to new user
    if (messageHistory[0] !== undefined) {
      socket.emit("show old messages", messageHistory);
    }
    //display new user to everyone
    io.emit("new user", [...onlineUsers]);
  });
  
  //remove user from online users when they disconnect
  socket.on("disconnect", () => {
    onlineUsers.delete(socket.userID);
    io.emit("delete user", socket.userID);
  });

  //new chat message
  socket.on("chat message", function(msg) {
    //calculate the current time
    let date = new Date();
    let formatted = date.toLocaleString("en-US", {hour: "numeric", minute: "numeric"});

    //message attributes
    let attributes = {
      name: msg.name,
      content: msg.content,
      time: formatted,
    };
    //put message into message history
    if ((attributes.name !== undefined) && (attributes.content !== undefined) && !attributes.content.startsWith("/name") && !attributes.content.startsWith("/color")) {
      //only show the most recent 200 messages
      if (messageHistory.length < 201) {
        messageHistory.push(attributes);
      } else {
        messageHistory.shift();
        messageHistory.push(attributes);
      }
    }
    
    io.emit("chat message", msg, formatted);
  });

  socket.on("change username", (newname, oldname) => {
    if (onlineUsers.has(newname)) {
      //do not change username if it has been taken already
    } else {
      //remove old name from online users and add new name
      onlineUsers.delete(oldname);
      io.emit("delete user", oldname);
      socket.userID = newname;
      onlineUsers.add(newname);
      io.emit("new user", [...onlineUsers]);

      //change new in message history
      for (let i = 0; i < messageHistory.length; i++) {
        if (messageHistory[i].name === oldname) {
          messageHistory[i].name = newname;
        }
      }

      //change username and update chat history to reflect this
      socket.emit("change username", newname, oldname);
      io.emit("update chat history", newname, oldname);
    }
  });

  //change color of message
  socket.on("change color", (color, coloruser) => {
    for (let i = 0; i < messageHistory.length; i++) {
      if (messageHistory[i].name === coloruser) {
        messageHistory[i].color = color;
      }
    }
    io.emit("change color", color, coloruser);
  });

  //check if username has been taken or not
  socket.on("check if taken", function(storedname) {
    for (let i = 0; i < messageHistory.length; i++) {
      if (messageHistory[i].name === storedname) {
        socket.emit("username taken", "taken");
      }
    }
  });
});