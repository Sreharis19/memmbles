var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(8000);

console.log('socket server started on port 8000')

io.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('photo_uploaded', function (data) {
    console.log(data);
    socket.broadcast.emit(data.topic, data.data)
//socket.broadcast.emit('newdata', {my: 'data'})
//console.log('newdata emitted')
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
