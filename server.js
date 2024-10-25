const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
//const cors = require('cors');

const APP = express();
const HTTP_SERVER = http.createServer(APP);
const IO_SERVER = new Server(HTTP_SERVER);
// const IO_SERVER = new Server(HTTP_SERVER, {
//     cors: {
//         origin: "*",
//         methods: ["GET", "POST"]
//     }
// });
const PORT = 2108;

//APP.use(cors());
APP.use(express.static(path.join(__dirname, '/public')));
APP.use('/favicon.ico', (req, res) => res.status(204).end());

APP.get('/page', (req, res) => res.sendFile(path.join(__dirname, 'page/index.html')));
APP.get('/games/9', (req, res) => res.sendFile(path.join(__dirname, 'games/9/index.html')));

class User {
    constructor(name) {
        this.name = name;
        this.current_balance = 3521;
        this.current_bet_id = '';
        this.current_bet_value = 0;
        this.current_stars = 0;
        this.current_cashout = 0;
    }

    ResetData() {
        this.current_balance = 3521;
        this.current_bet_id = '';
        this.current_bet_value = 0;
        this.current_stars = 0;
        this.current_cashout = 0;
    }
}

let user = new User('SrBot');

let gameBoard = [];
const gridSize = 4;
const bombCount = 3;
let gameOver = false;

// Função para criar um novo tabuleiro
function createGameBoard() {
    gameBoard = Array(gridSize * gridSize).fill(null);
    let starsPlaced = 0;
    let bombsPlaced = 0;
    let cellsFree = gameBoard.length;

    // Colocar bombas
    while (bombsPlaced < bombCount) {
        const index = Math.floor(Math.random() * gameBoard.length);
        if (gameBoard[index] === null) {
            gameBoard[index] = 'bomb';
            bombsPlaced++;
            cellsFree--;
        }
    }

    // Colocar estrelas
    while (cellsFree > 0) {
        const index = Math.floor(Math.random() * gameBoard.length);
        if (gameBoard[index] === null) {
            gameBoard[index] = 'star';
            starsPlaced++;
            cellsFree--;
        }
    }

    score = 0;
    gameOver = false;
    console.log('\nNEW GAME READY!');
}

IO_SERVER.on('connection', (socket) => {
    //console.log('\nPlayer Connected:', socket.id);

    socket.on('USER_AUTH', (data, callback) => {

        //console.log('USER AUTH:', data);

        if (data.gid === 777) {
            callback && callback({ status: 1, data: { balance: user.current_balance }, message: 'Player Authenticated!' })
        } else {
            console.log('\nInvalid Game ID received...');
        }

        // Enviar tabuleiro ao cliente
        socket.emit('initialize', {
            gridSize,
            score,
            gameOver
        });

    });

    // Evento de clique na célula
    socket.on('clickCell', (index) => {
        if (gameOver || gameBoard[index] === 'revealed') return;

        let result;

        if (gameBoard[index] === 'bomb') {
            result = 'bomb';
            gameOver = true;
        } else if (gameBoard[index] === 'star') {
            result = 'star';
            user.current_stars++;
        } else {
            result = 'empty';
        }

        gameBoard[index] = 'revealed';

        // Enviar resultado ao cliente
        socket.emit('reveal', {
            index,
            result,
            score,
            gameOver
        });

        if (CanCash()) {
            IO_SERVER.emit('CASHON');
        }

        // Checar se o jogador encontrou uma bomba
        if (gameOver) {
            IO_SERVER.emit('gameOver', { score });
            StartNewGame();
        }
    });

    // Evento de saque
    socket.on('CASHOUT', (data, callback) => {
        //createGameBoard(); // Reiniciar o jogo após o saque
    });

    socket.on('disconnect', () => {
        console.log(`\nPlayer Disconnected: ${socket.id}`);
    });

});

function StartNewGame() {
    createGameBoard();

    // Enviar tabuleiro ao cliente
    socket.emit('initialize', {
        gridSize,
        score,
        gameOver
    });
}


function CalculateBet(betValue) {

    if (+user.current_balance >= betValue) {
        user.current_bet_value = betValue;
        user.current_cashout = betValue;
    }
}

function CalculateCashout(cellValue) {
    if (user.current_bet_value > 0) {
        user.current_cashout += +cellValue;
    }
}

function CanCash() {
    return user.current_stars > 0;
}


HTTP_SERVER.listen(PORT, () => {
    console.log('\nSERVER ONLINE IN:', `localhost:${PORT}`);
    // Inicializar o jogo no início
    createGameBoard();
});
