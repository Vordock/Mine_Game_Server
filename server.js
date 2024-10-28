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
const GRID_SIZE = 4;
const BOMB_COUNT = 3;

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
let gameOver = false;

let bet = 10;

const BET_COEF = bet;

const MULTIPLY_WEIGHT = [
    { min: 1, max: 1, weight: 0.5 },
    { min: 0.45, max: 0.70, weight: 1 },
    { min: 0.30, max: 0.41, weight: 3 },
    { min: 0.20, max: 0.29, weight: 7.5 },
    { min: 0.13, max: 0.19, weight: 15 },
    { min: 0.08, max: 0.12, weight: 35 },
    { min: 0.025, max: 0.075, weight: 65 },
];

IO_SERVER.on('connection', (_socket) => {
    //console.log('\nPlayer Connected:', socket.id);

    _socket.on('USER_AUTH', (data, callback) => {

        //console.log('USER AUTH:', data);

        if (data.gid === 777) {
            callback && callback({ status: 1, grid_size: GRID_SIZE, data: { balance: user.current_balance }, message: 'Player Authenticated!' })

            CreateGameBoard();
        } else {
            console.log('\nInvalid Game ID received...');
        }
    });

    _socket.on('START', (callback) => {
        callback && callback(GRID_SIZE);
        console.log('\nSEND GRID SIZE');
    });

    // Evento de clique na célula
    _socket.on('CLICK_CELL', (index, callback) => {
        if (gameOver || gameBoard[index] === 'open') return;

        let result;

        if (gameBoard[index] === 'crash') {
            result = 'crash';
            gameOver = true;

        } else if (gameBoard[index] === 'cash') {
            result = 'cash';
            user.current_stars++;

        } else {
            result = 'empty';
            console.log('Unknown cell value.');
        }

        gameBoard[index] = 'open';

        callback && callback({ index, result, score, gameOver });

        // Checar se o jogador encontrou uma bomba
        if (gameOver) {
            setTimeout(StartNewGame, 2000);
        }
    });

    _socket.on('BET', (callback) => {
        
        callback && callback({status: 1, });
    });

    // Evento de saque
    _socket.on('CASHOUT', (data, callback) => {
        if (user.current_stars > 0 && data.bet_id === user.bet_id) {
            callback && callback({status: 1, cashout: user.current_cashout});
        }

        //createGameBoard(); // Reiniciar o jogo após o saque
    });

    _socket.on('disconnect', () => {
        console.log(`\nPlayer Disconnected: ${_socket.id}`);
    });

});

// Função para arredondar valores com precisão de duas casas decimais
function roundToTwo(value) {
    return Math.round(value * 100) / 100;
}

function WeightedRandomNumber(weightsArray) {
    // Calcula o peso total acumulado
    const totalWeight = weightsArray.reduce((total, elem) => total + elem.weight, 0);

    let randomWeight = roundToTwo(Math.random() * totalWeight);

    for (const elem of weightsArray) {

        if (randomWeight <= elem.weight) {
            // Gera o número aleatório no intervalo definido pelo elemento atual
            const numberGet = roundToTwo(Math.random() * (elem.max - elem.min) + elem.min);

            console.log('\nChance:', `${roundToTwo(randomWeight)} / ${elem.weight}`);
            console.log('Multiply:', numberGet);
            //console.log('Cashout Gain:', BET_COEF * numberGet);

            return numberGet;
        }
    }
}

// Função para criar um novo tabuleiro
function CreateGameBoard() {
    gameBoard = Array(GRID_SIZE * GRID_SIZE).fill(null);

    let starsPlaced = 0;
    let bombsPlaced = 0;
    let cellsFree = gameBoard.length;

    // Colocar bombas
    while (bombsPlaced < BOMB_COUNT) {
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

    //console.log('gameBoard:', gameBoard);
    gameOver = false;
    console.log('\nNEW BOARD READY!');
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

HTTP_SERVER.listen(PORT, () => {
    console.log('\nSERVER ONLINE IN:', `localhost:${PORT}`);
    // Inicializar o jogo no início
    //CreateGameBoard();

    //setInterval(() => (WeightedRandomNumber(MULTIPLY_WEIGHT)), 1000);
});
