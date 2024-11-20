const SOCKET = io();

// Elementos da UI
const GAME_CONTAINER = document.getElementById("game-container");
const RESTART_BTN = document.getElementById("restart-button");

const CASHOUT_BTN = document.getElementById("withdraw-button");
const CASHOUT_DISPLAY = document.getElementById("withdraw-display");

const BALANCE_DISPLAY = document.getElementById("balance-display");
const FEEDBACK_DISPLAY = document.getElementById("feedback-display");

const BET_INPUT = document.getElementById("bet-input");
const BET_BTN = document.getElementById("bet-button");

let userAuthenticated;
let current_bet_value = 1;
let current_bet_id = "";

function ResetData() {
  current_bet_value = 1;
  current_bet_id = "";

  BET_INPUT.textContent = current_bet_value;
}

SOCKET.on("connect", () => {
  SOCKET.emit("USER_AUTH", { gid: 777, opt: "", oid: "" }, (response) => {
    console.log("AUTH RESPONSE: ", response);

    userAuthenticated = response.status === 1;

    if (response.status === 1) {
      UpdateBalance(response.data.balance);

      DrawBoard();
    }
  });

  SOCKET.on("CRASH", () => {
    Feedback("Game Over");
    setTimeout(() => {
      DrawBoard();
    }, 2000);
  });
});

// Revelar a célula com base no resultado do servidor
function OpenCell(index, content, cashout) {
  const CELL = GAME_CONTAINER.children[index];

  if (content === "crash") {
    CELL.textContent = "💣";
    CELL.classList.add("crash-cell"); // Adiciona classe de bomba
  } else {
    CELL.textContent = content;
    CELL.classList.add("revealed-cell");
    CASHOUT_BTN.disabled = false;
    UpdateCashout(cashout);
  }
}

// UPDATE BALANCE DISPLAY
function UpdateBalance(newValue) {
  BALANCE_DISPLAY.textContent = `Balance: ${newValue}`;
  console.log("Balance updated!");
}

// UPDATE CASHOUT DISPLAY
function UpdateCashout(cashout) {
  CASHOUT_DISPLAY.textContent = `Cashout: ${+cashout.toFixed(2)}`;
}

function DrawBoard() {
  ResetData();
  UpdateCashout(0);

  SOCKET.emit("START", (start_response) => {
    BET_INPUT.disabled = false;
    CASHOUT_BTN.disabled = true;

    GAME_CONTAINER.innerHTML = "";
    GAME_CONTAINER.style.gridTemplateColumns = `repeat(${start_response.board_size}, 60px)`;

    for (
      let _index = 0;
      _index < start_response.board_size * start_response.board_size;
      _index++
    ) {
      const CELL = document.createElement("div");
      CELL.classList.add("cell", "blocked");
      CELL.dataset.index = _index;

      CELL.addEventListener("click", () => {
        if (!CELL.classList.contains("blocked")) {
          SOCKET.emit("PICK_CELL", _index, (response) => {
            //console.log(response);
            if (response.status === 1) {
              OpenCell(_index, response.content, response.cashout);
            } else {
              Feedback(`Server: ${response.message}`);
            }
          });
        } else {
          Feedback(`Cell ${_index + 1} is locked. Bet to play.`);
        }
      });

      GAME_CONTAINER.appendChild(CELL);
    }

    BET_INPUT.value = current_bet_value;

    Feedback("New game ready!");
  });
}

function UnlockCells() {
  document
    .querySelectorAll(".cell")
    .forEach((cell) => cell.classList.remove("blocked"));
}

CASHOUT_BTN.addEventListener("click", () => {
  CASHOUT_BTN.disabled = true;

  SOCKET.emit("PLACE_CASHOUT", { bet_id: current_bet_id }, (response) => {
    console.log("Cashout Response:", response);
    if (response.status === 1) {
      Feedback("Cashout!");

      UpdateCashout(response.cashout_value);
      UpdateBalance(response.balance);

      setTimeout(() => {
        DrawBoard();
        UpdateCashout(0);
      }, 2000);
    }
  });
});

BET_BTN.addEventListener("click", () => {
  if (current_bet_value > 0) {
    SOCKET.emit("PLACE_BET", { bet_value: current_bet_value }, (response) => {
      console.log("Bet Response: ", response);

      if (response.status === 1) {
        UnlockCells();
        BET_INPUT.disabled = true;

        Feedback("Bet confirmed! Cells unlocked.");

        current_bet_id = response.bet_id;

        UpdateBalance(response.balance);
      }
    });
  } else {
    Feedback("Insert a valid value to bet.");
  }
});

BET_INPUT.addEventListener("blur", () => {
  current_bet_value = parseFloat(BET_INPUT.value) || 0;
});

BET_INPUT.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    BET_INPUT.blur();
  }
});

RESTART_BTN.addEventListener("click", () => {
  DrawBoard();
});

let diplayCheck = false;
let feedback_list = [];

function Feedback(text) {
  feedback_list.push(text);

  if (feedback_list.length > 3) {
    feedback_list.shift();
  }

  const CLEAR = () => {
    FEEDBACK_DISPLAY.textContent = "";
    diplayCheck = false;

    if (feedback_list.length > 0) {
      displayNextFeedback();
    }
  };

  const displayNextFeedback = () => {
    if (!diplayCheck && feedback_list.length > 0) {
      FEEDBACK_DISPLAY.textContent = feedback_list.shift(); // shift() to remove from start
      diplayCheck = true;

      setTimeout(CLEAR, 1500);
    }
  };

  if (!diplayCheck) {
    displayNextFeedback();
  }
}

// // Example usage
// document.addEventListener('DOMContentLoaded', () => {
//     Feedback("First message");
//     Feedback("Second message");
//     Feedback("Third message");
// });
