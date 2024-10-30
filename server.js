const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { randomUUID } = require('crypto');
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
        this.current_balance = '3521';
        this.current_bet_id = '';
        this.current_bet_value = 0;
        this.current_cash_count = 0;
        this.current_cashout = 0;
    }

    ResetData() {
        this.current_balance = '3521';
        this.current_bet_id = '';
        this.current_bet_value = 0;
        this.current_cash_count = 0;
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
            callback && callback({ status: 1, data: { balance: user.current_balance }, message: 'Player Authenticated!' })

            CreateGameBoard();

            IO_SERVER.emit('CREATE_BOARD', {grid_size: GRID_SIZE});

        } else {
            console.log('\nInvalid Game ID received...');
        }
    });

    _socket.on('START', (callback) => {
        callback && callback({ grid_size: GRID_SIZE });
        console.log('\nSEND GRID SIZE');
    });

    // Evento de clique na célula
    _socket.on('PICK_CELL', (index, callback) => {
        if (gameOver || gameBoard[index] === 'open') return;

        let result;

        if (gameBoard[index] === 'crash') {
            result = 'crash';
            gameOver = true;

        } else if (gameBoard[index] === 'cash') {
            result = 'cash';

            user.current_cashout += user.current_bet_value * WeightedRandomNumber(MULTIPLY_WEIGHT);

            user.current_cash_count++;

        } else {
            result = 'empty';
            console.log('Unknown cell value.');
        }

        gameBoard[index] = 'open';

        callback && callback({ index: index, result: result, cashout: user.current_cashout });

        // Checar se o jogador encontrou uma bomba
        if (gameOver) {
            setTimeout(StartNewGame, 2000);
            IO_SERVER.emit('CRASH');
        }
    });

    _socket.on('PLACE_BET', (data, callback) => {

        console.log('Data content:', data);

        let numericBalance = parseFloat(user.current_balance); //so pra garantir que ta lidando com numeros

        const NEW_BET_ID = randomUUID();
        user.current_bet_id = NEW_BET_ID;

        console.log('\nAposta recebida:', data.bet_value);

        if (numericBalance >= data.bet_value) {
            numericBalance -= data.bet_value;

            user.current_balance = numericBalance.toFixed(2);
            console.log('Novo saldo:', user.current_balance);

            callback && callback({ status: 1, bet_id: user.current_bet_id, balance: user.current_balance });

        } else {
            console.log('\n  Not Enough Balance!:', user.current_balance);

            callback && callback({ status: 0, message: 'Player balance is not enough.' });
        }

    });

    // Evento de saque
    _socket.on('PLACE_CASHOUT', (data, callback) => {
        if (user.current_cash_count > 0 && data.bet_id === user.bet_id) {
            callback && callback({ status: 1, cashout_value: user.current_cashout, balance: user.current_balance });
            setTimeout(() => {
                CreateGameBoard();
            }, 1000);
        } else {
            callback && callback({ status: 0, message: 'Invalid Bet ID!' });
        }

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
