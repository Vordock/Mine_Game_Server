const SOCKET = io();

// Elementos da UI
const GAME_CONTAINER = document.getElementById("game-container");
const RESTART_BTN = document.getElementById("restart-button");

const WITHDRAW_BTN = document.getElementById("withdraw-button");
const WITHDRAW_DISPLAY = document.getElementById("withdraw-display");

const BALANCE_DISPLAY = document.getElementById("balance-display");
const SCORE_DISPLAY = document.getElementById("score-display");

const BET_INPUT = document.getElementById("bet-input");
const BET_BTN = document.getElementById("bet-button");

let usarAuthenticated;

SOCKET.on('connect', () => {

    SOCKET.emit("USER_AUTH", { gid: 777, opt: '', oid: '' }, (response) => {

        console.log('AUTH RESPONSE: ', response);
        usarAuthenticated = response.status === 1;

        if (response.status === 1) {
            DrawBoard(response.grid_size);
        }
    })

});

// Revelar a célula com base no resultado do servidor
function OpenCell(index, result, cash, gameOver){

    const CELL = GAME_CONTAINER.children[index];

    // Aplicar a classe 'revealed' para mudar o fundo para branco
    if (result === 'cash') {
        CELL.textContent = "💰";
        CELL.classList.add("revealed-cell");

    } else if (result === 'crash') {
        CELL.textContent = "💣";
        CELL.classList.add("crash-cell"); // Adiciona classe de bomba
    }

    UpdateCashout(score);

    if (gameOver) {
        alert("Game Over! Você encontrou uma bomba.");
    }
};

SOCKET.on('CASHOUT', () => {
    WITHDRAW_BTN.disabled = false;
})

// Atualizar pontuação
function UpdateCashout(cashout, balance) {
    SCORE_DISPLAY.textContent = `Score: ${score}`;
    BALANCE_DISPLAY.textContent = `Balance: ${balance}`;
}

// Criar o tabuleiro no cliente
function DrawBoard(gridSize) {

    console.log(gridSize);

    GAME_CONTAINER.innerHTML = '';

    GAME_CONTAINER.style.gridTemplateColumns = `repeat(${gridSize}, 60px)`;

    for (let i = 0; i < gridSize * gridSize; i++) {
        const CELL = document.createElement("div");
        CELL.classList.add("cell");
        CELL.dataset.index = i;
        
        CELL.addEventListener("click", () => { // the cell becomes a button
            SOCKET.emit('CLICK_CELL', i, (response) => {

            });
        });

        GAME_CONTAINER.appendChild(CELL);
    }

    console.log('\n     BOARD DRAWNED!');
}

// Evento de saque
WITHDRAW_BTN.addEventListener("click", () => {
    SOCKET.emit('CASHOUT', (response) => {

        if (response.status === 1) {
            UpdateCashout(0); // Reiniciar pontuação
            DrawBoard(); // Reiniciar o tabuleiro
        }
    });
});

// Reiniciar o jogo
RESTART_BTN.addEventListener("click", () => {
    DrawBoard();
});
