const SOCKET = io();

// Elementos da UI
const GAME_CONTAINER = document.getElementById("game-container");
const RESTART_BTN = document.getElementById("restart-button");

const WITHDRAW_BTN = document.getElementById("withdraw-button");
const WITHDRAW_DISPLAY = document.getElementById("withdraw-display");

const BALANCE_DISPLAY = document.getElementById("balance-display");
const FEEDBACK_DISPLAY = document.getElementById("feedback-display");

const BET_INPUT = document.getElementById("bet-input");
const BET_BUTTON = document.getElementById("bet-button");

let userAuthenticated;
let current_bet_value = 1;
let current_bet_id = '';

SOCKET.on('connect', () => {

    SOCKET.emit("USER_AUTH", { gid: 777, opt: '', oid: '' }, (response) => {

        console.log('AUTH RESPONSE: ', response);
        userAuthenticated = response.status === 1;

        if (response.status === 1) {
            DrawBoard(response.grid_size);
        }
    })

});

// Revelar a célula com base no resultado do servidor
function OpenCell(index, result, cashout) {

    const CELL = GAME_CONTAINER.children[index];

    // Aplicar a classe 'revealed' para mudar o fundo para branco
    if (result === 'cash') {
        CELL.textContent = "💰";
        CELL.classList.add("revealed-cell");

        UpdateCashout(cashout);

    } else if (result === 'crash') {
        CELL.textContent = "💣";
        CELL.classList.add("crash-cell"); // Adiciona classe de bomba
    }
};

// Atualizar pontuação
function UpdateCashout(cashout) {
    WITHDRAW_DISPLAY.textContent = `Cashout: ${cashout}`;
}

function DrawBoard(gridSize) {

    GAME_CONTAINER.innerHTML = '';
    GAME_CONTAINER.style.gridTemplateColumns = `repeat(${gridSize}, 60px)`;

    for (let i = 0; i < gridSize * gridSize; i++) {
        const CELL = document.createElement("div");
        CELL.classList.add("cell", "blocked"); // adiciona a classe 'blocked' para desativar inicialmente
        CELL.dataset.index = i;

        // Verifica se a célula está desbloqueada antes de permitir o clique
        CELL.addEventListener("click", () => {
            if (!CELL.classList.contains("blocked")) { // Só emite se não estiver bloqueada
                SOCKET.emit('PICK_CELL', i, (response) => {
                    if (response.status === 1) {
                        OpenCell(response.index, response.result, response.cashout);
                    } else {
                        Feedback('Error in the response of emit CLICK_CELL: Status = 0');
                    }
                });
            }
        });

        GAME_CONTAINER.appendChild(CELL);
    }

    BET_INPUT.value = current_bet_value;

    Feedback('New game ready!');
}

// Função para liberar todas as células após a aposta
function UnlockCells() {
    document.querySelectorAll(".cell").forEach(cell => cell.classList.remove("blocked"));
}

// Evento de saque
WITHDRAW_BTN.addEventListener("click", () => {
    SOCKET.emit('PLACE_CASHOUT', { current_bet_id: current_current_bet_id }, (response) => {

        if (response.status === 1) {
            UpdateCashout(0); // Reiniciar pontuação
            DrawBoard(); // Reiniciar o tabuleiro
        }
    });
});

BET_INPUT.addEventListener("blur", () => {
    bet_value = parseFloat(BET_INPUT.value) || 0;
    //console.log(bet_value); // Exibe o valor no console para conferência
});

BET_INPUT.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        BET_INPUT.blur(); // Opcional: remove o foco do input após pressionar "Enter"
    }
});

// Evento de aposta
BET_BUTTON.addEventListener("click", () => {
    console.log('Current bet value:', current_bet_value);

    if (current_bet_value > 0) {

        SOCKET.emit('PLACE_BET', { bet_value: current_bet_value }, (response) => {
            if (response.status === 1) {
                UnlockCells();

                Feedback('Bet confirmed! Lets play.');
            }
        });
    } else {
        Feedback('Insert a valid value to bet.');
    }
});

// Reiniciar o jogo
RESTART_BTN.addEventListener("click", () => {
    SOCKET.emit('START', (response) => {
        DrawBoard(response.grid_size);
        current_bet_id = '';
    });

});

function Feedback(text) {
    FEEDBACK_DISPLAY.textContent = text;
}
