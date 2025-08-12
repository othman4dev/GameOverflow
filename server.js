const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["*"],
    credentials: true
  },
  allowEIO3: true
});

// Middleware
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["*"]
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Add error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Game state storage
const games = new Map();
const players = new Map();
const comments = [];

// Initial blog posts
const blogPosts = [
  {
    id: uuidv4(),
    title: "How to generate UUID v4 in JavaScript without external libraries?",
    content: "I need to generate UUID v4 in my JavaScript application but I don't want to add any external dependencies. Is there a way to do this with just vanilla JavaScript? I've seen some implementations using Math.random() but I'm not sure if they're cryptographically secure.",
    author: "devNewbie2024",
    votes: 187,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    tags: ["javascript", "uuid", "random"],
    answers: 12,
    views: 15420
  },
  {
    id: uuidv4(),
    title: "UUID performance vs auto-increment integers in PostgreSQL",
    content: "I'm designing a new database schema and considering whether to use UUIDs or auto-increment integers as primary keys. What are the performance implications? I've heard UUIDs can slow down queries due to their size and randomness. My application will have millions of records.",
    author: "DatabaseArchitect",
    votes: 143,
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    tags: ["postgresql", "uuid", "performance", "database-design"],
    answers: 8,
    views: 9834
  },
  {
    id: uuidv4(),
    title: "Why does UUID.randomUUID() sometimes produce duplicate values?",
    content: "I'm using Java's UUID.randomUUID() method in a multi-threaded application and occasionally getting duplicate UUIDs. This shouldn't be possible with proper UUID v4 generation. Could this be related to threading issues or insufficient entropy?",
    author: "JavaDeveloper123",
    votes: 89,
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    tags: ["java", "uuid", "multithreading", "random"],
    answers: 5,
    views: 6721
  },
  {
    id: uuidv4(),
    title: "Best practices for storing UUIDs in MongoDB",
    content: "What's the recommended way to store UUIDs in MongoDB? Should I use the UUID BSON type or store them as strings? I'm concerned about storage efficiency and query performance. Also, should I use UUID v4 or would v1 be better for time-based queries?",
    author: "MongoMaster",
    votes: 76,
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
    tags: ["mongodb", "uuid", "bson", "storage"],
    answers: 7,
    views: 4532
  },
  {
    id: uuidv4(),
    title: "Convert UUID to short URL-safe string for public APIs",
    content: "I need to expose UUIDs in public APIs but they're quite long and not very user-friendly. What's the best way to convert a UUID to a shorter, URL-safe string that I can later convert back to the original UUID? Base64 encoding removes some characters but still quite long.",
    author: "APIDesigner",
    votes: 234,
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000),
    tags: ["uuid", "encoding", "api-design", "url"],
    answers: 15,
    views: 18943
  },
  {
    id: uuidv4(),
    title: "UUID v1 vs v4: When to use which version?",
    content: "I understand the difference between UUID v1 (timestamp + MAC) and v4 (random), but I'm not sure when to use each. For user IDs in a web application, would v4 be better for privacy? Are there any performance considerations? What about v5 with SHA-1 hashing?",
    author: "SystemDesigner",
    votes: 156,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    tags: ["uuid", "version", "privacy", "system-design"],
    answers: 9,
    views: 12678
  },
  {
    id: uuidv4(),
    title: "Validating UUID format with regex - what's the best pattern?",
    content: "I need to validate UUID strings on both client and server side. What's the most reliable regex pattern for UUID validation? I've found several different patterns online and not sure which one is the most comprehensive and handles edge cases properly.",
    author: "ValidationExpert",
    votes: 298,
    timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000),
    tags: ["regex", "uuid", "validation"],
    answers: 11,
    views: 23456
  },
  {
    id: uuidv4(),
    title: "Memory usage of UUID vs Long in Java applications",
    content: "I'm building a high-throughput Java application that processes millions of records. Each record has an identifier that could be either a UUID (128-bit) or a Long (64-bit). What's the real-world memory impact of using UUIDs? Should I be concerned about GC pressure?",
    author: "PerformanceGuru",
    votes: 67,
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
    tags: ["java", "uuid", "memory", "performance"],
    answers: 6,
    views: 5432
  }
];

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/posts', (req, res) => {
  res.json(blogPosts);
});

app.post('/api/posts', (req, res) => {
  const { title, content, author, tags } = req.body;
  const newPost = {
    id: uuidv4(),
    title,
    content,
    author,
    votes: 0,
    timestamp: new Date(),
    tags: tags || []
  };
  blogPosts.unshift(newPost);
  res.json(newPost);
});

app.get('/api/comments', (req, res) => {
  res.json(comments);
});

app.post('/api/comments', (req, res) => {
  const { author, content } = req.body;
  const newComment = {
    id: uuidv4(),
    author,
    content,
    timestamp: new Date()
  };
  comments.push(newComment);
  io.emit('new-comment', newComment);
  res.json(newComment);
});

// Socket.IO for chess and real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Chess game logic
  socket.on('join-game', (data) => {
    const { gameId, playerName, timeControl } = data;
    
    if (!games.has(gameId)) {
      // Generate random color assignment for new games
      const firstPlayerColor = Math.random() < 0.5 ? 'white' : 'black';
      const secondPlayerColor = firstPlayerColor === 'white' ? 'black' : 'white';
      
      games.set(gameId, {
        id: gameId,
        players: [],
        spectators: [],
        board: initializeBoard(),
        currentPlayer: 'white',
        gameState: 'waiting',
        timeControl: timeControl,
        whiteTime: getTimeControlSeconds(timeControl),
        blackTime: getTimeControlSeconds(timeControl),
        lastMoveTime: Date.now(),
        messages: [],
        moveHistory: [],
        lastMove: null,
        replayOffer: null,
        colorAssignment: { first: firstPlayerColor, second: secondPlayerColor },
        inviteUrl: `https://gameoverflow.onrender.com/?gameId=${gameId}`
      });
    }

    const game = games.get(gameId);
    
    if (game.players.length < 2) {
      const playerColor = game.players.length === 0 ? game.colorAssignment.first : game.colorAssignment.second;
      const player = {
        id: socket.id,
        name: playerName,
        color: playerColor
      };
      
      game.players.push(player);
      players.set(socket.id, { gameId, ...player });
      
      socket.join(gameId);
      
      if (game.players.length === 2) {
        game.gameState = 'active';
        game.lastMoveTime = Date.now();
      }
      
      // Send the invite URL to the first player
      if (game.players.length === 1) {
        socket.emit('invite-url-generated', { inviteUrl: game.inviteUrl });
      }
      
      io.to(gameId).emit('game-update', game);
    }
  });

  socket.on('make-move', (data) => {
    const { gameId, from, to } = data;
    const game = games.get(gameId);
    const player = players.get(socket.id);
    
    if (game && player && game.currentPlayer === player.color && game.gameState === 'active') {
      if (isValidMove(game.board, from, to, player.color, game)) {
        // Make the move
        const moveInfo = makeMove(game.board, from, to, game);
        
        // Add to move history
        if (!game.moveHistory) {
          game.moveHistory = [];
        }
        const moveNumber = Math.floor(game.moveHistory.length / 2) + 1;
        const moveNotation = {
          number: moveNumber,
          color: player.color,
          from: from,
          to: to,
          piece: moveInfo.piece,
          captured: moveInfo.captured,
          promotion: moveInfo.promotion,
          timestamp: new Date()
        };
        game.moveHistory.push(moveNotation);
        
        // Update time
        const timeElapsed = (Date.now() - game.lastMoveTime) / 1000;
        if (player.color === 'white') {
          game.whiteTime -= timeElapsed;
          game.whiteTime += getIncrementSeconds(game.timeControl);
        } else {
          game.blackTime -= timeElapsed;
          game.blackTime += getIncrementSeconds(game.timeControl);
        }
        
        // Switch players
        const nextPlayer = game.currentPlayer === 'white' ? 'black' : 'white';
        game.currentPlayer = nextPlayer;
        game.lastMoveTime = Date.now();
        
        // Check game state
        const inCheck = isKingInCheck(game.board, nextPlayer);
        const isCheckmateSituation = isCheckmate(game.board, nextPlayer);
        const isStalemateSituation = isStalemate(game.board, nextPlayer);
        
        if (isCheckmateSituation) {
          game.gameState = 'finished';
          game.winner = player.color;
          game.endReason = 'checkmate';
        } else if (isStalemateSituation) {
          game.gameState = 'finished';
          game.winner = 'draw';
          game.endReason = 'stalemate';
        } else if (game.whiteTime <= 0) {
          game.gameState = 'finished';
          game.winner = 'black';
          game.endReason = 'timeout';
        } else if (game.blackTime <= 0) {
          game.gameState = 'finished';
          game.winner = 'white';
          game.endReason = 'timeout';
        }
        
        game.inCheck = inCheck;
        game.lastMove = moveInfo;
        
        io.to(gameId).emit('game-update', game);
      }
    }
  });

  socket.on('resign', (data) => {
    const { gameId } = data;
    const game = games.get(gameId);
    const player = players.get(socket.id);
    
    if (game && player && game.gameState === 'active') {
      game.gameState = 'finished';
      game.winner = player.color === 'white' ? 'black' : 'white';
      game.endReason = 'resignation';
      
      io.to(gameId).emit('game-update', game);
    }
  });

  socket.on('offer-draw', (data) => {
    const { gameId } = data;
    const game = games.get(gameId);
    const player = players.get(socket.id);
    
    if (game && player && game.gameState === 'active') {
      game.drawOffer = player.color;
      io.to(gameId).emit('game-update', game);
    }
  });

  socket.on('respond-draw', (data) => {
    const { gameId, accept } = data;
    const game = games.get(gameId);
    const player = players.get(socket.id);
    
    if (game && player && game.gameState === 'active' && game.drawOffer && game.drawOffer !== player.color) {
      if (accept) {
        game.gameState = 'finished';
        game.winner = 'draw';
        game.endReason = 'agreement';
      }
      game.drawOffer = null;
      io.to(gameId).emit('game-update', game);
    }
  });

  socket.on('time-up', (data) => {
    const { gameId, player: timeUpPlayer } = data;
    const game = games.get(gameId);
    
    if (game && game.gameState === 'active') {
      game.gameState = 'finished';
      game.winner = timeUpPlayer === 'white' ? 'black' : 'white';
      game.endReason = 'timeout';
      
      // Ensure times don't go negative
      if (timeUpPlayer === 'white') {
        game.whiteTime = 0;
      } else {
        game.blackTime = 0;
      }
      
      io.to(gameId).emit('game-update', game);
      io.to(gameId).emit('game-ended', { 
        reason: `${timeUpPlayer === 'white' ? 'Black' : 'White'} wins by timeout`,
        winner: game.winner
      });
    }
  });

  // Spectator functionality
  socket.on('join-as-spectator', (data) => {
    const { gameId, spectatorName } = data;
    const game = games.get(gameId);
    
    if (game) {
      const spectator = {
        id: socket.id,
        name: spectatorName
      };
      
      // Add spectator if not already present
      if (!game.spectators.find(s => s.id === socket.id)) {
        game.spectators.push(spectator);
        players.set(socket.id, { ...spectator, gameId: gameId, isSpectator: true });
        
        socket.join(gameId);
        io.to(gameId).emit('game-update', game);
        io.to(gameId).emit('spectator-joined', { spectatorName: spectatorName });
      }
    }
  });

  // Replay functionality
  socket.on('offer-replay', (data) => {
    const { gameId } = data;
    const game = games.get(gameId);
    const player = players.get(socket.id);
    
    if (game && player && game.gameState === 'finished' && !player.isSpectator) {
      game.replayOffer = {
        from: socket.id,
        fromPlayer: player.name,
        timestamp: Date.now()
      };
      
      io.to(gameId).emit('game-update', game);
      
      // Notify the opponent
      const opponent = game.players.find(p => p.id !== socket.id);
      if (opponent) {
        io.to(opponent.id).emit('replay-offer', { 
          fromPlayer: player.name,
          from: socket.id 
        });
      }
    }
  });

  socket.on('respond-replay', (data) => {
    const { gameId, accept } = data;
    const game = games.get(gameId);
    const player = players.get(socket.id);
    
    if (game && player && game.replayOffer && game.replayOffer.from !== socket.id) {
      if (accept) {
        // Reset the game for replay
        game.board = initializeBoard();
        game.currentPlayer = 'white';
        game.gameState = 'active';
        game.whiteTime = getTimeControlSeconds(game.timeControl);
        game.blackTime = getTimeControlSeconds(game.timeControl);
        game.lastMoveTime = Date.now();
        game.moveHistory = [];
        game.lastMove = null;
        game.inCheck = false;
        game.winner = null;
        game.endReason = null;
        game.drawOffer = null;
        game.replayOffer = null;
        
        // Swap colors for variety
        game.players.forEach(p => {
          p.color = p.color === 'white' ? 'black' : 'white';
        });
        
        io.to(gameId).emit('game-update', game);
      } else {
        // Notify the offering player that replay was declined
        const offeringPlayer = game.players.find(p => p.id === game.replayOffer.from);
        if (offeringPlayer) {
          io.to(game.replayOffer.from).emit('replay-declined', { 
            fromPlayer: player.name 
          });
        }
        
        game.replayOffer = null;
        io.to(gameId).emit('game-update', game);
      }
    }
  });

  // Messaging system
  socket.on('send-message', (data) => {
    const { gameId, message } = data;
    const game = games.get(gameId);
    const player = players.get(socket.id);
    
    if (game && player && message.trim()) {
      const messageData = {
        id: uuidv4(),
        gameId: gameId,
        sender: player.name,
        senderColor: player.color,
        message: message.trim(),
        timestamp: new Date(),
        readBy: [socket.id] // Sender automatically reads their own message
      };
      
      if (!game.messages) {
        game.messages = [];
      }
      game.messages.push(messageData);
      
      // Check if message contains the AI helper keyword
      if (message.trim().toLowerCase() === 'beatabdellah') {
        // Only provide analysis to the person who typed the keyword
        analyzePositionWithStockfish(gameId, socket.id, player.color);
      }
      
      // Send to all players in the game
      io.to(gameId).emit('new-message', messageData);
    }
  });

  socket.on('mark-messages-read', (data) => {
    const { gameId, messageIds } = data;
    const game = games.get(gameId);
    const player = players.get(socket.id);
    
    if (game && player && game.messages) {
      messageIds.forEach(messageId => {
        const message = game.messages.find(msg => msg.id === messageId);
        if (message && !message.readBy.includes(socket.id)) {
          message.readBy.push(socket.id);
        }
      });
      
      // Notify other players about read receipts
      socket.to(gameId).emit('messages-read', { 
        readBy: player.name, 
        messageIds: messageIds 
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const player = players.get(socket.id);
    if (player) {
      const game = games.get(player.gameId);
      if (game) {
        if (player.isSpectator) {
          // Remove spectator
          game.spectators = game.spectators.filter(s => s.id !== socket.id);
          io.to(player.gameId).emit('game-update', game);
          io.to(player.gameId).emit('spectator-left', { spectatorName: player.name });
        } else {
          // Handle player disconnect
          if (game.gameState === 'active') {
            game.gameState = 'abandoned';
          }
          io.to(player.gameId).emit('game-update', game);
        }
      }
      players.delete(socket.id);
    }
  });
});

// Chess Analysis using chess.js
function analyzePositionWithStockfish(gameId, socketId, playerColor) {
  const game = games.get(gameId);
  if (!game || !game.board) return;

  try {
    // Convert our board to FEN notation
    const fen = boardToFEN(game.board, game.currentPlayer, game);
    
    // Create chess.js instance with current position
    const chess = new Chess(fen);
    
    // Get all legal moves
    const legalMoves = chess.moves({ verbose: true });
    
    if (legalMoves.length === 0) {
      // Game over
      sendAnalysisToPlayer(gameId, socketId, {
        evaluation: chess.isCheckmate() ? 'Checkmate' : 'Stalemate',
        bestMove: null,
        fen: fen,
        playerColor: playerColor,
        legalMoves: []
      });
      return;
    }
    
    // Simple evaluation based on material and position
    const evaluation = evaluatePosition(chess, playerColor);
    
    // Find best move using simple heuristics
    const bestMove = findBestMove(chess, legalMoves, playerColor);
    
    sendAnalysisToPlayer(gameId, socketId, {
      evaluation: evaluation,
      bestMove: bestMove,
      fen: fen,
      playerColor: playerColor,
      legalMoves: legalMoves
    });
    
  } catch (error) {
    console.error('Chess analysis error:', error);
    // Send error response to player
    io.to(socketId).emit('chess-analysis', {
      error: 'Analysis unavailable at the moment'
    });
  }
}

function evaluatePosition(chess, playerColor) {
  // Material values
  const pieceValues = {
    'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
  };
  
  let whiteScore = 0;
  let blackScore = 0;
  
  // Count material
  const board = chess.board();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        const value = pieceValues[piece.type] || 0;
        if (piece.color === 'w') {
          whiteScore += value;
        } else {
          blackScore += value;
        }
      }
    }
  }
  
  // Add positional bonuses
  const mobility = chess.moves().length;
  const isInCheck = chess.isCheck();
  
  let positionalBonus = 0;
  if (mobility > 20) positionalBonus += 0.2;
  if (mobility < 10) positionalBonus -= 0.2;
  if (isInCheck) positionalBonus -= 0.5;
  
  const materialDiff = whiteScore - blackScore;
  const evaluation = playerColor === 'white' ? materialDiff + positionalBonus : -(materialDiff + positionalBonus);
  
  return evaluation;
}

function findBestMove(chess, legalMoves, playerColor) {
  let bestMove = null;
  let bestScore = -Infinity;
  
  for (const move of legalMoves) {
    let score = 0;
    
    // Prioritize captures
    if (move.captured) {
      const pieceValues = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9 };
      score += (pieceValues[move.captured] || 0) * 10;
    }
    
    // Prioritize checks
    chess.move(move);
    if (chess.isCheck()) {
      score += 5;
    }
    
    // Prioritize center control
    const centerSquares = ['e4', 'e5', 'd4', 'd5'];
    if (centerSquares.includes(move.to)) {
      score += 2;
    }
    
    // Prioritize piece development
    if (move.piece === 'n' || move.piece === 'b') {
      if (move.from.includes('1') || move.from.includes('8')) {
        score += 1;
      }
    }
    
    // Avoid moving into attacks
    const attackers = chess.attackers(move.to, chess.turn() === 'w' ? 'b' : 'w');
    if (attackers.length > 0) {
      score -= 3;
    }
    
    chess.undo();
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  
  return bestMove ? move.san : null;
}

function sendAnalysisToPlayer(gameId, socketId, analysisData) {
  const game = games.get(gameId);
  if (!game) return;
  
  // Convert evaluation to position assessment
  let positionRank = 'Equal';
  let positionDescription = 'The position is balanced.';
  
  if (typeof analysisData.evaluation === 'string') {
    // Game over scenarios
    if (analysisData.evaluation === 'Checkmate') {
      positionRank = 'Checkmate';
      positionDescription = 'The game is over - checkmate!';
    } else if (analysisData.evaluation === 'Stalemate') {
      positionRank = 'Stalemate';
      positionDescription = 'The game is over - stalemate!';
    }
  } else if (analysisData.evaluation !== null) {
    const eval_score = analysisData.evaluation;
    
    if (eval_score >= 3) {
      positionRank = 'Winning';
      positionDescription = 'You have a winning advantage!';
    } else if (eval_score >= 1) {
      positionRank = 'Better';
      positionDescription = 'You have a significant advantage.';
    } else if (eval_score >= -1) {
      positionRank = 'Equal';
      positionDescription = 'The position is roughly equal.';
    } else if (eval_score >= -3) {
      positionRank = 'Worse';
      positionDescription = 'You are at a disadvantage.';
    } else {
      positionRank = 'Losing';
      positionDescription = 'You are in a difficult position.';
    }
  }
  
  // Convert move to human readable format
  const moveExplanation = analysisData.bestMove ? 
    `The AI suggests playing ${analysisData.bestMove}` : 
    'No moves available.';
  
  // Generate strategic tips based on position
  const strategicTips = generateStrategicTips(analysisData.evaluation, game.board, analysisData.playerColor);
  
  // Send analysis only to the requesting player
  io.to(socketId).emit('chess-analysis', {
    positionRank: positionRank,
    positionDescription: positionDescription,
    evaluation: analysisData.evaluation,
    bestMove: analysisData.bestMove,
    moveExplanation: moveExplanation,
    strategicTips: strategicTips,
    timeout: analysisData.timeout || false
  });
}

function boardToFEN(board, currentPlayer, gameState) {
  // Convert board to FEN notation
  let fen = '';
  
  // Process each rank (row)
  for (let row = 0; row < 8; row++) {
    let emptyCount = 0;
    let rankStr = '';
    
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || piece === '' || piece === null || piece === undefined) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rankStr += emptyCount.toString();
          emptyCount = 0;
        }
        // Convert piece notation (uppercase for white, lowercase for black)
        const pieceStr = piece.toString();
        const isWhite = pieceStr === pieceStr.toUpperCase();
        rankStr += isWhite ? pieceStr.toUpperCase() : pieceStr.toLowerCase();
      }
    }
    
    if (emptyCount > 0) {
      rankStr += emptyCount.toString();
    }
    
    fen += rankStr;
    if (row < 7) fen += '/';
  }
  
  // Add active color
  fen += ` ${currentPlayer === 'white' ? 'w' : 'b'}`;
  
  // Add castling rights (simplified - you may want to track this properly)
  fen += ' KQkq';
  
  // Add en passant (simplified)
  fen += ' -';
  
  // Add halfmove and fullmove counters
  fen += ` 0 ${Math.floor((gameState.moveHistory?.length || 0) / 2) + 1}`;
  
  return fen;
}

function getMoveExplanation(uciMove, board) {
  if (!uciMove || uciMove.length < 4) {
    return 'Stockfish suggests considering your options carefully.';
  }
  
  const from = uciMove.substring(0, 2);
  const to = uciMove.substring(2, 4);
  const fromCol = from.charCodeAt(0) - 97; // 'a' = 0
  const fromRow = 8 - parseInt(from.charAt(1));
  const toCol = to.charCodeAt(0) - 97;
  const toRow = 8 - parseInt(to.charAt(1));
  
  const piece = board[fromRow][fromCol];
  let explanation = `Move your ${getPieceName(piece)} from ${from} to ${to}`;
  
  // Check if it's a capture
  const targetPiece = board[toRow][toCol];
  if (targetPiece && targetPiece !== '') {
    explanation += ` (capturing ${getPieceName(targetPiece)})`;
  }
  
  return explanation + '.';
}

function getPieceName(piece) {
  if (!piece) return 'piece';
  
  const names = {
    'k': 'king', 'q': 'queen', 'r': 'rook', 
    'b': 'bishop', 'n': 'knight', 'p': 'pawn'
  };
  
  return names[piece.toLowerCase()] || 'piece';
}

function generateStrategicTips(evaluation, board, playerColor) {
  const tips = [];
  
  if (typeof evaluation === 'string') {
    if (evaluation.includes('Mate in')) {
      tips.push('Focus on delivering checkmate quickly');
      tips.push('Look for forcing moves and checks');
    } else {
      tips.push('Defend carefully and look for counterplay');
      tips.push('Try to create complications');
    }
  } else if (evaluation !== null) {
    const eval_score = playerColor === 'white' ? evaluation : -evaluation;
    
    if (eval_score >= 1) {
      tips.push('Maintain your advantage with solid moves');
      tips.push('Avoid unnecessary complications');
      tips.push('Consider trading pieces to simplify');
    } else if (eval_score <= -1) {
      tips.push('Look for tactical opportunities');
      tips.push('Create counterplay and complications');
      tips.push('Defend key squares and pieces');
    } else {
      tips.push('Improve your piece activity');
      tips.push('Control key central squares');
      tips.push('Look for pawn breaks');
    }
  }
  
  // Add general tips based on position
  tips.push('Keep your king safe');
  tips.push('Develop pieces toward the center');
  
  return tips.slice(0, 3); // Return max 3 tips
}

// Chess helper functions
function initializeBoard() {
  return [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
  ];
}

function getTimeControlSeconds(timeControl) {
  const timeControls = {
    '3+2': 180,
    '5+0': 300,
    '5+5': 300
  };
  return timeControls[timeControl] || 300;
}

function getIncrementSeconds(timeControl) {
  const increments = {
    '3+2': 2,
    '5+0': 0,
    '5+5': 5
  };
  return increments[timeControl] || 0;
}

function isValidMove(board, from, to, playerColor, gameState) {
  const fromRow = parseInt(from[1]) - 1;
  const fromCol = from.charCodeAt(0) - 97;
  const toRow = parseInt(to[1]) - 1;
  const toCol = to.charCodeAt(0) - 97;
  
  // Check bounds
  if (fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 ||
      toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) {
    return false;
  }
  
  const piece = board[7 - fromRow][fromCol];
  if (!piece) return false;
  
  const isWhitePiece = piece === piece.toUpperCase();
  if ((playerColor === 'white' && !isWhitePiece) || (playerColor === 'black' && isWhitePiece)) {
    return false;
  }
  
  // Can't move to same square
  if (from === to) {
    return false;
  }
  
  // Can't capture own piece
  const targetPiece = board[7 - toRow][toCol];
  if (targetPiece) {
    const isTargetWhite = targetPiece === targetPiece.toUpperCase();
    if (isWhitePiece === isTargetWhite) {
      return false;
    }
  }
  
  // Check piece-specific moves
  if (!isPieceMoveLegal(board, piece.toLowerCase(), fromRow, fromCol, toRow, toCol, isWhitePiece, gameState)) {
    return false;
  }
  
  // Check if move would leave king in check
  const testBoard = JSON.parse(JSON.stringify(board));
  testBoard[7 - toRow][toCol] = testBoard[7 - fromRow][fromCol];
  testBoard[7 - fromRow][fromCol] = null;
  
  if (isKingInCheck(testBoard, playerColor)) {
    return false;
  }
  
  return true;
}

function isPieceMoveLegal(board, piece, fromRow, fromCol, toRow, toCol, isWhite, gameState) {
  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;
  const absRowDiff = Math.abs(rowDiff);
  const absColDiff = Math.abs(colDiff);
  
  switch (piece) {
    case 'p': // Pawn
      const direction = isWhite ? 1 : -1;
      const startRow = isWhite ? 1 : 6;
      
      // Forward move
      if (colDiff === 0) {
        if (rowDiff === direction && !board[7 - toRow][toCol]) {
          return true;
        }
        if (fromRow === startRow && rowDiff === 2 * direction && !board[7 - toRow][toCol]) {
          return true;
        }
      }
      // Diagonal capture
      else if (absColDiff === 1 && rowDiff === direction) {
        // Regular capture
        if (board[7 - toRow][toCol]) {
          return true;
        }
        // En passant
        if (gameState && gameState.lastMove) {
          const lastMove = gameState.lastMove;
          const lastFromRow = parseInt(lastMove.from[1]) - 1;
          const lastToRow = parseInt(lastMove.to[1]) - 1;
          const lastToCol = lastMove.to.charCodeAt(0) - 97;
          
          // Check if last move was pawn moving two squares
          if (lastMove.piece.toLowerCase() === 'p' && 
              Math.abs(lastToRow - lastFromRow) === 2 &&
              lastToCol === toCol && // Same column as target
              lastToRow === fromRow && // Adjacent row
              toRow === (isWhite ? 5 : 2)) { // En passant target row
            return true;
          }
        }
      }
      return false;
      
    case 'r': // Rook
      if (rowDiff === 0 || colDiff === 0) {
        return isPathClear(board, fromRow, fromCol, toRow, toCol);
      }
      return false;
      
    case 'n': // Knight
      return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
      
    case 'b': // Bishop
      if (absRowDiff === absColDiff && absRowDiff > 0) {
        return isPathClear(board, fromRow, fromCol, toRow, toCol);
      }
      return false;
      
    case 'q': // Queen
      if ((rowDiff === 0 || colDiff === 0 || absRowDiff === absColDiff) && (absRowDiff > 0 || absColDiff > 0)) {
        return isPathClear(board, fromRow, fromCol, toRow, toCol);
      }
      return false;
      
    case 'k': // King
      // Regular king move
      if (absRowDiff <= 1 && absColDiff <= 1 && (absRowDiff > 0 || absColDiff > 0)) {
        return true;
      }
      
      // Castling
      if (absRowDiff === 0 && absColDiff === 2) {
        const startRow = isWhite ? 0 : 7;
        const kingStartCol = 4;
        
        // King must be on starting position
        if (fromRow !== startRow || fromCol !== kingStartCol) {
          return false;
        }
        
        // King must not be in check
        if (isKingInCheck(board, isWhite ? 'white' : 'black')) {
          return false;
        }
        
        const isKingSide = colDiff > 0;
        const rookCol = isKingSide ? 7 : 0;
        const rook = board[7 - fromRow][rookCol];
        
        // Check if rook exists and is correct color
        if (!rook || rook.toLowerCase() !== 'r' || ((rook === rook.toUpperCase()) !== isWhite)) {
          return false;
        }
        
        // Check if path is clear between king and rook
        const step = isKingSide ? 1 : -1;
        const startCol = fromCol + step;
        const endCol = isKingSide ? rookCol - 1 : rookCol + 1;
        
        for (let col = startCol; col !== endCol + step; col += step) {
          if (board[7 - fromRow][col]) {
            return false;
          }
        }
        
        // Check if king doesn't pass through check
        for (let i = 1; i <= 2; i++) {
          const testBoard = JSON.parse(JSON.stringify(board));
          testBoard[7 - fromRow][fromCol + (i * step)] = testBoard[7 - fromRow][fromCol];
          testBoard[7 - fromRow][fromCol] = null;
          if (isKingInCheck(testBoard, isWhite ? 'white' : 'black')) {
            return false;
          }
        }
        
        return true;
      }
      return false;
      
    default:
      return false;
  }
}

function isPathClear(board, fromRow, fromCol, toRow, toCol) {
  const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
  const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
  
  let currentRow = fromRow + rowStep;
  let currentCol = fromCol + colStep;
  
  while (currentRow !== toRow || currentCol !== toCol) {
    if (board[7 - currentRow][currentCol]) {
      return false;
    }
    currentRow += rowStep;
    currentCol += colStep;
  }
  
  return true;
}

function isKingInCheck(board, color) {
  // Find king position
  const kingPiece = color === 'white' ? 'K' : 'k';
  let kingRow = -1, kingCol = -1;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === kingPiece) {
        kingRow = 7 - row;
        kingCol = col;
        break;
      }
    }
    if (kingRow !== -1) break;
  }
  
  if (kingRow === -1) return false;
  
  // Check if any opponent piece can attack the king
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        const isPieceWhite = piece === piece.toUpperCase();
        if ((color === 'white' && !isPieceWhite) || (color === 'black' && isPieceWhite)) {
          const fromRow = 7 - row;
          const fromCol = col;
          if (isPieceMoveLegal(board, piece.toLowerCase(), fromRow, fromCol, kingRow, kingCol, isPieceWhite)) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
}

function isCheckmate(board, color) {
  if (!isKingInCheck(board, color)) {
    return false;
  }
  
  // Try all possible moves
  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[7 - fromRow][fromCol];
      if (piece) {
        const isPieceWhite = piece === piece.toUpperCase();
        if ((color === 'white' && isPieceWhite) || (color === 'black' && !isPieceWhite)) {
          for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
              const from = String.fromCharCode(97 + fromCol) + (fromRow + 1);
              const to = String.fromCharCode(97 + toCol) + (toRow + 1);
              if (isValidMove(board, from, to, color)) {
                return false; // Found a legal move
              }
            }
          }
        }
      }
    }
  }
  
  return true;
}

function isStalemate(board, color) {
  if (isKingInCheck(board, color)) {
    return false;
  }
  
  // Check if player has any legal moves
  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[7 - fromRow][fromCol];
      if (piece) {
        const isPieceWhite = piece === piece.toUpperCase();
        if ((color === 'white' && isPieceWhite) || (color === 'black' && !isPieceWhite)) {
          for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
              const from = String.fromCharCode(97 + fromCol) + (fromRow + 1);
              const to = String.fromCharCode(97 + toCol) + (toRow + 1);
              if (isValidMove(board, from, to, color)) {
                return false; // Found a legal move
              }
            }
          }
        }
      }
    }
  }
  
  return true;
}

function makeMove(board, from, to, gameState) {
  const fromRow = parseInt(from[1]) - 1;
  const fromCol = from.charCodeAt(0) - 97;
  const toRow = parseInt(to[1]) - 1;
  const toCol = to.charCodeAt(0) - 97;
  
  const piece = board[7 - fromRow][fromCol];
  const captured = board[7 - toRow][toCol];
  
  board[7 - fromRow][fromCol] = null;
  board[7 - toRow][toCol] = piece;
  
  let specialMove = null;
  
  // Handle castling
  if (piece.toLowerCase() === 'k' && Math.abs(toCol - fromCol) === 2) {
    const isKingSide = toCol > fromCol;
    const rookFromCol = isKingSide ? 7 : 0;
    const rookToCol = isKingSide ? toCol - 1 : toCol + 1;
    
    const rook = board[7 - fromRow][rookFromCol];
    board[7 - fromRow][rookFromCol] = null;
    board[7 - fromRow][rookToCol] = rook;
    
    specialMove = {
      type: 'castling',
      side: isKingSide ? 'kingside' : 'queenside',
      rookFrom: String.fromCharCode(97 + rookFromCol) + (fromRow + 1),
      rookTo: String.fromCharCode(97 + rookToCol) + (fromRow + 1)
    };
  }
  
  // Handle en passant
  if (piece.toLowerCase() === 'p' && Math.abs(toCol - fromCol) === 1 && !captured) {
    // En passant capture
    const capturedPawnRow = fromRow;
    const capturedPawn = board[7 - capturedPawnRow][toCol];
    board[7 - capturedPawnRow][toCol] = null;
    
    specialMove = {
      type: 'enpassant',
      capturedSquare: String.fromCharCode(97 + toCol) + (capturedPawnRow + 1),
      capturedPiece: capturedPawn
    };
  }
  
  // Handle pawn promotion
  let promotion = null;
  if (piece.toLowerCase() === 'p') {
    const isWhite = piece === piece.toUpperCase();
    if ((isWhite && toRow === 7) || (!isWhite && toRow === 0)) {
      // Default promotion to queen, can be customized later
      const promotionPiece = isWhite ? 'Q' : 'q';
      board[7 - toRow][toCol] = promotionPiece;
      promotion = promotionPiece;
    }
  }
  
  return {
    piece: piece,
    from: from,
    to: to,
    captured: captured,
    promotion: promotion,
    specialMove: specialMove
  };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at:`);
  console.log(`- Local: http://localhost:${PORT}`);
  console.log(`- Network: http://[YOUR_IP_ADDRESS]:${PORT}`);
});
