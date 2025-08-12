// Global variables
let socket;
let currentGame = null;
let selectedSquare = null;
let playerColor = null;
let gameTimer = null;

// Initialize captured pieces tracking
let capturedPieces = {
    white: {},
    black: {}
};

const pieceValues = {
    'p': 1, 'P': 1, // Pawn
    'r': 5, 'R': 5, // Rook
    'n': 3, 'N': 3, // Knight
    'b': 3, 'B': 3, // Bishop
    'q': 9, 'Q': 9, // Queen
    'k': 0, 'K': 0  // King (no value)
};

const pieceIcons = {
    'p': '♟', 'P': '♙', // Pawn
    'r': '♜', 'R': '♖', // Rook
    'n': '♞', 'N': '♘', // Knight
    'b': '♝', 'B': '♗', // Bishop
    'q': '♛', 'Q': '♕', // Queen
    'k': '♚', 'K': '♔'  // King
};

// Function to update captured pieces display
function updateCapturedPieces() {
    const p1Container = document.getElementById('p1Captured');  // Player (bottom)
    const p2Container = document.getElementById('p2Captured');  // Opponent (top)
    const p1Advantage = document.getElementById('p1Advantage'); // Player advantage
    const p2Advantage = document.getElementById('p2Advantage'); // Opponent advantage
    
    console.log('Updating captured pieces:', capturedPieces);
    
    if (!p1Container || !p2Container) {
        console.error('Captured pieces containers not found');
        return;
    }
    
    // Hide captures if game hasn't started
    const capturedContainers = document.querySelectorAll('.captured-pieces-container');
    if (!currentGame || currentGame.gameState === 'waiting' || !currentGame.moveHistory || currentGame.moveHistory.length === 0) {
        capturedContainers.forEach(container => container.style.display = 'none');
        return;
    } else {
        capturedContainers.forEach(container => container.style.display = 'block');
    }
    
    // Clear containers
    p1Container.innerHTML = '';
    p2Container.innerHTML = '';
    
    // Determine player colors
    const myPlayer = currentGame.players.find(p => p.id === socket.id);
    const isPlayerWhite = myPlayer && myPlayer.color === 'white';
    
    // Calculate material values
    let playerCapturedValue = 0;
    let opponentCapturedValue = 0;
    
    // Player captured pieces (what player has taken) - shown at bottom
    const playerCapturedPieces = isPlayerWhite ? capturedPieces.black : capturedPieces.white;
    Object.entries(playerCapturedPieces).forEach(([piece, count]) => {
        if (count > 0) {
            console.log(`Player captured: ${piece} x${count}`);
            const pieceElement = document.createElement('div');
            pieceElement.className = `captured-piece ${piece === piece.toUpperCase() ? 'white-piece' : 'black-piece'}`;
            pieceElement.innerHTML = `
                <span class="captured-piece-icon">${pieceIcons[piece] || piece}</span>
                ${count > 1 ? `<span class="captured-piece-count">${count}</span>` : ''}
            `;
            p1Container.appendChild(pieceElement);
            playerCapturedValue += pieceValues[piece] * count;
        }
    });
    
    // Opponent captured pieces (what opponent has taken) - shown at top
    const opponentCapturedPieces = isPlayerWhite ? capturedPieces.white : capturedPieces.black;
    Object.entries(opponentCapturedPieces).forEach(([piece, count]) => {
        if (count > 0) {
            console.log(`Opponent captured: ${piece} x${count}`);
            const pieceElement = document.createElement('div');
            pieceElement.className = `captured-piece ${piece === piece.toUpperCase() ? 'white-piece' : 'black-piece'}`;
            pieceElement.innerHTML = `
                <span class="captured-piece-icon">${pieceIcons[piece] || piece}</span>
                ${count > 1 ? `<span class="captured-piece-count">${count}</span>` : ''}
            `;
            p2Container.appendChild(pieceElement);
            opponentCapturedValue += pieceValues[piece] * count;
        }
    });
    
    // Update advantage display with point difference
    const playerAdvantage = playerCapturedValue - opponentCapturedValue;
    const opponentAdvantage = opponentCapturedValue - playerCapturedValue;
    
    console.log(`Material difference: Player +${playerAdvantage}, Opponent +${opponentAdvantage}`);
    
    // Update player advantage (bottom)
    if (playerAdvantage > 0) {
        p1Advantage.textContent = `+${playerAdvantage}`;
        p1Advantage.className = `player-advantage ${isPlayerWhite ? 'white' : 'black'}`;
    } else {
        p1Advantage.textContent = '';
        p1Advantage.className = `player-advantage ${isPlayerWhite ? 'white' : 'black'} neutral`;
    }
    
    // Update opponent advantage (top)
    if (opponentAdvantage > 0) {
        p2Advantage.textContent = `+${opponentAdvantage}`;
        p2Advantage.className = `player-advantage ${isPlayerWhite ? 'black' : 'white'}`;
    } else {
        p2Advantage.textContent = '';
        p2Advantage.className = `player-advantage ${isPlayerWhite ? 'black' : 'white'} neutral`;
    }
}

// Function to track piece capture
function trackPieceCapture(capturedPiece) {
    if (!capturedPiece || capturedPiece === ' ') return;
    
    const isWhite = capturedPiece === capturedPiece.toUpperCase();
    const pieceType = capturedPiece.toLowerCase();
    
    if (isWhite) {
        capturedPieces.white[capturedPiece] = (capturedPieces.white[capturedPiece] || 0) + 1;
    } else {
        capturedPieces.black[capturedPiece] = (capturedPieces.black[capturedPiece] || 0) + 1;
    }
    
    updateCapturedPieces();
}

// Function to reset captured pieces
function resetCapturedPieces() {
    capturedPieces = {
        white: {},
        black: {}
    };
    updateCapturedPieces();
}

// Function to track board differences and detect captures
function trackBoardDifferences(oldBoard, newBoard) {
    // Validate inputs
    if (!oldBoard || !newBoard || !Array.isArray(oldBoard) || !Array.isArray(newBoard)) {
        console.error('Invalid board data for capture tracking');
        return;
    }
    
    if (oldBoard.length !== 8 || newBoard.length !== 8) {
        console.error('Invalid board dimensions');
        return;
    }
    
    // Count pieces on both boards
    const oldPieces = {};
    const newPieces = {};
    
    // Count pieces in old board
    for (let row = 0; row < 8; row++) {
        if (!Array.isArray(oldBoard[row]) || oldBoard[row].length !== 8) {
            console.error(`Invalid old board row ${row}`);
            continue;
        }
        for (let col = 0; col < 8; col++) {
            const piece = oldBoard[row][col];
            if (piece && piece !== ' ' && typeof piece === 'string') {
                oldPieces[piece] = (oldPieces[piece] || 0) + 1;
            }
        }
    }
    
    // Count pieces in new board
    for (let row = 0; row < 8; row++) {
        if (!Array.isArray(newBoard[row]) || newBoard[row].length !== 8) {
            console.error(`Invalid new board row ${row}`);
            continue;
        }
        for (let col = 0; col < 8; col++) {
            const piece = newBoard[row][col];
            if (piece && piece !== ' ' && typeof piece === 'string') {
                newPieces[piece] = (newPieces[piece] || 0) + 1;
            }
        }
    }
    
    // Find captured pieces by comparing counts
    for (const piece in oldPieces) {
        const oldCount = oldPieces[piece];
        const newCount = newPieces[piece] || 0;
        const capturedCount = oldCount - newCount;
        
        if (capturedCount > 0) {
            const isWhite = piece === piece.toUpperCase();
            if (isWhite) {
                capturedPieces.white[piece] = (capturedPieces.white[piece] || 0) + capturedCount;
            } else {
                capturedPieces.black[piece] = (capturedPieces.black[piece] || 0) + capturedCount;
            }
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeSocket();
    updateTime();
    setInterval(updateTime, 1000);
    
    // Only load questions and comments if the DOM elements exist (for StackOverflow platform)
    if (document.getElementById('questionsList')) {
        loadQuestions();
    }
    if (document.getElementById('commentsContainer')) {
        loadComments();
    }
    
    initializeEventListeners();
    initializeChessBoard();
    
    // Initialize captured pieces display (hidden by default)
    const capturedContainers = document.querySelectorAll('.captured-pieces-container');
    capturedContainers.forEach(container => container.style.display = 'none');
    updateCapturedPieces();
    
    // Check for game ID in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const gameIdFromUrl = urlParams.get('gameId');
    if (gameIdFromUrl) {
        document.getElementById('gameId').value = gameIdFromUrl;
        showNotification('Game ID loaded from invite link! Enter your name and click Play Now.', 'info');
    }
});

// Socket.IO initialization
function initializeSocket() {
    try {
        socket = io();
        
        // Add connection error handling
        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            showNotification('Connection error. Please refresh the page.', 'error');
        });
        
        socket.on('disconnect', (reason) => {
            console.warn('Socket disconnected:', reason);
            showNotification('Connection lost. Attempting to reconnect...', 'warning');
        });
        
        socket.on('reconnect', () => {
            console.log('Socket reconnected');
            showNotification('Reconnected successfully!', 'success');
        });
    
    socket.on('game-update', (game) => {
        try {
            if (!game || typeof game !== 'object') {
                console.error('Invalid game data received');
                return;
            }
            
            const wasMyTurn = currentGame && currentGame.gameState === 'active' && 
                             currentGame.players.find(p => p.id === socket.id && currentGame.currentPlayer === p.color);
            const isNowMyTurn = game.gameState === 'active' && 
                               game.players.find(p => p.id === socket.id && game.currentPlayer === p.color);
            
            currentGame = game;
            updateGameDisplay(game);
            
            // Show turn notification if board is collapsed and it's my turn
            if (!wasMyTurn && isNowMyTurn) {
                const adLabel = document.querySelector('.game-label');
                if (adLabel && adLabel.classList.contains('collapsed')) {
                    showTurnNotificationIndicator();
                    showNotification("It's your turn!", 'turn');
                }
            }
            
            // Clear turn notification if it's not my turn anymore
            if (wasMyTurn && !isNowMyTurn) {
                clearTurnNotificationIndicator();
            }
        } catch (error) {
            console.error('Error processing game update:', error);
            showNotification('Error updating game. Please refresh.', 'error');
        }
    });
    
    socket.on('new-comment', (comment) => {
        addCommentToDisplay(comment);
        updateCommentsCount();
    });
    
    socket.on('new-message', (message) => {
        addMessageToChat(message);
        markMessagesAsRead([message.id]);
    });
    
    socket.on('messages-read', (data) => {
        updateMessageReadStatus(data.messageIds, data.readBy);
    });
    
    socket.on('game-ended', (data) => {
        showNotification(`Game ended: ${data.reason}`, 'game-end');
        stopGameTimer();
    });
    
    socket.on('replay-offer', (data) => {
        showNotification(`${data.fromPlayer} wants to replay!`, 'replay-offer');
    });
    
    socket.on('replay-declined', (data) => {
        showNotification(`${data.fromPlayer} declined the replay`, 'replay-declined');
        const replayBtn = document.getElementById('replayBtn');
        if (replayBtn) {
            replayBtn.disabled = false;
            replayBtn.textContent = '🔄 Replay';
        }
    });
    
    socket.on('spectator-joined', (data) => {
        showNotification(`${data.spectatorName} is now watching`, 'spectator');
    });
    
    socket.on('spectator-left', (data) => {
        showNotification(`${data.spectatorName} stopped watching`, 'spectator');
    });
    
    socket.on('chess-analysis', (analysis) => {
        showChessAnalysis(analysis);
    });
    
    socket.on('invite-url-generated', (data) => {
        showInviteUrlModal(data.inviteUrl);
    });
    
    socket.on('possible-moves', (data) => {
        highlightPossibleMoves(data.square, data.moves);
    });
    
    socket.on('draw-offer-denied', (data) => {
        showNotification(data.reason, 'error');
    });
    
    socket.on('message-error', (data) => {
        showNotification(data.error, 'error');
    });
    
    } catch (error) {
        console.error('Error initializing socket:', error);
        showNotification('Failed to connect to server. Please refresh.', 'error');
    }
}

// Time display
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('timeDisplay').textContent = timeString;
}

// Event listeners
function initializeEventListeners() {
    // Ask Question Modal
    document.getElementById('askQuestionBtn').addEventListener('click', openQuestionModal);
    document.getElementById('closeModal').addEventListener('click', closeQuestionModal);
    document.getElementById('cancelQuestion').addEventListener('click', closeQuestionModal);
    document.getElementById('questionForm').addEventListener('submit', submitQuestion);
    
    // Chess Game
    document.getElementById('joinGameBtn').addEventListener('click', joinGame);
    document.getElementById('resignBtn').addEventListener('click', resignGame);
    document.getElementById('drawBtn').addEventListener('click', offerDraw);
    document.getElementById('acceptDrawBtn').addEventListener('click', () => respondToDraw(true));
    document.getElementById('declineDrawBtn').addEventListener('click', () => respondToDraw(false));
    
    // Replay functionality
    const replayBtn = document.getElementById('replayBtn');
    if (replayBtn) {
        replayBtn.addEventListener('click', offerReplay);
    }
    
    // Enhanced Chat functionality with validation
    setupInputValidation();
    document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Comments
    document.getElementById('sendCommentBtn').addEventListener('click', sendComment);
    document.getElementById('commentContent').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendComment();
        }
    });
    
    // Modal outside click
    document.getElementById('askQuestionModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeQuestionModal();
        }
    });
    
    // Settings dropdown functionality
    setupSettingsDropdown();
    
    // Collapsible sections
    initializeCollapsibleSections();
}

// Chess Board Initialization
function initializeChessBoard() {
    const board = document.getElementById('chessBoard');
    board.innerHTML = '';
    
    const initialBoard = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `chess-square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            square.dataset.square = String.fromCharCode(97 + col) + (8 - row);
            
            const piece = initialBoard[row][col];
            if (piece) {
                const pieceElement = document.createElement('div');
                pieceElement.className = `chess-piece ${piece === piece.toUpperCase() ? 'white' : 'black'} ${getPieceName(piece)}`;
                square.appendChild(pieceElement);
            }
            
            square.addEventListener('click', () => handleSquareClick(square));
            board.appendChild(square);
        }
    }
}

function getPieceName(piece) {
    const pieces = {
        'k': 'king', 'q': 'queen', 'r': 'rook', 
        'b': 'bishop', 'n': 'knight', 'p': 'pawn',
        'K': 'king', 'Q': 'queen', 'R': 'rook', 
        'B': 'bishop', 'N': 'knight', 'P': 'pawn'
    };
    return pieces[piece] || '';
}

function handleSquareClick(square) {
    if (!currentGame || currentGame.gameState !== 'active') return;
    
    const player = currentGame.players.find(p => p.id === socket.id);
    if (!player || currentGame.currentPlayer !== player.color) return;
    
    if (selectedSquare) {
        if (selectedSquare === square) {
            // Deselect
            selectedSquare.classList.remove('selected');
            selectedSquare = null;
            clearPossibleMoves();
        } else if (square.classList.contains('possible-move') || square.classList.contains('capture-move')) {
            // Make move to valid square
            const from = selectedSquare.dataset.square;
            const to = square.dataset.square;
            
            // Check if this is a pawn promotion
            const piece = selectedSquare.querySelector('.chess-piece');
            const isPawn = piece && piece.classList.contains('pawn');
            const toRow = parseInt(to[1]) - 1;
            const isPromotion = isPawn && ((piece.classList.contains('white') && toRow === 7) || 
                                        (piece.classList.contains('black') && toRow === 0));
            
            if (isPromotion) {
                const color = piece.classList.contains('white') ? 'white' : 'black';
                showPromotionDialog(color, (promotionPiece) => {
                    socket.emit('make-move', {
                        gameId: currentGame.id,
                        from: from,
                        to: to,
                        promotion: promotionPiece
                    });
                });
            } else {
                socket.emit('make-move', {
                    gameId: currentGame.id,
                    from: from,
                    to: to
                });
            }
            
            selectedSquare.classList.remove('selected');
            selectedSquare = null;
            clearPossibleMoves();
        } else {
            // Select different piece
            const piece = square.querySelector('.chess-piece');
            if (piece) {
                const isWhitePiece = piece.classList.contains('white');
                const playerIsWhite = player.color === 'white';
                
                if (isWhitePiece === playerIsWhite) {
                    selectedSquare.classList.remove('selected');
                    clearPossibleMoves();
                    selectedSquare = square;
                    square.classList.add('selected');
                    
                    // Request possible moves from server
                    socket.emit('get-possible-moves', {
                        gameId: currentGame.id,
                        square: square.dataset.square
                    });
                }
            } else {
                // Clicked on empty square while having selection
                selectedSquare.classList.remove('selected');
                selectedSquare = null;
                clearPossibleMoves();
            }
        }
    } else {
        // No piece selected, try to select
        const piece = square.querySelector('.chess-piece');
        if (piece) {
            const isWhitePiece = piece.classList.contains('white');
            const playerIsWhite = player.color === 'white';
            
            if (isWhitePiece === playerIsWhite) {
                selectedSquare = square;
                square.classList.add('selected');
                
                // Request possible moves from server
                socket.emit('get-possible-moves', {
                    gameId: currentGame.id,
                    square: square.dataset.square
                });
            }
        }
    }
}

function showPossibleMoves(square) {
    if (!currentGame || currentGame.gameState !== 'active') return;
    
    const player = currentGame.players.find(p => p.id === socket.id);
    if (!player || currentGame.currentPlayer !== player.color) return;
    
    const from = square.dataset.square;
    const piece = square.querySelector('.chess-piece');
    if (!piece) return;
    
    // Clear previous highlights
    clearPossibleMoves();
    
    // Get piece type and color
    const pieceClasses = piece.className.split(' ');
    const isWhite = pieceClasses.includes('white');
    const pieceType = pieceClasses.find(cls => ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'].includes(cls));
    
    // Calculate possible moves based on piece type
    const possibleMoves = calculatePossibleMoves(from, pieceType, isWhite, currentGame.board);
    
    // Highlight valid moves
    possibleMoves.forEach(move => {
        const targetSquare = document.querySelector(`[data-square="${move}"]`);
        if (targetSquare) {
            targetSquare.classList.add('possible-move');
            
            // Add capture indicator for squares with opponent pieces
            const targetPiece = targetSquare.querySelector('.chess-piece');
            if (targetPiece) {
                const targetIsWhite = targetPiece.classList.contains('white');
                if (targetIsWhite !== isWhite) {
                    targetSquare.classList.add('capture-move');
                }
            }
        }
    });
}

function calculatePossibleMoves(from, pieceType, isWhite, board) {
    const fromCol = from.charCodeAt(0) - 97; // a=0, b=1, etc.
    const fromRow = parseInt(from[1]) - 1;   // 1=0, 2=1, etc.
    
    const moves = [];
    
    switch (pieceType) {
        case 'pawn':
            moves.push(...calculatePawnMoves(fromRow, fromCol, isWhite, board));
            break;
        case 'rook':
            moves.push(...calculateRookMoves(fromRow, fromCol, isWhite, board));
            break;
        case 'knight':
            moves.push(...calculateKnightMoves(fromRow, fromCol, isWhite, board));
            break;
        case 'bishop':
            moves.push(...calculateBishopMoves(fromRow, fromCol, isWhite, board));
            break;
        case 'queen':
            moves.push(...calculateQueenMoves(fromRow, fromCol, isWhite, board));
            break;
        case 'king':
            moves.push(...calculateKingMoves(fromRow, fromCol, isWhite, board));
            break;
    }
    
    // Filter moves that would leave king in check
    return moves.filter(move => {
        return isValidMoveClient(from, move, isWhite ? 'white' : 'black', board);
    });
}

function calculatePawnMoves(fromRow, fromCol, isWhite, board) {
    const moves = [];
    const direction = isWhite ? 1 : -1;
    const startRow = isWhite ? 1 : 6;
    
    // Forward moves
    const oneStep = fromRow + direction;
    if (oneStep >= 0 && oneStep <= 7) {
        const oneStepSquare = String.fromCharCode(97 + fromCol) + (oneStep + 1);
        if (isSquareEmpty(oneStep, fromCol, board)) {
            moves.push(oneStepSquare);
            
            // Two-step from starting position
            if (fromRow === startRow) {
                const twoStep = fromRow + (2 * direction);
                if (twoStep >= 0 && twoStep <= 7 && isSquareEmpty(twoStep, fromCol, board)) {
                    const twoStepSquare = String.fromCharCode(97 + fromCol) + (twoStep + 1);
                    moves.push(twoStepSquare);
                }
            }
        }
    }
    
    // Diagonal captures
    [-1, 1].forEach(colOffset => {
        const newCol = fromCol + colOffset;
        const newRow = fromRow + direction;
        if (newCol >= 0 && newCol <= 7 && newRow >= 0 && newRow <= 7) {
            if (isSquareOccupiedByOpponent(newRow, newCol, isWhite, board)) {
                const captureSquare = String.fromCharCode(97 + newCol) + (newRow + 1);
                moves.push(captureSquare);
            }
            
            // En passant capture
            if (currentGame && currentGame.lastMove) {
                const lastMove = currentGame.lastMove;
                const lastFromRow = parseInt(lastMove.from[1]) - 1;
                const lastToRow = parseInt(lastMove.to[1]) - 1;
                const lastToCol = lastMove.to.charCodeAt(0) - 97;
                
                // Check if last move was pawn moving two squares
                if (lastMove.piece && lastMove.piece.toLowerCase() === 'p' && 
                    Math.abs(lastToRow - lastFromRow) === 2 &&
                    lastToCol === newCol && // Same column as target
                    lastToRow === fromRow && // Adjacent row
                    newRow === (isWhite ? 5 : 2)) { // En passant target row
                    const enPassantSquare = String.fromCharCode(97 + newCol) + (newRow + 1);
                    moves.push(enPassantSquare);
                }
            }
        }
    });
    
    return moves;
}

function calculateRookMoves(fromRow, fromCol, isWhite, board) {
    const moves = [];
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    
    directions.forEach(([rowDir, colDir]) => {
        for (let i = 1; i < 8; i++) {
            const newRow = fromRow + (rowDir * i);
            const newCol = fromCol + (colDir * i);
            
            if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) break;
            
            if (isSquareEmpty(newRow, newCol, board)) {
                moves.push(String.fromCharCode(97 + newCol) + (newRow + 1));
            } else if (isSquareOccupiedByOpponent(newRow, newCol, isWhite, board)) {
                moves.push(String.fromCharCode(97 + newCol) + (newRow + 1));
                break;
            } else {
                break; // Own piece
            }
        }
    });
    
    return moves;
}

function calculateKnightMoves(fromRow, fromCol, isWhite, board) {
    const moves = [];
    const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    
    knightMoves.forEach(([rowOffset, colOffset]) => {
        const newRow = fromRow + rowOffset;
        const newCol = fromCol + colOffset;
        
        if (newRow >= 0 && newRow <= 7 && newCol >= 0 && newCol <= 7) {
            if (isSquareEmpty(newRow, newCol, board) || 
                isSquareOccupiedByOpponent(newRow, newCol, isWhite, board)) {
                moves.push(String.fromCharCode(97 + newCol) + (newRow + 1));
            }
        }
    });
    
    return moves;
}

function calculateBishopMoves(fromRow, fromCol, isWhite, board) {
    const moves = [];
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    
    directions.forEach(([rowDir, colDir]) => {
        for (let i = 1; i < 8; i++) {
            const newRow = fromRow + (rowDir * i);
            const newCol = fromCol + (colDir * i);
            
            if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) break;
            
            if (isSquareEmpty(newRow, newCol, board)) {
                moves.push(String.fromCharCode(97 + newCol) + (newRow + 1));
            } else if (isSquareOccupiedByOpponent(newRow, newCol, isWhite, board)) {
                moves.push(String.fromCharCode(97 + newCol) + (newRow + 1));
                break;
            } else {
                break; // Own piece
            }
        }
    });
    
    return moves;
}

function calculateQueenMoves(fromRow, fromCol, isWhite, board) {
    return [
        ...calculateRookMoves(fromRow, fromCol, isWhite, board),
        ...calculateBishopMoves(fromRow, fromCol, isWhite, board)
    ];
}

function calculateKingMoves(fromRow, fromCol, isWhite, board) {
    const moves = [];
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];
    
    // Regular king moves
    directions.forEach(([rowOffset, colOffset]) => {
        const newRow = fromRow + rowOffset;
        const newCol = fromCol + colOffset;
        
        if (newRow >= 0 && newRow <= 7 && newCol >= 0 && newCol <= 7) {
            if (isSquareEmpty(newRow, newCol, board) || 
                isSquareOccupiedByOpponent(newRow, newCol, isWhite, board)) {
                
                // Check if this move would put king in check
                const moveNotation = String.fromCharCode(97 + newCol) + (newRow + 1);
                const fromNotation = String.fromCharCode(97 + fromCol) + (fromRow + 1);
                
                // Only add move if it's valid (server will do final validation)
                if (isValidMoveClient(fromNotation, moveNotation, isWhite ? 'white' : 'black', board)) {
                    moves.push(moveNotation);
                }
            }
        }
    });
    
    // Castling moves - only if king is on starting position
    if (fromRow === (isWhite ? 0 : 7) && fromCol === 4) {
        const kingPiece = isWhite ? 'K' : 'k';
        const rookPiece = isWhite ? 'R' : 'r';
        
        // Check if king is on correct starting position
        if (board[7 - fromRow][fromCol] === kingPiece) {
            // Kingside castling
            if (board[7 - fromRow][7] === rookPiece) {
                // Check if path is clear
                if (isSquareEmpty(fromRow, 5, board) && isSquareEmpty(fromRow, 6, board)) {
                    // Basic check - server will validate properly including check rules
                    moves.push(String.fromCharCode(97 + 6) + (fromRow + 1)); // King to g1/g8
                }
            }
            
            // Queenside castling
            if (board[7 - fromRow][0] === rookPiece) {
                // Check if path is clear
                if (isSquareEmpty(fromRow, 1, board) && isSquareEmpty(fromRow, 2, board) && isSquareEmpty(fromRow, 3, board)) {
                    // Basic check - server will validate properly including check rules
                    moves.push(String.fromCharCode(97 + 2) + (fromRow + 1)); // King to c1/c8
                }
            }
        }
    }
    
    return moves;
}

function isSquareEmpty(row, col, board) {
    if (!board || !board[7 - row]) return true;
    return board[7 - row][col] === null || board[7 - row][col] === undefined;
}

function isSquareOccupiedByOpponent(row, col, isWhite, board) {
    if (!board || !board[7 - row]) return false;
    const piece = board[7 - row][col];
    if (!piece) return false;
    
    const pieceIsWhite = piece === piece.toUpperCase();
    return pieceIsWhite !== isWhite;
}

function isValidMoveClient(from, to, playerColor, board) {
    // Basic client-side validation (server will do final validation)
    const fromRow = parseInt(from[1]) - 1;
    const fromCol = from.charCodeAt(0) - 97;
    const toRow = parseInt(to[1]) - 1;
    const toCol = to.charCodeAt(0) - 97;
    
    // Check bounds
    if (fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 ||
        toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) {
        return false;
    }
    
    if (!board || !board[7 - fromRow]) return false;
    const piece = board[7 - fromRow][fromCol];
    if (!piece) return false;
    
    const isWhitePiece = piece === piece.toUpperCase();
    if ((playerColor === 'white' && !isWhitePiece) || (playerColor === 'black' && isWhitePiece)) {
        return false;
    }
    
    // Can't capture own piece
    const targetPiece = board[7 - toRow] ? board[7 - toRow][toCol] : null;
    if (targetPiece) {
        const isTargetWhite = targetPiece === targetPiece.toUpperCase();
        if (isWhitePiece === isTargetWhite) {
            return false;
        }
    }
    
    return true;
}

function clearPossibleMoves() {
    document.querySelectorAll('.possible-move').forEach(square => {
        square.classList.remove('possible-move');
    });
    
    document.querySelectorAll('.capture-move').forEach(square => {
        square.classList.remove('capture-move');
    });
}

function highlightPossibleMoves(sourceSquare, moves) {
    clearPossibleMoves();
    
    moves.forEach(move => {
        const targetSquare = document.querySelector(`[data-square="${move.to}"]`);
        if (targetSquare) {
            if (move.isCapture) {
                targetSquare.classList.add('capture-move');
            } else {
                targetSquare.classList.add('possible-move');
            }
        }
    });
}

function updateGameDisplay(game) {
    const previousCurrentPlayer = currentGame ? currentGame.currentPlayer : null;
    const previousGameState = currentGame ? currentGame.gameState : null;
    
    // Update player color reference
    const myPlayer = game.players.find(p => p.id === socket.id);
    if (myPlayer && myPlayer.color !== playerColor) {
        playerColor = myPlayer.color;
        // Flip board if player is black
        flipBoardIfNeeded();
    }
    
    // If this is a new game or replay, reset captured pieces
    if (!currentGame || 
        (currentGame.id !== game.id) || 
        (previousGameState === 'finished' && game.gameState === 'active') ||
        (game.moveHistory && game.moveHistory.length === 0) ||
        game.gameState === 'waiting') {
        resetCapturedPieces();
        console.log('Captured pieces reset for new/replay game');
        
        // Hide captured pieces containers for new games
        const capturedContainers = document.querySelectorAll('.captured-pieces-container');
        capturedContainers.forEach(container => container.style.display = 'none');
    }
    
    // Update player names and spectator list
    const whitePlayer = game.players.find(p => p.color === 'white');
    const blackPlayer = game.players.find(p => p.color === 'black');
    
    document.getElementById('whitePlayerName').textContent = whitePlayer ? whitePlayer.name : 'Waiting...';
    document.getElementById('blackPlayerName').textContent = blackPlayer ? blackPlayer.name : 'Waiting...';
    
    // Update spectators display
    updateSpectatorsDisplay(game.spectators || []);
    
    // Update timers with warnings
    updateTimerDisplay('whiteTime', game.whiteTime);
    updateTimerDisplay('blackTime', game.blackTime);
    
    // Update game controls visibility
    updateGameControlsVisibility(game.gameState);
    
    // Update game status
    const statusElement = document.getElementById('gameStatus');
    const gameActionsElement = document.getElementById('gameActions');
    const drawOfferElement = document.getElementById('drawOffer');
    const joinBtnElement = document.getElementById('joinGameBtn');
    const replayBtnElement = document.getElementById('replayBtn');
    
    // Clear previous status classes
    statusElement.className = 'game-status-mini';
    
    // Turn change animation
    if (previousCurrentPlayer && previousCurrentPlayer !== game.currentPlayer && game.gameState === 'active') {
        statusElement.classList.add('turn-change-animation');
        setTimeout(() => statusElement.classList.remove('turn-change-animation'), 600);
        
        // Show turn notification
        showNotification(`${game.currentPlayer.charAt(0).toUpperCase() + game.currentPlayer.slice(1)}'s turn`, 'turn');
    }
    
    switch (game.gameState) {
        case 'waiting':
            statusElement.textContent = 'Waiting for opponent...';
            gameActionsElement.style.display = 'none';
            drawOfferElement.style.display = 'none';
            joinBtnElement.style.display = 'block';
            break;
            
        case 'active':
            let statusText = `${game.currentPlayer}'s turn`;
            
            if (game.inCheck) {
                statusText += ' - Check!';
                statusElement.classList.add('check', 'check-flash');
                highlightKingInCheck(game.currentPlayer);
                showNotification('Check!', 'check');
                setTimeout(() => statusElement.classList.remove('check-flash'), 2400);
            } else {
                // Clear check highlights when not in check
                clearCheckHighlights();
            }
            
            statusElement.textContent = statusText;
            gameActionsElement.style.display = 'flex';
            joinBtnElement.style.display = 'none';
            
            // Handle draw offers
            const player = game.players.find(p => p.id === socket.id);
            if (game.drawOffer && player && game.drawOffer !== player.color) {
                drawOfferElement.style.display = 'block';
            } else {
                drawOfferElement.style.display = 'none';
            }
            
            startGameTimer(game);
            break;
            
        case 'finished':
            let endText = '';
            if (game.winner === 'draw') {
                endText = `Draw by ${game.endReason}`;
                statusElement.classList.add('draw');
            } else {
                endText = `${game.winner} wins`;
                if (game.endReason === 'checkmate') {
                    endText += ' by checkmate!';
                    statusElement.classList.add('checkmate');
                } else if (game.endReason === 'timeout') {
                    endText += ' on time!';
                } else if (game.endReason === 'resignation') {
                    endText += ' by resignation!';
                }
            }
            
            statusElement.textContent = endText;
            gameActionsElement.style.display = 'none';
            drawOfferElement.style.display = 'none';
            joinBtnElement.style.display = 'none';
            
            // Show replay button for players
            const currentPlayer = game.players.find(p => p.id === socket.id);
            if (currentPlayer && replayBtnElement) {
                replayBtnElement.style.display = 'block';
                
                // Show replay offer status
                if (game.replayOffer) {
                    if (game.replayOffer.from === socket.id) {
                        replayBtnElement.textContent = 'Replay Offered';
                        replayBtnElement.disabled = true;
                    } else {
                        // Show accept/decline buttons for the recipient
                        showReplayOfferDialog(game.replayOffer.from);
                    }
                } else {
                    replayBtnElement.textContent = '🔄 Replay';
                    replayBtnElement.disabled = false;
                }
            } else if (!currentPlayer) {
                // Show join next game button for spectators
                joinBtnElement.style.display = 'block';
                joinBtnElement.textContent = 'Join Next Game';
            }
            
            stopGameTimer();
            break;
            
        case 'abandoned':
            statusElement.textContent = 'Game abandoned';
            gameActionsElement.style.display = 'none';
            drawOfferElement.style.display = 'none';
            
            // Show replay button for players, even if game was abandoned
            const abandonedPlayer = game.players.find(p => p.id === socket.id);
            if (abandonedPlayer && replayBtnElement) {
                replayBtnElement.style.display = 'block';
                
                // Show replay offer status
                if (game.replayOffer) {
                    if (game.replayOffer.from === socket.id) {
                        replayBtnElement.textContent = 'Replay Offered';
                        replayBtnElement.disabled = true;
                    } else {
                        // Show accept/decline buttons for the recipient
                        showReplayOfferDialog(game.replayOffer.from);
                    }
                } else {
                    replayBtnElement.innerHTML = '<i class="fas fa-repeat"></i> Replay';
                    replayBtnElement.disabled = false;
                }
            } else if (!abandonedPlayer) {
                // Show join next game button for spectators
                joinBtnElement.style.display = 'block';
                joinBtnElement.textContent = 'Join Next Game';
            }
            
            stopGameTimer();
            break;
    }
    
    // Update board
    updateChessBoard(game.board);
    
    // Update captured pieces display
    updateCapturedPieces();
    
    // Highlight last move
    if (game.lastMove) {
        highlightLastMove(game.lastMove);
    }
    
    // Update move history
    updateMoveHistory(game);
    
    // Show/hide chat and move history based on game state
    const moveHistoryElement = document.getElementById('moveHistory');
    const gameChatElement = document.getElementById('gameChat');
    
    if (game.gameState === 'active' || game.gameState === 'finished') {
        gameChatElement.style.display = 'block';
        if (game.moveHistory && game.moveHistory.length > 0) {
            moveHistoryElement.style.display = 'block';
        }
        
        // Load existing messages if they exist
        if (game.messages) {
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.innerHTML = '';
            game.messages.forEach(message => {
                addMessageToChat(message);
            });
        }
    } else {
        gameChatElement.style.display = 'none';
        moveHistoryElement.style.display = 'none';
    }
}

function highlightKingInCheck(color) {
    // Clear all existing check highlights first
    clearCheckHighlights();
    
    const squares = document.querySelectorAll('.chess-square');
    squares.forEach(square => {
        const piece = square.querySelector('.chess-piece');
        if (piece && piece.classList.contains('king')) {
            const isWhiteKing = piece.classList.contains('white');
            if ((color === 'white' && isWhiteKing) || (color === 'black' && !isWhiteKing)) {
                square.classList.add('check-square');
            }
        }
    });
}

function clearCheckHighlights() {
    document.querySelectorAll('.check-square').forEach(square => {
        square.classList.remove('check-square');
    });
}

function highlightLastMove(lastMove) {
    // Clear all previous last-move highlights
    document.querySelectorAll('.last-move').forEach(square => {
        square.classList.remove('last-move');
    });
    
    // Highlight the new last move
    if (lastMove && lastMove.from && lastMove.to) {
        const fromSquare = document.querySelector(`[data-square="${lastMove.from}"]`);
        const toSquare = document.querySelector(`[data-square="${lastMove.to}"]`);
        
        if (fromSquare) fromSquare.classList.add('last-move');
        if (toSquare) toSquare.classList.add('last-move');
        
        // Handle castling - highlight rook movement too
        if (lastMove.specialMove && lastMove.specialMove.type === 'castling') {
            const rookFromSquare = document.querySelector(`[data-square="${lastMove.specialMove.rookFrom}"]`);
            const rookToSquare = document.querySelector(`[data-square="${lastMove.specialMove.rookTo}"]`);
            
            if (rookFromSquare) rookFromSquare.classList.add('last-move');
            if (rookToSquare) rookToSquare.classList.add('last-move');
        }
    }
}

function updateChessBoard(board) {
    if (!board || !Array.isArray(board) || board.length !== 8) {
        console.error('Invalid board data received');
        return;
    }
    
    const squares = document.querySelectorAll('.chess-square');
    
    // Track captured pieces if we have a previous board state
    if (currentGame && currentGame.board && Array.isArray(currentGame.board)) {
        trackBoardDifferences(currentGame.board, board);
    }
    
    squares.forEach((square, index) => {
        const row = Math.floor(index / 8);
        const col = index % 8;
        
        // Validate board bounds
        if (row >= 8 || col >= 8 || !board[row]) {
            console.error(`Invalid board position: ${row}, ${col}`);
            return;
        }
        
        const piece = board[row][col];
        
        // Clear existing piece
        const existingPiece = square.querySelector('.chess-piece');
        if (existingPiece) {
            existingPiece.remove();
        }
        
        // Add new piece if exists
        if (piece && piece !== ' ') {
            const pieceElement = document.createElement('div');
            pieceElement.className = `chess-piece ${piece === piece.toUpperCase() ? 'white' : 'black'} ${getPieceName(piece)}`;
            square.appendChild(pieceElement);
        }
    });
}

function formatTime(seconds) {
    // Handle negative time or invalid values
    if (seconds < 0 || isNaN(seconds)) {
        return '0:00';
    }
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function startGameTimer(game) {
    stopGameTimer();
    gameTimer = setInterval(() => {
        if (game.gameState === 'active') {
            if (game.currentPlayer === 'white') {
                game.whiteTime -= 1;
                updateTimerDisplay('whiteTime', game.whiteTime);
                
                // Check for time up
                if (game.whiteTime <= 0) {
                    game.whiteTime = 0;
                    updateTimerDisplay('whiteTime', 0);
                    stopGameTimer();
                    
                    // Emit time up event to server
                    socket.emit('time-up', { gameId: game.id, player: 'white' });
                    return;
                }
            } else {
                game.blackTime -= 1;
                updateTimerDisplay('blackTime', game.blackTime);
                
                // Check for time up
                if (game.blackTime <= 0) {
                    game.blackTime = 0;
                    updateTimerDisplay('blackTime', 0);
                    stopGameTimer();
                    
                    // Emit time up event to server
                    socket.emit('time-up', { gameId: game.id, player: 'black' });
                    return;
                }
            }
        }
    }, 1000);
}

function stopGameTimer() {
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
}

function joinGame() {
    const playerName = document.getElementById('playerName').value.trim() || 'Anonymous';
    const gameId = document.getElementById('gameId').value.trim() || generateGameId();
    const timeControl = document.getElementById('timeControl').value;
    
    // Check if this is a spectator join (game is already active/finished)
    const joinAsSpectator = currentGame && 
                           (currentGame.gameState === 'active' || currentGame.gameState === 'finished') &&
                           !currentGame.players.find(p => p.id === socket.id);
    
    if (joinAsSpectator) {
        socket.emit('join-as-spectator', {
            gameId: gameId,
            spectatorName: playerName
        });
    } else {
        socket.emit('join-game', {
            gameId: gameId,
            playerName: playerName,
            timeControl: timeControl
        });
    }
    
    document.getElementById('gameId').value = gameId;
}

function generateGameId() {
    return Math.random().toString(36).substr(2, 9);
}

function resignGame() {
    if (currentGame && currentGame.gameState === 'active') {
        if (confirm('Are you sure you want to resign?')) {
            socket.emit('resign', {
                gameId: currentGame.id
            });
        }
    }
}

function offerDraw() {
    if (currentGame && currentGame.gameState === 'active') {
        socket.emit('offer-draw', {
            gameId: currentGame.id
        });
        
        // Temporarily disable the draw button
        const drawBtn = document.getElementById('drawBtn');
        drawBtn.disabled = true;
        drawBtn.textContent = 'Draw Offered';
        
        setTimeout(() => {
            drawBtn.disabled = false;
            drawBtn.innerHTML = '<i class="fas fa-handshake"></i> Draw';
        }, 3000);
    }
}

function respondToDraw(accept) {
    if (currentGame && currentGame.gameState === 'active') {
        socket.emit('respond-draw', {
            gameId: currentGame.id,
            accept: accept
        });
    }
}

// Questions functionality
async function loadQuestions() {
    try {
        const response = await fetch('/api/posts');
        const posts = await response.json();
        displayQuestions(posts);
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

function displayQuestions(questions) {
    const container = document.getElementById('questionsList');
    container.innerHTML = '';
    
    questions.forEach(question => {
        const questionElement = createQuestionElement(question);
        container.appendChild(questionElement);
    });
}

function createQuestionElement(question) {
    const div = document.createElement('div');
    div.className = 'so-question';
    
    const timeAgo = getTimeAgo(new Date(question.timestamp));
    
    div.innerHTML = `
        <div class="question-stats">
            <div class="question-stat">
                <div class="question-stat-number">${question.votes}</div>
                <div>votes</div>
            </div>
            <div class="question-stat">
                <div class="question-stat-number">${question.answers || 0}</div>
                <div>answers</div>
            </div>
            <div class="question-stat">
                <div class="question-stat-number">${formatViews(question.views || 0)}</div>
                <div>views</div>
            </div>
        </div>
        <div class="question-content">
            <a href="#" class="question-title">${escapeHtml(question.title)}</a>
            <div class="question-excerpt">${escapeHtml(question.content.substring(0, 200))}...</div>
            <div class="question-tags">
                ${question.tags.map(tag => `<a href="#" class="so-tag">${escapeHtml(tag)}</a>`).join('')}
            </div>
            <div class="question-footer">
                <div class="question-meta">asked ${timeAgo}</div>
                <div class="user-card">
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23007acc'%3E%3Cpath d='M8 0C3.581 0 0 3.581 0 8s3.581 8 8 8 8-3.581 8-8S12.419 0 8 0zm2.75 12.25h-1.5V9h-2.5v3.25h-1.5V3.75h1.5v3.5h2.5v-3.5h1.5v8.5z'/%3E%3C/svg%3E" alt="user avatar">
                    <a href="#" class="user-name">${escapeHtml(question.author)}</a>
                    <span class="user-rep">${Math.floor(Math.random() * 5000) + 100}</span>
                </div>
            </div>
        </div>
    `;
    
    return div;
}

function formatViews(views) {
    if (views >= 1000) {
        return (views / 1000).toFixed(1) + 'k';
    }
    return views.toString();
}

function voteQuestion(questionId, direction) {
    // In a real implementation, this would update the vote on the server
    console.log(`Voting ${direction} on question ${questionId}`);
}

function openQuestionModal() {
    document.getElementById('askQuestionModal').style.display = 'block';
}

function closeQuestionModal() {
    document.getElementById('askQuestionModal').style.display = 'none';
    document.getElementById('questionForm').reset();
}

async function submitQuestion(e) {
    e.preventDefault();
    
    const title = document.getElementById('questionTitle').value;
    const content = document.getElementById('questionContent').value;
    const tags = document.getElementById('questionTags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
    const author = document.getElementById('questionAuthor').value;
    
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, content, tags, author }),
        });
        
        if (response.ok) {
            closeQuestionModal();
            loadQuestions(); // Reload questions
        }
    } catch (error) {
        console.error('Error submitting question:', error);
    }
}

// Comments functionality
async function loadComments() {
    try {
        const response = await fetch('/api/comments');
        const comments = await response.json();
        displayComments(comments);
        updateCommentsCount();
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

function displayComments(comments) {
    const container = document.getElementById('commentsContainer');
    container.innerHTML = '';
    
    comments.forEach(comment => {
        addCommentToDisplay(comment);
    });
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function addCommentToDisplay(comment) {
    const container = document.getElementById('commentsContainer');
    const div = document.createElement('div');
    div.className = 'comment-item';
    
    const timeAgo = getTimeAgo(new Date(comment.timestamp));
    const authorInitial = comment.author.charAt(0).toUpperCase();
    
    div.innerHTML = `
        <div class="comment-avatar">${authorInitial}</div>
        <div class="comment-content">
            <div>
                <span class="comment-author">${escapeHtml(comment.author)}</span>
                <span class="comment-time">${timeAgo}</span>
            </div>
            <div class="comment-text">${escapeHtml(comment.content)}</div>
        </div>
    `;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// Enhanced input validation and character counting
function setupInputValidation() {
    // Chat input validation
    const chatInput = document.getElementById('chatInput');
    const chatCounter = document.getElementById('chatCounter');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    
    if (chatInput && chatCounter && sendMessageBtn) {
        chatInput.addEventListener('input', function() {
            const length = this.value.length;
            const maxLength = this.getAttribute('maxlength') || 200;
            
            chatCounter.textContent = `${length}/${maxLength}`;
            
            // Update counter styling
            chatCounter.className = 'char-counter';
            if (length > maxLength * 0.8) {
                chatCounter.classList.add('warning');
            }
            if (length > maxLength * 0.95) {
                chatCounter.classList.remove('warning');
                chatCounter.classList.add('error');
            }
            
            // Enable/disable send button
            sendMessageBtn.disabled = length === 0 || length > maxLength;
        });
    }
    
    // Comment input validation
    const commentContent = document.getElementById('commentContent');
    const commentCounter = document.getElementById('commentCounter');
    const sendCommentBtn = document.getElementById('sendCommentBtn');
    
    if (commentContent && commentCounter && sendCommentBtn) {
        commentContent.addEventListener('input', function() {
            const length = this.value.length;
            const maxLength = this.getAttribute('maxlength') || 500;
            
            commentCounter.textContent = `${length}/${maxLength}`;
            
            // Update counter styling
            commentCounter.className = 'char-counter';
            if (length > maxLength * 0.8) {
                commentCounter.classList.add('warning');
            }
            if (length > maxLength * 0.95) {
                commentCounter.classList.remove('warning');
                commentCounter.classList.add('error');
            }
            
            // Enable/disable send button
            sendCommentBtn.disabled = length === 0 || length > maxLength;
        });
    }
    
    // Author name validation
    const commentAuthor = document.getElementById('commentAuthor');
    if (commentAuthor) {
        commentAuthor.addEventListener('input', function() {
            const length = this.value.length;
            const maxLength = this.getAttribute('maxlength') || 50;
            
            if (length > maxLength) {
                this.value = this.value.substring(0, maxLength);
            }
        });
    }
}

async function sendComment() {
    const author = document.getElementById('commentAuthor').value.trim() || 'Anonymous';
    const content = document.getElementById('commentContent').value.trim();
    const sendBtn = document.getElementById('sendCommentBtn');
    
    if (!content || content.length === 0) {
        showNotification('Please enter a message', 'warning');
        return;
    }
    
    if (content.length > 500) {
        showNotification('Message too long (max 500 characters)', 'error');
        return;
    }
    
    // Disable button during sending
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    
    try {
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ author, content }),
        });
        
        if (response.ok) {
            document.getElementById('commentContent').value = '';
            document.getElementById('commentCounter').textContent = '0/500';
            showNotification('Comment posted successfully!', 'success');
        } else {
            throw new Error('Failed to post comment');
        }
    } catch (error) {
        console.error('Error sending comment:', error);
        showNotification('Failed to post comment. Please try again.', 'error');
    } finally {
        // Re-enable button
        sendBtn.disabled = true; // Will be enabled by input validation
        sendBtn.textContent = 'Post';
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 16px',
        borderRadius: '6px',
        color: 'white',
        fontWeight: '500',
        fontSize: '14px',
        zIndex: '10000',
        maxWidth: '300px',
        wordWrap: 'break-word',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease'
    });
    
    // Set background color based on type
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function updateCommentsCount() {
    const comments = document.querySelectorAll('.comment-item');
    const count = comments.length;
    const countElement = document.getElementById('commentsCount');
    if (countElement) {
        countElement.textContent = `${count} message${count !== 1 ? 's' : ''}`;
    }
}

// Utility functions
function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    return `${days} day${days !== 1 ? 's' : ''} ago`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Network IP detection helper
function getLocalIP() {
    // This is a simplified version - in production you'd want to show the actual IP
    return window.location.href;
}

// Auto-resize textarea
document.addEventListener('input', function(e) {
    if (e.target.tagName === 'TEXTAREA') {
        e.target.style.height = 'auto';
        e.target.style.height = (e.target.scrollHeight) + 'px';
    }
});

// Service Worker for PWA (optional enhancement)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(registrationError => console.log('SW registration failed'));
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K to open ask question modal
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openQuestionModal();
    }
    
    // Escape to close modal
    if (e.key === 'Escape') {
        closeQuestionModal();
    }
});

// Initialize tooltips (if you want to add them later)
function initializeTooltips() {
    // Add tooltip functionality here
}

// Chess game sound effects (optional)
function playMoveSound() {
    // Add sound effect for chess moves
}

function playCheckSound() {
    // Add sound effect for check
}

function playGameEndSound() {
    // Add sound effect for game end
}

// Enhanced Messaging Functions
function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const chatCounter = document.getElementById('chatCounter');
    const sendBtn = document.getElementById('sendMessageBtn');
    const message = chatInput.value.trim();
    
    if (!message || message.length === 0) {
        showNotification('Please enter a message', 'warning');
        return;
    }
    
    if (message.length > 200) {
        showNotification('Message too long (max 200 characters)', 'error');
        return;
    }
    
    if (currentGame && currentGame.id) {
        // Disable button during sending
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        socket.emit('send-message', {
            gameId: currentGame.id,
            message: message
        });
        
        chatInput.value = '';
        if (chatCounter) {
            chatCounter.textContent = '0/200';
        }
        
        // Re-enable button after a short delay
        setTimeout(() => {
            sendBtn.disabled = true; // Will be enabled by input validation
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }, 500);
    } else {
        showNotification('No active game to send message to', 'warning');
    }
}

function markMessagesAsRead(messageIds) {
    if (currentGame && currentGame.id && messageIds.length > 0) {
        socket.emit('mark-messages-read', {
            gameId: currentGame.id,
            messageIds: messageIds
        });
    }
}

function updateMessageReadStatus(messageIds, readBy) {
    messageIds.forEach(messageId => {
        const statusElement = document.getElementById(`status-${messageId}`);
        if (statusElement) {
            statusElement.textContent = `Read by ${readBy}`;
            statusElement.classList.add('read');
        }
    });
}

// Move History Functions
function updateMoveHistory(game) {
    const moveHistory = document.getElementById('moveHistory');
    const movesList = document.getElementById('movesList');
    
    if (!game.moveHistory || game.moveHistory.length === 0) {
        moveHistory.style.display = 'none';
        return;
    }
    
    moveHistory.style.display = 'block';
    movesList.innerHTML = '';
    
    game.moveHistory.forEach((move, index) => {
        const moveElement = document.createElement('div');
        moveElement.className = `move-item ${move.color}`;
        
        if (index === game.moveHistory.length - 1) {
            moveElement.classList.add('last-move');
        }
        
        const notation = formatMoveNotation(move);
        const timeString = new Date(move.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        moveElement.innerHTML = `
            <span class="move-notation">${move.number}. ${notation}</span>
            <span class="move-time">${timeString}</span>
        `;
        
        movesList.appendChild(moveElement);
    });
    
    movesList.scrollTop = movesList.scrollHeight;
}

function formatMoveNotation(move) {
    const piece = move.piece.toLowerCase();
    const pieceSymbols = {
        'k': '♔', 'q': '♕', 'r': '♖', 'b': '♗', 'n': '♘', 'p': ''
    };
    
    let notation = pieceSymbols[piece] || '';
    notation += move.from + '-' + move.to;
    
    if (move.captured) {
        notation += 'x';
    }
    
    if (move.promotion) {
        notation += '=' + move.promotion.toUpperCase();
    }
    
    return notation;
}

// Pawn Promotion Dialog
function showPromotionDialog(color, callback) {
    const dialog = document.createElement('div');
    dialog.className = 'promotion-dialog';
    dialog.innerHTML = `
        <h3>Choose promotion piece</h3>
        <div class="promotion-options">
            <div class="promotion-piece" data-piece="q">
                <span class="chess-piece ${color} queen"></span>
            </div>
            <div class="promotion-piece" data-piece="r">
                <span class="chess-piece ${color} rook"></span>
            </div>
            <div class="promotion-piece" data-piece="b">
                <span class="chess-piece ${color} bishop"></span>
            </div>
            <div class="promotion-piece" data-piece="n">
                <span class="chess-piece ${color} knight"></span>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    dialog.querySelectorAll('.promotion-piece').forEach(piece => {
        piece.addEventListener('click', () => {
            const selectedPiece = piece.dataset.piece;
            document.body.removeChild(dialog);
            callback(selectedPiece);
        });
    });
}

// Utility function for HTML escaping
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Timer display with warnings
function updateTimerDisplay(elementId, timeSeconds) {
    const element = document.getElementById(elementId);
    const formattedTime = formatTime(timeSeconds);
    element.textContent = formattedTime;
    
    // Remove previous warning classes
    element.classList.remove('time-warning', 'time-critical');
    
    // Add warning classes based on time
    if (timeSeconds <= 10) {
        element.classList.add('time-critical');
    } else if (timeSeconds <= 20) {
        element.classList.add('time-warning');
    }
}

// Show notification
function showNotification(message, type = 'default') {
    const notification = document.createElement('div');
    notification.className = `message-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 3000);
}

// Show chess analysis from Stockfish
function showChessAnalysis(analysis) {
    // Remove any existing analysis popup
    const existingPopup = document.querySelector('.ai-helper-popup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    if (analysis.error) {
        showNotification(analysis.error, 'error');
        return;
    }
    
    // Create popup overlay
    const popup = document.createElement('div');
    popup.className = 'ai-helper-popup';
    
    // Create popup content
    const content = document.createElement('div');
    content.className = 'ai-helper-content';
    
    // Generate evaluation display
    let evalDisplay = '';
    let evalClass = 'equal';
    if (typeof analysis.evaluation === 'string') {
        evalDisplay = analysis.evaluation;
        evalClass = analysis.evaluation.includes('Mate in') ? 'advantage' : 'disadvantage';
    } else if (analysis.evaluation !== null) {
        evalDisplay = analysis.evaluation > 0 ? `+${analysis.evaluation.toFixed(2)}` : analysis.evaluation.toFixed(2);
        evalClass = analysis.evaluation > 0.5 ? 'advantage' : (analysis.evaluation < -0.5 ? 'disadvantage' : 'equal');
    } else {
        evalDisplay = '0.00';
    }
    
    content.innerHTML = `
        <div class="ai-helper-header">
            <h3>🤖 Chess Assistant (Stockfish)</h3>
            <button class="close-ai-helper">&times;</button>
        </div>
        <div class="ai-helper-body">
            <div class="position-evaluation">
                <h4>Position Evaluation</h4>
                <div class="eval-score ${evalClass}">${evalDisplay}</div>
                <div class="position-rank">${analysis.positionRank}</div>
                <div class="position-description">${analysis.positionDescription}</div>
            </div>
            
            ${analysis.bestMove ? `
            <div class="best-move-section">
                <h4>Stockfish Recommendation</h4>
                <div class="suggested-move">
                    <span class="move-notation">${analysis.bestMove}</span>
                </div>
                <div class="move-explanation">${analysis.moveExplanation}</div>
                <button class="highlight-move-btn" onclick="highlightStockfishMove('${analysis.bestMove}')">
                    Show Move on Board
                </button>
            </div>
            ` : ''}
            
            ${analysis.strategicTips && analysis.strategicTips.length > 0 ? `
            <div class="ai-tips">
                <h4>Strategic Tips</h4>
                <ul>
                    ${analysis.strategicTips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${analysis.timeout ? '<p style="color: #856404; font-style: italic; margin-top: 10px;">⚠️ Analysis timed out, results may be incomplete.</p>' : ''}
        </div>
    `;
    
    popup.appendChild(content);
    document.body.appendChild(popup);
    
    // Add event listeners
    const closeBtn = content.querySelector('.close-ai-helper');
    closeBtn.addEventListener('click', () => {
        popup.remove();
        clearHighlightedMoves();
    });
    
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.remove();
            clearHighlightedMoves();
        }
    });
}

// Highlight Stockfish suggested move
function highlightStockfishMove(moveNotation) {
    if (!moveNotation || !currentGame) return;
    
    clearHighlightedMoves();
    
    // Try to find the move in current legal moves
    // This is a simplified approach - in a real implementation you'd need more sophisticated move parsing
    const move = findMoveFromNotation(moveNotation);
    if (move) {
        // Highlight source square
        const fromSquare = document.querySelector(`[data-row="${move.fromRow}"][data-col="${move.fromCol}"]`);
        if (fromSquare) {
            fromSquare.classList.add('ai-suggested-from');
        }
        
        // Highlight destination square
        const toSquare = document.querySelector(`[data-row="${move.toRow}"][data-col="${move.toCol}"]`);
        if (toSquare) {
            toSquare.classList.add('ai-suggested-to');
        }
        
        // Auto-remove highlighting after 10 seconds
        setTimeout(() => {
            clearHighlightedMoves();
        }, 10000);
    }
}

// Simple function to find move from algebraic notation
function findMoveFromNotation(notation) {
    // This is a simplified implementation
    // For a complete solution, you'd want to use a chess library on client side too
    
    // Handle basic moves like e4, Nf3, etc.
    if (notation.length >= 2) {
        const targetSquare = notation.slice(-2);
        if (targetSquare.match(/[a-h][1-8]/)) {
            const toCol = targetSquare.charCodeAt(0) - 97; // 'a' = 0
            const toRow = 8 - parseInt(targetSquare.charAt(1));
            
            // For now, just highlight the destination square
            return {
                toRow: toRow,
                toCol: toCol,
                fromRow: -1, // We'll skip source highlighting for now
                fromCol: -1
            };
        }
    }
    
    return null;
}

// Clear highlighted moves
function clearHighlightedMoves() {
    document.querySelectorAll('.ai-suggested-from, .ai-suggested-to').forEach(square => {
        square.classList.remove('ai-suggested-from', 'ai-suggested-to');
    });
}

// Enhanced message display with notifications
function addMessageToChat(message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    const isOwnMessage = socket.id && message.readBy && message.readBy.includes(socket.id);
    
    messageElement.className = `chat-message ${isOwnMessage ? 'own' : 'opponent'}`;
    messageElement.dataset.messageId = message.id;
    
    const timeString = new Date(message.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="message-sender ${message.senderColor}">${message.sender}</span>
            <span class="message-time">${timeString}</span>
        </div>
        <div class="message-content">${escapeHtml(message.message)}</div>
        <div class="message-status" id="status-${message.id}">
            ${isOwnMessage ? 'Sent' : ''}
        </div>
    `;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Show notification for opponent messages
    if (!isOwnMessage) {
        showNotification(`${message.sender}: ${message.message}`, 'message');
    }
}

// Enhanced comment display with notifications
function addCommentToDisplay(comment) {
    const commentsContainer = document.getElementById('commentsContainer');
    if (!commentsContainer) return;
    
    const commentElement = document.createElement('div');
    commentElement.className = 'comment-item';
    commentElement.innerHTML = `
        <div class="comment-meta">
            <span class="comment-author">${escapeHtml(comment.author)}</span>
            <span class="comment-time">${new Date(comment.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="comment-content">${escapeHtml(comment.content)}</div>
    `;
    
    commentsContainer.appendChild(commentElement);
    
    // Show notification for new comments
    showNotification(`New comment from ${comment.author}`, 'comment');
}

// Collapsible sections functionality
function initializeCollapsibleSections() {
    // Chess advertisement collapsible
    const adLabel = document.querySelector('.game-label');
    const adContent = document.querySelector('.chess-ad-content');
    
    if (adLabel && adContent) {
        adLabel.addEventListener('click', function() {
            this.classList.toggle('collapsed');
            adContent.classList.toggle('collapsed');
            
            // Update notification state when collapsing/expanding
            if (this.classList.contains('collapsed')) {
                checkForTurnNotification();
            } else {
                clearTurnNotificationIndicator();
            }
        });
    }
    
    // Game chat collapsible
    const chatHeader = document.querySelector('.so-chat-section h4');
    const chatContainer = document.querySelector('.chat-container');
    const chatForm = document.querySelector('.chat-form');
    
    if (chatHeader && chatContainer && chatForm) {
        chatHeader.addEventListener('click', function() {
            this.classList.toggle('collapsed');
            
            if (this.classList.contains('collapsed')) {
                chatContainer.style.display = 'none';
                chatForm.style.display = 'none';
            } else {
                chatContainer.style.display = 'block';
                chatForm.style.display = 'flex';
            }
        });
    }
}

// Game controls visibility management
function updateGameControlsVisibility(gameState) {
    const timeControlElement = document.getElementById('timeControl');
    const playerNameElement = document.getElementById('playerName');
    const gameIdElement = document.getElementById('gameId');
    const playBtnElement = document.getElementById('joinGameBtn');
    
    if (gameState === 'waiting' || gameState === 'finished') {
        // Make game ID read-only
        if (gameIdElement) {
            gameIdElement.readOnly = gameState === 'active';
        }
        
        // Hide/show controls based on game state
        if (timeControlElement) timeControlElement.style.display = gameState === 'waiting' ? 'block' : 'none';
        if (playerNameElement) playerNameElement.style.display = gameState === 'waiting' ? 'block' : 'none';
        
        // Update play button text
        if (playBtnElement && gameState === 'waiting') {
            playBtnElement.textContent = '▶ Play Now';
            playBtnElement.style.display = 'block';
        } else if (playBtnElement && gameState === 'finished') {
            playBtnElement.style.display = 'none';
        }
    } else if (gameState === 'active') {
        // Hide all controls during active game
        if (timeControlElement) timeControlElement.style.display = 'none';
        if (playerNameElement) playerNameElement.style.display = 'none';
        if (playBtnElement) playBtnElement.style.display = 'none';
        if (gameIdElement) gameIdElement.readOnly = true;
    }
}

// Spectators management
function updateSpectatorsDisplay(spectators) {
    let spectatorsElement = document.getElementById('spectatorsList');
    
    if (!spectatorsElement) {
        // Create spectators display if it doesn't exist
        const spectatorsContainer = document.createElement('div');
        spectatorsContainer.className = 'spectators-container';
        spectatorsContainer.innerHTML = `
            <h5 style="margin: 8px 0 4px 0; font-size: 10px; color: #6a737c;">Spectators</h5>
            <div id="spectatorsList" class="spectators-list"></div>
        `;
        
        const chessMiniBoard = document.querySelector('.chess-mini-board');
        if (chessMiniBoard && chessMiniBoard.parentNode) {
            chessMiniBoard.parentNode.insertBefore(spectatorsContainer, chessMiniBoard.nextSibling);
        }
        
        spectatorsElement = document.getElementById('spectatorsList');
    }
    
    if (spectatorsElement) {
        if (spectators.length > 0) {
            spectatorsElement.innerHTML = spectators.map(spectator => 
                `<div class="spectator-item" style="font-size: 9px; color: #6a737c; margin: 2px 0;">👁️ ${escapeHtml(spectator.name)}</div>`
            ).join('');
            spectatorsElement.style.display = 'block';
        } else {
            spectatorsElement.style.display = 'none';
        }
    }
}

// Turn notification for collapsed board
function checkForTurnNotification() {
    const adLabel = document.querySelector('.game-label');
    if (adLabel && adLabel.classList.contains('collapsed') && 
        currentGame && currentGame.gameState === 'active') {
        
        const player = currentGame.players.find(p => p.id === socket.id);
        if (player && currentGame.currentPlayer === player.color) {
            showTurnNotificationIndicator();
        }
    }
}

function showTurnNotificationIndicator() {
    const adLabel = document.querySelector('.game-label');
    if (adLabel) {
        adLabel.style.backgroundColor = '#ffc2c2';
    }
}

function clearTurnNotificationIndicator() {
    const indicator = document.querySelector('.game-label');
    if (indicator) {
        indicator.style.backgroundColor = '#f9f8f8';
    }
}

// Replay functionality
function offerReplay() {
    if (currentGame && currentGame.gameState === 'finished') {
        socket.emit('offer-replay', {
            gameId: currentGame.id
        });
        
        const replayBtn = document.getElementById('replayBtn');
        if (replayBtn) {
            replayBtn.disabled = true;
            replayBtn.textContent = 'Replay Offered';
        }
    }
}

function showReplayOfferDialog(fromPlayerId) {
    const fromPlayer = currentGame.players.find(p => p.id === fromPlayerId);
    const playerName = fromPlayer ? fromPlayer.name : 'Opponent';
    
    const dialog = document.createElement('div');
    dialog.className = 'replay-offer-dialog';
    dialog.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: white; border: 2px solid #0074cc; border-radius: 8px;
        padding: 20px; z-index: 1000; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        text-align: center; min-width: 250px;
    `;
    
    dialog.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: #232629;">Replay Offer</h3>
        <p style="margin: 10px 0;">${escapeHtml(playerName)} wants to play again!</p>
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
            <button class="accept-replay-btn" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Accept</button>
            <button class="decline-replay-btn" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Decline</button>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    dialog.querySelector('.accept-replay-btn').addEventListener('click', () => {
        socket.emit('respond-replay', {
            gameId: currentGame.id,
            accept: true
        });
        document.body.removeChild(dialog);
    });
    
    dialog.querySelector('.decline-replay-btn').addEventListener('click', () => {
        socket.emit('respond-replay', {
            gameId: currentGame.id,
            accept: false
        });
        document.body.removeChild(dialog);
    });
}

// Board flipping functionality
function flipBoardIfNeeded() {
    const chessBoard = document.getElementById('chessBoard');
    const pieces = chessBoard.querySelectorAll('.chess-square');
    
    if (playerColor === 'black') {
        chessBoard.style.transform = 'rotate(180deg)';
        
        // Rotate individual pieces back
        pieces.forEach(piece => {
            piece.style.transform = 'rotate(180deg)';
        });
    } else {
        // Reset board orientation for white player
        chessBoard.style.transform = 'rotate(0deg)';
        
        // Reset individual pieces
        pieces.forEach(piece => {
            piece.style.transform = 'rotate(0deg)';
        });
    }
}

// Show invite URL modal
function showInviteUrlModal(inviteUrl) {
    // Remove any existing modal
    const existingModal = document.querySelector('.invite-url-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'invite-url-modal';
    modal.innerHTML = `
        <div class="invite-url-content">
            <div class="invite-url-header">
                <h3>🎯 Game Created Successfully!</h3>
                <button class="close-invite-modal">&times;</button>
            </div>
            <div class="invite-url-body">
                <p>Share this URL with your opponent to invite them to play:</p>
                <div class="url-container">
                    <input type="text" value="${inviteUrl}" id="inviteUrlInput" readonly>
                    <button class="copy-url-btn" onclick="copyInviteUrl()">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </div>
                <p class="url-help">They can click the link or enter Game ID: <strong>${currentGame ? currentGame.id : ''}</strong></p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    const closeBtn = modal.querySelector('.close-invite-modal');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Copy invite URL to clipboard
function copyInviteUrl() {
    const input = document.getElementById('inviteUrlInput');
    input.select();
    input.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        document.execCommand('copy');
        showNotification('Invite URL copied to clipboard!', 'success');
        
        // Change button text temporarily
        const btn = document.querySelector('.copy-url-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        btn.style.background = '#28a745';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
        }, 2000);
    } catch (err) {
        showNotification('Failed to copy URL. Please copy manually.', 'error');
    }
}

// Settings dropdown functionality
function setupSettingsDropdown() {
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsMenu = document.getElementById('settingsMenu');
    const themeOptions = document.querySelectorAll('.theme-option');
    const chessBoard = document.getElementById('chessBoard');
    
    // Load saved theme
    const savedTheme = localStorage.getItem('chessTheme') || 'classic';
    applyTheme(savedTheme);
    updateActiveTheme(savedTheme);
    
    // Toggle settings menu
    settingsBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        settingsMenu.classList.toggle('show');
    });
    
    // Close settings menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!settingsMenu.contains(e.target) && !settingsBtn.contains(e.target)) {
            settingsMenu.classList.remove('show');
        }
    });
    
    // Theme selection
    themeOptions.forEach(option => {
        option.addEventListener('click', function() {
            const theme = this.dataset.theme;
            applyTheme(theme);
            updateActiveTheme(theme);
            localStorage.setItem('chessTheme', theme);
            
            // Close settings menu after selection
            settingsMenu.classList.remove('show');
        });
    });
    
    function applyTheme(theme) {
        // Remove all theme classes
        chessBoard.className = chessBoard.className.replace(/theme-\w+/g, '');
        // Add new theme class
        chessBoard.classList.add(`theme-${theme}`);
    }
    
    function updateActiveTheme(theme) {
        themeOptions.forEach(option => {
            option.classList.remove('active');
            if (option.dataset.theme === theme) {
                option.classList.add('active');
            }
        });
    }
}
