//used the following tutorials: 
//https://tsh.io/blog/socket-io-tutorial-real-time-communication 
//https://socket.io/get-started/chat
//https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie

let socket = io();
let online = document.querySelector(".online-topbar");
let input = document.querySelector("#m");
let taken;

//moves scroll bar back down to bottom of the chat
$('.messagelist').scrollTop($('.messagelist')[0].scrollHeight);

//add a user to the online side bar
let addOnlineUser = (username) => {
  if (!!document.querySelector(`.${username}-online`)) {
    return;
  }

  let onlineUser =    
    `<div class=" displayedUsers ${username}-online">
       <p>${username}</p>
     </div>`;

  online.innerHTML += onlineUser;
}

//create a username for a new user that joins
//do this on server side
let username = "";
let newUser = (user) => {
  //if there is a username stored
  if (document.cookie.length > 0) {
    const cookieValue = document.cookie.split('; ').find(row => row.startsWith('username')).split('=')[1];
    socket.emit("check if taken", cookieValue);
    //if username is taken, generate a new one
    if (taken === "taken") {
      username = user || `User${Math.floor(Math.random() * 1000)}`;
    //else, grab stored username
    } else {
      const cookieValue = document.cookie.split('; ').find(row => row.startsWith('username')).split('=')[1];
      username = cookieValue;
    }
  //if there is not username stored, generate a username
  } else {
    username = user || `User${Math.floor(Math.random() * 1000)}`;
    document.cookie = "username=" + username;
  }
  //display username for user
  document.querySelector(".chat-topbar").innerHTML = "Chat Room (You are " + username + ")";
  socket.emit("new user", username);
  addOnlineUser(username);
};

newUser();

//add user when they connect
socket.on("new user", function(info) {
  info.map((user) => addOnlineUser(user));
});

//remove user when they disconnect
socket.on("delete user", function(username) {
  if (username !== null) {
    document.querySelector(`.${username}-online`).remove();
  }
});

socket.on("username taken", function(istaken) {
  taken = istaken;
});

//format new message
let newMessage = ({user, msg}, formatted) => {
  //convert to emojis using UTF-8
  if (msg !== undefined) {
    if (msg.includes(":)")) {
      msg = msg.replace(":)", "&#128513;");
    } 
    if (msg.includes(":(")) {
      msg = msg.replace(":(", "&#128577;");
    } 
    if (msg.includes(":*")) {
      msg = msg.replace(":*", "&#128536;");
    } 
    if (msg.includes(":o")) {
      msg = msg.replace(":o", "&#128559;");
    } 
    if (msg.includes(":O")) {
      msg = msg.replace(":O", "&#128559;");
    } 
    if (msg.includes(">:(")) {
      msg = msg.replace(">:(", "&#128545;");
    } 
    if (msg.includes("<3")) {
      msg = msg.replace("<3", "&#128151;");
    } 
    if (msg.includes(":'(")) {
      msg = msg.replace(":'(", "&#128546;");
    } 
    if (msg.includes(":P")) {
      msg = msg.replace(":P", "&#129322;");
    } 
    if (msg.includes(":p")) {
      msg = msg.replace(":p", "&#129322;");
    } 
    //if user wants to change username
    if (msg.startsWith("/name")) {
      let split = msg.split(" ");
      var letterNumber = /^[0-9a-zA-Z]+$/;
      if (split[1].length > 0 && split[1].match(letterNumber)) {
        socket.emit("change username", split[1], user);
      }
      return;
    //if user wants to change message color
    } else if (msg.startsWith("/color ")) {
      let split = msg.split(" ");
      var letterNumber = /^[0-9a-fA-F]+$/;
      if (split[1].length === 6 && split[1].match(letterNumber)) {
        socket.emit("change color", split[1], user);
      }
      return;
    }
  }

  let self = `<div class="self ${user}"><p>${msg}</p><div class="message-info"><span class="message-author">You at </span><span class="message-time">${formatted}</span></div></div>`
  let others = `<div class="others ${user}"><p>${msg}</p><div class="message-info"><span class="message-author">${user} at </span><span class="message-time">${formatted}</span></div></div>`

  if (user !== undefined) {
    let messagecontent = user === username ? self : others;
    document.querySelector(".messagelist").innerHTML += messagecontent;
  }
  $('.messagelist').scrollTop($('.messagelist')[0].scrollHeight);
};

//after user sends new message
$('form').submit(function(e) {
  e.preventDefault();
  socket.emit('chat message', $('#m').val());
  if (input.value === "") {
    return;
  }
  
  socket.emit("chat message", {
    name: username,
    content: input.value,
  });

  input.value = "";
});

//new message
socket.on("chat message", (msg, formatted) => {
  newMessage({user: msg.name, msg: msg.content}, formatted);
});

//change username
socket.on("change username", (newname, oldname) => {
  if (username === oldname) {
    username = newname;
    document.cookie = "username=" + newname;
    document.querySelector(".chat-topbar").innerHTML = "Chat Room (You are " + newname + ")"
  }
});

//update chat history to show username changes
socket.on("update chat history", (newname, oldname) => {
  let authors = document.getElementsByClassName("message-author");
  for (let i = 0; i < authors.length; i++) {
    if (authors[i].innerHTML === oldname + " at ") {
      authors[i].innerHTML = newname + " at ";
    }
  }

  let authorclass = document.querySelectorAll(`.${oldname}`);
  for (let i = 0; i < authorclass.length; i++) {
    authorclass[i].classList.replace(oldname, newname); 
  }
});

//change color of messages from specific user
socket.on("change color", (color, coloruser) => {
  let style = document.createElement("style")
  style.type = "text/css"
  style.innerHTML += 
  `#frame .chat .messages .messagelist .${coloruser} p {
    background: #${color};
  }`
  document.head.appendChild(style);
});

//display old messages to new users
socket.on("show old messages", function(messageHistory) {
  for (i in messageHistory) {
    let message = `<div class="others ${messageHistory[i].name}"><p>${messageHistory[i].content}</p><div class="message-info"><span class="message-author">${messageHistory[i].name} at </span><span class="message-time">${messageHistory[i].time}</span></div></div>`;
    document.querySelector(".messagelist").innerHTML += message;

    //style message with correct color
    let style = document.createElement("style")
    style.type = "text/css"
    style.innerHTML += 
    `#frame .chat .messages .messagelist .${messageHistory[i].name} p {
      background: #${messageHistory[i].color};
    }`
    document.head.appendChild(style);

    $('.messagelist').scrollTop($('.messagelist')[0].scrollHeight);
  }
});

