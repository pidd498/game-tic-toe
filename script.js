(() => {
  const WIN_COMBINATIONS = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  const gameEl = document.getElementById('game');
  const messageEl = document.getElementById('message');
  const restartBtn = document.getElementById('restartBtn');

  let board = Array(9).fill(null);
  let currentPlayer = 'X';
  let active = true;

  // AI settings (will be synced with UI controls)
  let aiEnabled = false;
  let aiDifficulty = 'hard'; // 'easy' or 'hard'
  let humanPlayer = 'X';
  let aiPlayer = 'O';

  // --- NEW: initControls reads UI and listens for changes ---
  function initControls() {
    const aiToggle = document.getElementById('aiToggle');
    const diffSelect = document.getElementById('aiDifficulty');
    const firstSelect = document.getElementById('firstSelect');

    if (!aiToggle || !diffSelect || !firstSelect) {
      // no UI controls present -> keep existing fallback behaviour
      askMode(); // optional: keep prompts for backwards compatibility
      return;
    }

    // read initial values
    aiEnabled = aiToggle.checked;
    aiDifficulty = diffSelect.value || aiDifficulty;
    humanPlayer = (firstSelect.value === 'O') ? 'O' : 'X';
    aiPlayer = humanPlayer === 'X' ? 'O' : 'X';

    // when user changes controls, immediately apply by restarting the game
    const applyChange = () => {
      aiEnabled = aiToggle.checked;
      aiDifficulty = diffSelect.value || aiDifficulty;
      humanPlayer = (firstSelect.value === 'O') ? 'O' : 'X';
      aiPlayer = humanPlayer === 'X' ? 'O' : 'X';
      resetGame();
    };

    aiToggle.addEventListener('change', applyChange);
    diffSelect.addEventListener('change', applyChange);
    firstSelect.addEventListener('change', applyChange);
  }
  // --- END NEW ---

  // ensure 9 .cell elements exist; if not, create them
  function ensureCells() {
    const existing = gameEl.querySelectorAll('.cell');
    if (existing.length === 9) {
      existing.forEach((c, i) => {
        c.dataset.index = i;
        c.classList.remove('winning','disabled');
        c.textContent = '';
        c.removeEventListener('click', onCellClick);
        c.addEventListener('click', onCellClick);
      });
      return Array.from(existing);
    }

    gameEl.innerHTML = '';
    const cells = [];
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.index = i;
      cell.setAttribute('aria-label', `Cell ${i+1}`);
      cell.addEventListener('click', onCellClick);
      gameEl.appendChild(cell);
      cells.push(cell);
    }
    return cells;
  }

  let cells = ensureCells();

  if (restartBtn) restartBtn.addEventListener('click', resetGame);

  // use new controls init
  initControls();
  updateMessage();

  // If AI should start (human is O), let AI move after init
  if (aiEnabled && aiPlayer === 'X') {
    setTimeout(aiMakeMove, 250);
  }

  function onCellClick(e) {
    if (!active) return;
    const idx = Number(e.currentTarget.dataset.index);
    if (isNaN(idx) || board[idx]) return;

    // If AI enabled and it's not human's turn, ignore clicks
    if (aiEnabled && currentPlayer !== humanPlayer) return;

    makeMove(idx, currentPlayer);
    render();

    const winner = checkWinner();
    if (winner) {
      endGame(winner);
      return;
    }

    if (board.every(Boolean)) {
      endGame(null);
      return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateMessage();

    // If now AI's turn, trigger AI move (short delay for UX)
    if (aiEnabled && currentPlayer === aiPlayer) {
      setTimeout(aiMakeMove, 250);
    }
  }

  function makeMove(idx, player) {
    board[idx] = player;
    cells[idx].classList.add('disabled');
  }

  function render() {
    cells.forEach((cell, i) => {
      cell.textContent = board[i] || '';
      cell.classList.toggle('disabled', Boolean(board[i]));
    });
  }

  function checkWinner() {
    for (const combo of WIN_COMBINATIONS) {
      const [a,b,c] = combo;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { player: board[a], combo };
      }
    }
    return null;
  }

  function endGame(result) {
    active = false;
    if (!result) {
      updateMessage('Draw!');
      return;
    }
    const { player, combo } = result;
    updateMessage(`${player} wins!`);
    combo.forEach(i => cells[i].classList.add('winning'));
    cells.forEach(c => c.classList.add('disabled'));
  }

  function resetGame() {
    board = Array(9).fill(null);
    currentPlayer = 'X';
    active = true;
    cells = ensureCells();
    render();
    cells.forEach(c => c.classList.remove('winning','disabled'));
    // re-ask mode only if no UI toggle present
    const aiToggle = document.getElementById('aiToggle');
    if (!aiToggle) askMode();
    updateMessage();
    if (aiEnabled && aiPlayer === 'X') {
      setTimeout(aiMakeMove, 200);
    }
  }

  function updateMessage(text) {
    if (!messageEl) return;
    messageEl.textContent = text || (active ? `${currentPlayer}'s turn` : '');
  }

  // AI move logic
  function aiMakeMove() {
    if (!active) return;
    let idx;
    if (aiDifficulty === 'easy') {
      idx = randomMove();
    } else {
      idx = bestMoveMinimax(board.slice(), aiPlayer, humanPlayer);
    }
    if (idx == null) return;
    makeMove(idx, aiPlayer);
    render();

    const winner = checkWinner();
    if (winner) {
      endGame(winner);
      return;
    }
    if (board.every(Boolean)) {
      endGame(null);
      return;
    }
    currentPlayer = humanPlayer;
    updateMessage();
  }

  function randomMove() {
    const empties = board.map((v,i) => v ? -1 : i).filter(i => i >= 0);
    if (!empties.length) return null;
    return empties[Math.floor(Math.random() * empties.length)];
  }

  // Minimax implementation
  function bestMoveMinimax(b, ai, human) {
    // If board empty, choose center if possible for speed
    if (b.every(v => v === null)) {
      return 4;
    }
    let bestScore = -Infinity;
    let move = null;
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = ai;
      const score = minimax(b, 0, false, ai, human);
      b[i] = null;
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
    return move;
  }

  function minimax(b, depth, isMaximizing, ai, human) {
    const winner = simpleWinner(b);
    if (winner === ai) return 10 - depth;
    if (winner === human) return depth - 10;
    if (b.every(Boolean)) return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (b[i]) continue;
        b[i] = ai;
        const score = minimax(b, depth + 1, false, ai, human);
        b[i] = null;
        bestScore = Math.max(score, bestScore);
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (b[i]) continue;
        b[i] = human;
        const score = minimax(b, depth + 1, true, ai, human);
        b[i] = null;
        bestScore = Math.min(score, bestScore);
      }
      return bestScore;
    }
  }

  // check rows, columns and diagonals for a winner
  function simpleWinner(b) {
    for (const [a,b,c] of WIN_COMBINATIONS) {
      if (b[a] && b[a] === b[b] && b[a] === b[c]) {
        return b[a];
      }
    }
    return null;
  }

  // Keyboard support: allow play using number keys
  document.addEventListener('keydown', e => {
    if (!active || aiEnabled && currentPlayer === aiPlayer) return;
    const num = e.key;
    if (num >= 1 && num <= 9) {
      const idx = num - 1;
      if (!board[idx]) {
        makeMove(idx, currentPlayer);
        render();

        const winner = checkWinner();
        if (winner) {
          endGame(winner);
          return;
        }

        if (board.every(Boolean)) {
          endGame(null);
          return;
        }

        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateMessage();

        // If now AI's turn, trigger AI move (short delay for UX)
        if (aiEnabled && currentPlayer === aiPlayer) {
          setTimeout(aiMakeMove, 250);
        }
      }
    }
  });
})();