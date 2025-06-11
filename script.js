// Unicode chess pieces, board setup
const pieces = {
  "r": "♜", "n": "♞", "b": "♝", "q": "♛", "k": "♚", "p": "♟",
  "R": "♖", "N": "♘", "B": "♗", "Q": "♕", "K": "♔", "P": "♙", "": ""
};
const startPosition = [
  ["r","n","b","q","k","b","n","r"],
  ["p","p","p","p","p","p","p","p"],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["P","P","P","P","P","P","P","P"],
  ["R","N","B","Q","K","B","N","R"]
];

let board = JSON.parse(JSON.stringify(startPosition));

function createBoard() {
  const boardDiv = document.getElementById('chessboard');
  boardDiv.innerHTML = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.className = 'square ' + ((row + col) % 2 === 0 ? 'white-square' : 'black-square');
      square.textContent = pieces[board[row][col]];
      boardDiv.appendChild(square);
    }
  }
}

// Timer logic
let whiteTime = 300;
let blackTime = 300;
let whiteTimer, blackTimer;
let turn = 'white';
let running = false;

function formatTime(t) {
  const m = Math.floor(t / 60).toString().padStart(2, '0');
  const s = (t % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateTimers() {
  document.getElementById('white-timer').textContent = formatTime(whiteTime);
  document.getElementById('black-timer').textContent = formatTime(blackTime);
}

function switchTurn() {
  if (!running) return;
  if (turn === 'white') {
    clearInterval(whiteTimer);
    blackTimer = setInterval(() => {
      if (blackTime > 0) {
        blackTime--;
        updateTimers();
      } else {
        clearInterval(blackTimer);
        running = false;
        alert("Black's time is up!");
      }
    }, 1000);
    turn = 'black';
  } else {
    clearInterval(blackTimer);
    whiteTimer = setInterval(() => {
      if (whiteTime > 0) {
        whiteTime--;
        updateTimers();
      } else {
        clearInterval(whiteTimer);
        running = false;
        alert("White's time is up!");
      }
    }, 1000);
    turn = 'white';
  }
}

function startGame() {
  if (running) return;
  running = true;
  if (turn === 'white') {
    whiteTimer = setInterval(() => {
      if (whiteTime > 0) {
        whiteTime--;
        updateTimers();
      } else {
        clearInterval(whiteTimer);
        running = false;
        alert("White's time is up!");
      }
    }, 1000);
  } else {
    blackTimer = setInterval(() => {
      if (blackTime > 0) {
        blackTime--;
        updateTimers();
      } else {
        clearInterval(blackTimer);
        running = false;
        alert("Black's time is up!");
      }
    }, 1000);
  }
}

function resetGame() {
  clearInterval(whiteTimer);
  clearInterval(blackTimer);
  board = JSON.parse(JSON.stringify(startPosition));
  createBoard();
  whiteTime = 300;
  blackTime = 300;
  updateTimers();
  turn = 'white';
  running = false;
}

document.getElementById('start-btn').onclick = startGame;
document.getElementById('switch-btn').onclick = switchTurn;
document.getElementById('reset-btn').onclick = resetGame;

// Initialize
createBoard();
updateTimers();
