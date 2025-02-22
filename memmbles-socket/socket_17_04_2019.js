var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var redirectToHTTPS = require('express-http-to-https').redirectToHTTPS
 
// Don't redirect if the hostname is `localhost:port` or the route is `/insecure`
app.use(redirectToHTTPS([/localhost:(\d{4})/], [/\/insecure/], 301));

var users = [];
var userList = [];

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
    console.log(socket.id)
   // console.log(users[socket.id] + 'disconnected');
    var userListIndex = userList.indexOf(users[socket.id])
    if(userListIndex != -1) {
       userList.splice( userListIndex, 1 );
    }

    var usersIndex = users.indexOf(users[socket.id])
    if(usersIndex != -1) {
       users.splice( users.indexOf( users[socket.id]), 1 )
     }

  })


  socket.on('get_connected_list', function(data) {
   // console.log(data);
    console.log('connected sockets')
    console.log(userList);
    socket.emit(data.topic, {connected_list: true, users: userList})
  })

  socket.on('send_typing_status', function(data) {
    socket.broadcast.emit(data.topic, data.data)
  })


  socket.on('photo_uploaded', function (data) {
    console.log(data);
    socket.broadcast.emit(data.topic, data.data)
  });

  socket.on('video_uploaded', function (data) {
    console.log(data);
    socket.broadcast.emit(data.topic, data.data)
  });


  socket.on('push_notification', function (data) {
    console.log(data);
    socket.broadcast.emit(data.topic, data.data)
  });


  socket.on('chat', function (data) {
    console.log(data);
    socket.broadcast.emit(data.topic, data.data)
  });



});
