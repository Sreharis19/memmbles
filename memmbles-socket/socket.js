var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

app.use(function(req, res, next){
var checkIp = require('check-ip')
var response = checkIp(req.headers.host.split(':')[0])
if (response.isValid) {
  next()
} else {
    const isNotSecure = (!req.get('x-forwarded-port') && req.protocol !== 'https') ||
      parseInt(req.get('x-forwarded-port'), 10) !== 443 &&
        (parseInt(req.get('x-forwarded-port'), 10) === parseInt(req.get('x-forwarded-port'), 10))

    if (isNotSecure) {
      return res.redirect(301, 'https://' + req.get('host') + req.url)
    }
   next()
 }
})


var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var redirectToHTTPS = require('express-http-to-https').redirectToHTTPS
 
// Don't redirect if the hostname is `localhost:port` or the route is `/insecure`
app.use(redirectToHTTPS([/localhost:(\d{4})/], [/\/insecure/], 301));

var users = [];
var userList = [];
var chatBoxUsers = [];
var chatBoxList = [];

server.listen(8000);

console.log('socket server started on port 8000')

io.on('connection', function (socket) {

  // Detect user login - connection using socket
  socket.on('login', function(data) {
   // console.log(data);
    if(userList.indexOf(data.data.userId) == -1) {
        users[socket.id] = data.data.userId;
        userList.push(data.data.userId);
    }
  })

  socket.on('disconnect', function() {
   // socket ----- disconnect
    console.log("disconnect",socket.id)
   // console.log(users[socket.id] + 'disconnected');
    var userListIndex = userList.indexOf(users[socket.id])
    if(userListIndex != -1) {
       userList.splice( userListIndex, 1 );
    }

    var usersIndex = users.indexOf(users[socket.id])
    if(usersIndex != -1) {
       users.splice( users.indexOf( users[socket.id]), 1 )
     }

     var chatBoxListIndex = chatBoxList.indexOf(chatBoxUsers[socket.id])
    if(chatBoxListIndex != -1) {
       chatBoxList.splice( chatBoxListIndex, 1 );
    }

    var chatBoxUsersIndex = chatBoxUsers.indexOf(chatBoxUsers[socket.id])
    if(chatBoxUsersIndex != -1) {
       chatBoxUsers.splice( chatBoxUsers.indexOf( chatBoxUsers[socket.id]), 1 )
     }

  })


  socket.on('get_connected_list', function(data) {
   // console.log(data);
   //  console.log('connected sockets')
   // console.log(userList);
    socket.emit(data.topic, {connected_list: true, users: userList})
  })

  socket.on('send_typing_status', function(data) {
    socket.broadcast.emit(data.topic, data.data)
  })


  socket.on('photo_uploaded', function (data) {
    //console.log(data);
    socket.broadcast.emit(data.topic, data.data)
  });

  socket.on('video_uploaded', function (data) {
    //console.log(data);
    socket.broadcast.emit(data.topic, data.data)
  });


  socket.on('push_notification', function (data) {
    //console.log(data);
    socket.broadcast.emit(data.topic, data.data)
  });


  socket.on('chat', function (data) {
   // console.log(data);
    socket.broadcast.emit(data.topic, data.data)
  });

  socket.on('onetooneVideoChat',function (data) {
    console.log(data.data)
    socket.broadcast.emit(data.data)
  })

  socket.on('calling', (data) => {
    console.log("calling",data)
    socket.broadcast.emit(data.topic, data.data)
  })
  
   socket.on('misscall', (data) => {
    console.log("misscall",data)
    socket.broadcast.emit(data.topic, data.data)
  })

  socket.on('answering', (data) => {
    console.log("answering",data)
    socket.broadcast.emit(data.topic, data.data)
  })

  socket.on('offer', (data) => {
    console.log("offer",data)
    socket.broadcast.emit(data.topic, data.data);
  });

  socket.on('candidate',(data) => {
    console.log("candidate",data)
    socket.broadcast.emit(data.topic, data.data);
  })

  socket.on('answer',(data) => {
    console.log("answer",data)
    socket.broadcast.emit(data.topic,data.data)
  })

  socket.on('call_rejection', (data) => {
    console.log("call_rejection",data)
    socket.broadcast.emit(data.topic, data.data)
  })
  
 socket.on('call_autoEnd', (data) => {
    console.log("call_autoEnd",data)
    socket.broadcast.emit(data.topic, data.data)
  })

 socket.on('chatBox', function (data) {
  //console.log("dataaa",data)
    if(chatBoxList.indexOf(data.data.userId) == -1) {
        chatBoxUsers[socket.id] = data.data.userId;
        chatBoxList.push(data.data.userId);
       // console.log("chatBoxList",chatBoxList)
    }
           // console.log("chatBoxList1",chatBoxList)

  });
socket.on('get_chatboxopen_list', function(data) {
   //console.log(data);
    //console.log('connected chatBoxList')
    //console.log(chatBoxList);
    socket.emit(data.topic, {chatboxopen_list: true, users: chatBoxList})
  })

socket.on('chatBoxClose', function() {
   // socket ----- disconnect
    console.log("+++++++++++++++++",socket.id)
   console.log(chatBoxUsers[socket.id] + 'disconnected');
    var chatBoxListIndex = chatBoxList.indexOf(chatBoxUsers[socket.id])
    if(chatBoxListIndex != -1) {
       chatBoxList.splice( chatBoxListIndex, 1 );
    }

    var chatBoxUsersIndex = chatBoxUsers.indexOf(chatBoxUsers[socket.id])
    if(chatBoxUsersIndex != -1) {
       chatBoxUsers.splice( chatBoxUsers.indexOf( chatBoxUsers[socket.id]), 1 )
     }

  })

socket.on('justOpen', (data) => {
  console.log("justOpen justOpen justOpen",data.data)
    socket.broadcast.emit(data.topic, data.data)
  })
//12 August 2020 for blur video
socket.on('blur',(data) => {
    console.log("blur",data)
    socket.broadcast.emit(data.topic,data.data)
  })



});
