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
function OpenCell(index, result, cashout) {
  const CELL = GAME_CONTAINER.children[index];

  if (result === "crash") {
    CELL.textContent = "💣";
    CELL.classList.add("crash-cell"); // Adiciona classe de bomba
  } else {
    CELL.textContent = result;
    CELL.classList.add("revealed-cell");
    CASHOUT_BTN.disabled = false;
    UpdateCashout(cashout);
  }
}

// UPDATE BALANCE DISPLAY
function UpdateBalance(newValue) {
  BALANCE_DISPLAY.textContent = `Balance: ${newValue}`;
}

// UPDATE CASHOUT DISPLAY
function UpdateCashout(cashout) {
  CASHOUT_DISPLAY.textContent = `Cashout: ${+cashout.toFixed(2)}`;
}

function DrawBoard() {
  SOCKET.emit("START", (start_response) => {
    current_bet_id = "";

    BET_INPUT.disabled = false;

    GAME_CONTAINER.innerHTML = "";
    GAME_CONTAINER.style.gridTemplateColumns = `repeat(${start_response.grid_size}, 60px)`;

    for (
      let i = 0;
      i < start_response.grid_size * start_response.grid_size;
      i++
    ) {
      const CELL = document.createElement("div");
      CELL.classList.add("cell", "blocked");
      CELL.dataset.index = i;

      CELL.addEventListener("click", () => {
        if (!CELL.classList.contains("blocked")) {
          SOCKET.emit("PICK_CELL", i, (response) => {
            //console.log(response);
            if (response.status === 1) {
              OpenCell(response.index, response.result, response.cashout);
            } else {
              Feedback(`Server: ${response.message}`);
            }
          });
        } else {
          Feedback(`Cell ${i + 1} is locked. Bet to play.`);
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
  SOCKET.emit(
    "PLACE_CASHOUT",
    { current_bet_id: current_bet_id },
    (response) => {
      if (response.status === 1) {
        Feedback("Cashout!");

        UpdateCashout(response.cashout_value);
        UpdateBalance(response.balance);
        setTimeout(() => {
          DrawBoard();
          UpdateCashout(0);
        }, 2000);
      }
    }
  );
});

BET_INPUT.addEventListener("blur", () => {
  current_bet_value = parseFloat(BET_INPUT.value) || 0;
});

BET_INPUT.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    BET_INPUT.blur();
  }
});

BET_BTN.addEventListener("click", () => {
  if (current_bet_value > 0) {
    SOCKET.emit("PLACE_BET", { bet_value: current_bet_value }, (response) => {
      if (response.status === 1) {
        UnlockCells();
        BET_INPUT.disabled = true;

        Feedback("Bet confirmed! Cells unlocked.");

        UpdateBalance(response.balance);
      }
    });
  } else {
    Feedback("Insert a valid value to bet.");
  }
});

RESTART_BTN.addEventListener("click", () => {
  DrawBoard();
});

let diplayCheck = false;
let feedback_list = [];

function Feedback(text) {
  feedback_list.push(text);

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
