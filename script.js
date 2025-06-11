// --- Chess logic and state ---
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
let selected = null;
let moves = [];
let turn = 'w'; // 'w' for white, 'b' for black
let inCheck = false, checkmated = false;

// Touch drag state (for mobile drag-to-move)
let touchDragging = false;
let touchDragStart = null;
let touchDragPiece = null;

// Desktop drag state
let dragging = false, dragStart = null, dragPiece = null;

function isWhite(piece) { return /^[KQRBNP]$/.test(piece); }
function isBlack(piece) { return /^[kqrbnp]$/.test(piece); }
function otherTurn(t) { return t === 'w' ? 'b' : 'w'; }
function pieceColor(piece) {
  if (isWhite(piece)) return 'w';
  if (isBlack(piece)) return 'b';
  return null;
}

// Utility: Find king position for a color
function findKing(bd, color) {
  const king = color === 'w' ? 'K' : 'k';
  for (let r=0; r<8; r++) for (let c=0; c<8; c++) if (bd[r][c] === king) return {r, c};
  return null;
}

// Utility: Deep copy board
function copyBoard(bd) {
  return bd.map(row => row.slice());
}

// --- Move generation and validation ---

// Returns array of {r, c, capture, givesCheck, givesMate}
function getMoves(bd, row, col, onlyLegal=true) {
  const piece = bd[row][col];
  if (!piece) return [];
  const color = pieceColor(piece);
  let dirs = [], maxSteps = 8, results = [];
  function addMove(r, c) {
    if (r < 0 || r > 7 || c < 0 || c > 7) return false;
    const target = bd[r][c];
    if (target && pieceColor(target) === color) return false;
    let move = {r, c, capture: !!target, givesCheck: false, givesMate: false};
    results.push(move);
    return !target;
  }
  switch (piece.toLowerCase()) {
    case 'p': // Pawn
      let dir = color === 'w' ? -1 : 1;
      let startRow = color === 'w' ? 6 : 1;
      // Forward
      if (!bd[row+dir]?.[col]) {
        addMove(row+dir, col);
        if (row === startRow && !bd[row+2*dir]?.[col]) addMove(row+2*dir, col);
      }
      // Captures
      for (let dc of [-1, 1]) {
        let nr = row+dir, nc = col+dc;
        if (bd[nr]?.[nc] && pieceColor(bd[nr][nc]) === otherTurn(color))
          addMove(nr, nc);
      }
      break;
    case 'n': // Knight
      for (let [dr, dc] of [[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[−1,2],[1,−2],[1,2]])
        addMove(row+dr, col+dc);
      break;
    case 'b': // Bishop
      dirs = [[-1,-1],[-1,1],[1,-1],[1,1]];
      for (let [dr, dc] of dirs)
        for (let i=1; i<8; i++) if (!addMove(row+dr*i,col+dc*i)) break;
      break;
    case 'r': // Rook
      dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      for (let [dr, dc] of dirs)
        for (let i=1; i<8; i++) if (!addMove(row+dr*i, col+dc*i)) break;
      break;
    case 'q': // Queen
      dirs = [[-1,-1],[-1,1],[1,-1],[1,1],[1,0],[-1,0],[0,1],[0,-1]];
      for (let [dr, dc] of dirs)
        for (let i=1; i<8; i++) if (!addMove(row+dr*i, col+dc*i)) break;
      break;
    case 'k': // King
      dirs = [[-1,-1],[-1,1],[1,-1],[1,1],[1,0],[-1,0],[0,1],[0,-1]];
      for (let [dr, dc] of dirs) addMove(row+dr, col+dc);
      break;
  }
  // Remove illegal moves (if onlyLegal)
  if (onlyLegal) {
    results = results.filter(move => isLegalMove(bd, row, col, move.r, move.c, color));
    results.forEach(move => {
      move.capture = !!bd[move.r][move.c];
      // Check if gives check or mate
      const newBd = makeMove(copyBoard(bd), row, col, move.r, move.c);
      move.givesCheck = isInCheck(newBd, otherTurn(color));
      move.givesMate = move.givesCheck && isCheckmate(newBd, otherTurn(color));
    });
  }
  return results;
}

// Simulate and check if move leaves own king in check (illegal)
function isLegalMove(bd, sr, sc, tr, tc, color) {
  const testBd = makeMove(copyBoard(bd), sr, sc, tr, tc);
  return !isInCheck(testBd, color);
}
function makeMove(bd, sr, sc, tr, tc) {
  bd[tr][tc] = bd[sr][sc];
  bd[sr][sc] = "";
  return bd;
}
function isInCheck(bd, color) {
  const king = findKing(bd, color);
  if (!king) return true; // No king found (should not happen)
  for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
    if (pieceColor(bd[r][c]) === otherTurn(color)) {
      if (getMoves(bd, r, c, false).some(m => m.r===king.r && m.c===king.c)) return true;
    }
  }
  return false;
}
function isCheckmate(bd, color) {
  if (!isInCheck(bd, color)) return false;
  for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
    if (pieceColor(bd[r][c]) === color) {
      if (getMoves(bd, r, c).length > 0) return false;
    }
  }
  return true;
}

// --- UI/UX rendering: Drag/Drop, Tap, Highlights ---

function createBoard() {
  const boardDiv = document.getElementById('chessboard');
  boardDiv.innerHTML = '';
  const legalSquares = selected ? getMoves(board, selected.row, selected.col) : [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.className = 'square ' + ((row + col) % 2 === 0 ? 'white-square' : 'black-square');
      square.dataset.row = row;
      square.dataset.col = col;
      const piece = board[row][col];
      square.textContent = pieces[piece];

      // Highlights
      if (selected && selected.row === row && selected.col === col) {
        square.style.background = '#ffe066';
      }
      const move = legalSquares.find(m => m.r === row && m.c === col);
      if (move) {
        if (move.capture) square.style.outline = '2px solid red';
        if (move.givesCheck) square.style.background = '#ffd6d6';
        if (move.givesMate) square.style.background = '#ff6666';
        if (!move.capture && !move.givesCheck) square.style.outline = '2px solid #555';
      }

      // King in check
      if (board[row][col].toLowerCase() === 'k' && isInCheck(board, pieceColor(board[row][col]))) {
        square.style.boxShadow = '0 0 10px 4px #f00';
      }

      // Desktop drag & drop
      square.draggable = !!piece && pieceColor(piece) === turn && !checkmated;
      square.ondragstart = e => {
        if (!piece || pieceColor(piece) !== turn || checkmated) return e.preventDefault();
        dragging = true;
        dragStart = {row, col};
        dragPiece = piece;
        selected = {row, col};
        if (e.dataTransfer) e.dataTransfer.setDragImage(square, 25, 25);
        createBoard();
      };
      square.ondragover = e => {
        if (!dragging) return;
        e.preventDefault();
        square.classList.add("dragover");
      };
      square.ondragleave = e => {
        square.classList.remove("dragover");
      };
      square.ondrop = e => {
        if (!dragging) return;
        e.preventDefault();
        handleMove(dragStart.row, dragStart.col, row, col);
        dragging = false;
        dragStart = null;
        dragPiece = null;
        square.classList.remove("dragover");
      };

      // Mobile drag-to-move (touch events)
      square.ontouchstart = e => {
        // If starting a drag from the user's own piece
        if (!piece || pieceColor(piece) !== turn || checkmated) {
          // Fallback: tap-to-move for destination
          if (selected) {
            handleMove(selected.row, selected.col, row, col);
          }
          return;
        }
        e.preventDefault();
        touchDragging = true;
        touchDragStart = {row, col};
        touchDragPiece = piece;
        selected = {row, col};
      };
      square.ontouchmove = e => {
        if (!touchDragging) return;
        e.preventDefault();
        // (Optional: add floating visual feedback here)
      };
      square.ontouchend = e => {
        if (!touchDragging) return;
        e.preventDefault();
        const touch = e.changedTouches[0];
        const targetElem = document.elementFromPoint(touch.clientX, touch.clientY);
        if (targetElem && targetElem.classList.contains('square')) {
          const targetRow = parseInt(targetElem.dataset.row);
          const targetCol = parseInt(targetElem.dataset.col);
          handleMove(touchDragStart.row, touchDragStart.col, targetRow, targetCol);
        }
        touchDragging = false;
        touchDragStart = null;
        touchDragPiece = null;
      };

      // Tap-to-move (always available, also fallback)
      square.onclick = () => {
        if (!selected && piece && pieceColor(piece) === turn && !checkmated) {
          selected = {row, col};
          createBoard();
        } else if (selected) {
          handleMove(selected.row, selected.col, row, col);
        }
      };

      boardDiv.appendChild(square);
    }
  }
  displayStatus();
}

function handleMove(sr, sc, tr, tc) {
  if (checkmated) return;
  const legal = getMoves(board, sr, sc);
  const move = legal.find(m => m.r === tr && m.c === tc);
  if (move) {
    board = makeMove(board, sr, sc, tr, tc);
    selected = null;
    // Check/checkmate logic
    inCheck = isInCheck(board, otherTurn(turn));
    checkmated = isCheckmate(board, otherTurn(turn));
    turn = otherTurn(turn);
    createBoard();
  } else {
    selected = null;
    createBoard();
  }
}

function displayStatus() {
  let status = document.getElementById('status');
  if (!status) {
    status = document.createElement('div');
    status.id = 'status';
    status.style.fontWeight = 'bold';
    status.style.margin = '1em 0';
    document.querySelector('.container').insertBefore(status, document.getElementById('chessboard'));
  }
  if (checkmated) {
    status.textContent = "Checkmate! " + (turn === 'w' ? "Black" : "White") + " wins.";
  } else if (inCheck) {
    status.textContent = (turn === 'w' ? "Black" : "White") + " is in check.";
  } else {
    status.textContent = (turn === 'w' ? "White" : "Black") + "'s turn.";
  }
}

function resetGame() {
  board = JSON.parse(JSON.stringify(startPosition));
  selected = null;
  moves = [];
  turn = 'w';
  inCheck = false;
  checkmated = false;
  createBoard();
}

document.getElementById('reset-btn').onclick = resetGame;

// Initialize
createBoard();
