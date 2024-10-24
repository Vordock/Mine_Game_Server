const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { randomUUID } = require('crypto');

const APP = express();
const HTTP_SERVER = http.createServer(APP);
const IO_SERVER = new Server(HTTP_SERVER);
const PORT = 2108;

APP.use(express.static(path.join(__dirname, '/public')));
APP.use('/favicon.ico', (req, res) => res.status(204).end());

APP.get('/page', (req, res) => res.sendFile(path.join(__dirname, 'page/index.html')));
APP.get('/games/1', (req, res) => res.sendFile(path.join(__dirname, 'games/1/index.html'))); // Ler o index da build dentro da pasta

APP.get('/games/9', (req, res) => res.sendFile(path.join(__dirname, 'games/9/index.html'))); // Ler o index da build dentro da pasta

HTTP_SERVER.listen(PORT, () => {
    console.log('\nSERVER ONLINE IN:', `localhost:${PORT}`);
});

IO_SERVER.on(('connection'), (socket) => {
    
    socket.on('USER_AUTH', (received, callback) => {
        
        console.log('received: ', received);
        
        callback && callback()
    });

});