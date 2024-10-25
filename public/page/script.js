const socket = io();

// Elementos da UI
const GAME_CONTAINER = document.getElementById("game-container");
const RESTART_BTN = document.getElementById("restart-button");

const WITHDRAW_BTN = document.getElementById("withdraw-button");
const WITHDRAW_DISPLAY = document.getElementById("withdraw-display");

const BALANCE_DISPLAY = document.getElementById("balance-display");
const SCORE_DISPLAY = document.getElementById("score-display");

const BET_INPUT = document.getElementById("bet-input");
const BET_BTN = document.getElementById("bet-button");

let gridSize;

socket.on('connect', () => {

    socket.emit("USER_AUTH", { gid: 777, opt: '', oid: '' }, (response) => {

        console.log('AUTH RESPONSE: ', response);

        if (response.status === 1) {

            // Inicializar o jogo no cliente
            socket.on('initialize', (data) => {
                gridSize = data.gridSize;
                createBoard();
            });

        }
    })

    // Revelar a célula com base no resultado do servidor
    socket.on('reveal', (data) => {
        const { index, result, score, gameOver } = data;
        const CELL = GAME_CONTAINER.children[index];

        // Aplicar a classe 'revealed' para mudar o fundo para branco
        CELL.classList.add("revealed-cell");

        if (result === 'star') {
            CELL.textContent = "⭐";

        } else if (result === 'bomb') {
            CELL.textContent = "💣";
            CELL.classList.add("bomb"); // Adiciona classe de bomba
        }

        UpdateCashout(score);

        if (gameOver) {
            alert("Game Over! Você encontrou uma bomba.");
        }
    });

    socket.on('CASHON', () => {
        WITHDRAW_BTN.disabled = false;
    })
});


// Atualizar pontuação
function UpdateCashout(cashout, balance) {
    SCORE_DISPLAY.textContent = `Score: ${score}`;
    BALANCE_DISPLAY.textContent = `Balance: ${balance}`;
}

// Criar o tabuleiro no cliente
function createBoard() {
    GAME_CONTAINER.innerHTML = '';
    GAME_CONTAINER.style.gridTemplateColumns = `repeat(${gridSize}, 60px)`;

    for (let i = 0; i < gridSize * gridSize; i++) {
        const CELL = document.createElement("div");
        CELL.classList.add("cell");
        CELL.dataset.index = i;
        CELL.addEventListener("click", () => {
            socket.emit('clickCell', i);
        });
        GAME_CONTAINER.appendChild(CELL);
    }
}


// Evento de saque
WITHDRAW_BTN.addEventListener("click", () => {
    socket.emit('CASHOUT', (response) => {
        UpdateCashout(0); // Reiniciar pontuação
        createBoard(); // Reiniciar o tabuleiro
    });
});

// Reiniciar o jogo
RESTART_BTN.addEventListener("click", () => {
    createBoard();
});
