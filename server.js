const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { randomUUID } = require("crypto");
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
APP.use(express.static(path.join(__dirname, "/public")));
APP.use("/favicon.ico", (req, res) => res.status(204).end());

APP.get("/page", (req, res) =>
  res.sendFile(path.join(__dirname, "page/index.html"))
);
APP.get("/games/9", (req, res) =>
  res.sendFile(path.join(__dirname, "games/9/index.html"))
);

class User {
  constructor(name) {
    this.name = name;
    this.current_balance = "3521";
    this.current_bet_id = "";
    this.current_bet_value = 0;
    this.current_cash_count = 0;
    this.current_cashout = 0;
  }

  ResetData() {
    this.current_balance = "3521";
    this.current_bet_id = "";
    this.current_bet_value = 0;
    this.current_cash_count = 0;
    this.current_cashout = 0;
  }
}

let user = new User("SrBot");
let gameBoard = [];
let gameOver = false;

let bet = 10;

const BET_COEF = bet;

const MULTIPLY_WEIGHT = [
  { min: 1, max: 1, weight: 0.5 },
  { min: 0.3, max: 0.41, weight: 5 },
  { min: 0.2, max: 0.29, weight: 15 },
  { min: 0.11, max: 0.19, weight: 35 },
  { min: 0.05, max: 0.1, weight: 65 },
];

// Função para arredondar valores com precisão de duas casas decimais
function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function WeightedRandomNumber(weightsArray) {
  // Calcula o peso total acumulado
  const maxWeight = Math.max(...weightsArray.map((elem) => elem.weight));

  let randomWeight = roundToTwo(Math.random() * maxWeight);

  for (let i = 0; i < weightsArray.length; i++) {
    const element = weightsArray[i];

    if (randomWeight <= element.weight) {
      const numberGet = roundToTwo(
        Math.random() * (element.max - element.min) + element.min
      );

      console.log(
        "\nChance:",
        `${roundToTwo(randomWeight)} / ${element.weight}`
      );

      return numberGet;
    }
  }
}

IO_SERVER.on("connection", (_socket) => {
  console.log("\nPlayer Connected:", _socket.id);

  _socket.on("USER_AUTH", (data, callback) => {
    //console.log('USER AUTH:', data);
    if (data.gid === 777) {
      callback &&
        callback({
          status: 1,
          data: { balance: user.current_balance },
          message: "Player Authenticated!",
        });
    } else {
      console.log("\nInvalid Game ID received...");
    }
  });

  _socket.on("START", (callback) => {
    CreateGameBoard();
    callback && callback({ board_size: GRID_SIZE });
  });

  _socket.on("PICK_CELL", async (index, callback) => {
    if (gameOver || gameBoard[index] === "open") return;

    let content;

    if (gameBoard[index] === "crash") {
      content = "crash";
      gameOver = true;

      callback &&
        callback({
          status: 1,
          index: index,
          content: content,
          cashout: parseFloat(user.current_cashout),
        });
    } else if (gameBoard[index] === "cash") {
      // Gera o valor do multiplicador apenas uma vez
      const CURRENT_GAIN = CalculateCellValue();
      content = `+${CURRENT_GAIN}`;
      callback &&
        callback({
          status: 1,
          index: index,
          content: content,
          cashout: CalculateNewCashout(CURRENT_GAIN),
        });
    } else {
      content = "empty";
      callback &&
        callback({
          status: 0,
          index: index,
          content: content,
          cashout: user.current_cashout,
          message: "Unknown cell value.",
        });
    }

    gameBoard[index] = "open";

    // Checar se o jogador encontrou uma bomba
    if (gameOver) {
      IO_SERVER.emit("CRASH");
    }
  });

  _socket.on("PLACE_BET", (data, callback) => {
    console.log("Data content:", data);

    let numericBalance = parseFloat(user.current_balance); //so pra garantir que ta lidando com numeros

    const NEW_BET_ID = randomUUID();
    user.current_bet_id = NEW_BET_ID;

    console.log("\nBET GET:", data.bet_value);

    if (numericBalance >= data.bet_value) {
      numericBalance -= data.bet_value;

      user.current_bet_value = data.bet_value;
      user.current_balance = numericBalance.toFixed(2);
      user.current_cashout = user.current_bet_value;

      console.log("New Balance:", user.current_balance);

      callback &&
        callback({
          status: 1,
          bet_id: user.current_bet_id,
          balance: user.current_balance,
        });
    } else {
      console.log("\n  Not Enough Balance!:", user.current_balance);

      callback &&
        callback({ status: 0, message: "Player balance is not enough." });
    }
  });

  // Evento de saque
  _socket.on("PLACE_CASHOUT", (data, callback) => {
    console.log("\nCASHOUT RESPONSE:", data);
    if (user.current_cash_count > 0 && data.bet_id === user.current_bet_id) {
      let numBalance = parseFloat(user.current_balance);
      numBalance += user.current_cashout;
      user.current_balance = numBalance.toFixed(2);

      callback &&
        callback({
          status: 1,
          cashout_value: roundToTwo(user.current_cashout),
          balance: user.current_balance,
        });
      setTimeout(() => {
        CreateGameBoard();
      }, 1000);
    } else {
      callback && callback({ status: 0, message: "Invalid Bet ID!" });
    }
  });

  _socket.on("disconnect", () => {
    console.log(`\nPlayer Disconnected: ${_socket.id}`);

    user.ResetData();
  });
});

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
      gameBoard[index] = "crash";
      bombsPlaced++;
      cellsFree--;
    }
  }

  // Colocar estrelas
  while (cellsFree > 0) {
    const index = Math.floor(Math.random() * gameBoard.length);
    if (gameBoard[index] === null) {
      gameBoard[index] = "cash";
      starsPlaced++;
      cellsFree--;
    }
  }

  //console.log('gameBoard:', gameBoard);
  gameOver = false;
  console.log("\nNEW GAME READY!");
}

function CalculateBet(betValue) {
  if (+user.current_balance >= betValue) {
    user.current_bet_value = betValue;
    user.current_cashout = betValue;
  }
}

function CalculateNewCashout(cellValue) {
  if (user.current_bet_value > 0) {
    return (user.current_cashout += roundToTwo(+cellValue));
  }
}

function CalculateCellValue() {
  const multiplier = WeightedRandomNumber(MULTIPLY_WEIGHT);

  const GAIN = user.current_bet_value * multiplier;

  user.current_cashout += GAIN;
  user.current_cash_count++;

  console.log("Multiply:", multiplier);
  console.log("Gain:", roundToTwo(GAIN));
  console.log("Wins:", user.current_cash_count);

  return multiplier;
}

HTTP_SERVER.listen(PORT, () => {
  console.log("\nSERVER ONLINE IN:", `localhost:${PORT}`);
  // Inicializar o jogo no início
  //CreateGameBoard();

  //setInterval(() => (WeightedRandomNumber(MULTIPLY_WEIGHT)), 1000);
});
