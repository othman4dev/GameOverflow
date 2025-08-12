const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const bodyParser = require('body-parser');

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

// Rate limiting for moves
const moveRateLimit = new Map();
const MOVE_RATE_LIMIT = 50; // 50ms minimum between moves
const MAX_MOVES_PER_MINUTE = 60;

// Cleanup old games every hour
setInterval(() => {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  
  for (const [gameId, game] of games.entries()) {
    // Remove games that are finished and older than 1 hour
    if (game.gameState === 'finished' && (now - game.lastMoveTime) > ONE_HOUR) {
      console.log(`Cleaning up old game: ${gameId}`);
      games.delete(gameId);
    }
    // Remove abandoned games older than 30 minutes
    else if (game.gameState === 'abandoned' && (now - game.lastMoveTime) > (30 * 60 * 1000)) {
      console.log(`Cleaning up abandoned game: ${gameId}`);
      games.delete(gameId);
    }
  }
  
  // Clean up orphaned rate limit data
  for (const [playerId, rateData] of moveRateLimit.entries()) {
    if ((now - rateData.lastMove) > ONE_HOUR) {
      moveRateLimit.delete(playerId);
    }
  }
  
  console.log(`Active games: ${games.size}, Rate limit entries: ${moveRateLimit.size}`);
}, 60 * 60 * 1000); // Run every hour

// Initial blog posts
const blogPosts = [
  {
    id: uuidv4(),
    title: "How to generate UUID v4 in JavaScript without external libraries?",
    content: "I need to generate UUID v4 in my JavaScript application but I don't want to add any external dependencies. Is there a way to do this with just vanilla JavaScript? I've seen some implementations using Math.random() but I'm not sure if they're cryptographically secure.\n\nI've tried this approach:\n```javascript\nfunction generateUUID() {\n  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {\n    const r = Math.random() * 16 | 0;\n    const v = c === 'x' ? r : (r & 0x3 | 0x8);\n    return v.toString(16);\n  });\n}\n```\n\nBut I'm concerned about the randomness quality. What's the best practice for production applications?",
    author: "devNewbie2024",
    votes: 187,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    tags: ["javascript", "uuid", "random", "security"],
    answers: 12,
    views: 15420
  },
  {
    id: uuidv4(),
    title: "UUID performance vs auto-increment integers in PostgreSQL",
    content: "I'm designing a new database schema and considering whether to use UUIDs or auto-increment integers as primary keys. What are the performance implications? I've heard UUIDs can slow down queries due to their size and randomness. My application will have millions of records.\n\nSpecific concerns:\n1. Index performance with UUID primary keys\n2. Storage overhead (16 bytes vs 4/8 bytes)\n3. INSERT performance with random UUIDs\n4. Foreign key join performance\n\nWould using UUID v1 (timestamp-based) help with the locality issues? Are there any PostgreSQL-specific optimizations I should know about?",
    author: "DatabaseArchitect",
    votes: 143,
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    tags: ["postgresql", "uuid", "performance", "database-design", "indexing"],
    answers: 8,
    views: 9834
  },
  {
    id: uuidv4(),
    title: "React useEffect dependency array with objects causing infinite re-renders",
    content: "I'm having trouble with useEffect causing infinite re-renders when I include an object in the dependency array. Here's my code:\n\n```javascript\nconst MyComponent = ({ config }) => {\n  const [data, setData] = useState(null);\n  \n  useEffect(() => {\n    fetchData(config).then(setData);\n  }, [config]); // This causes infinite re-renders\n  \n  return <div>{data?.name}</div>;\n};\n```\n\nThe parent component creates a new `config` object on every render. I know I can use `useMemo` in the parent, but is there a way to handle this in the child component? I've tried `JSON.stringify` but that feels hacky.\n\nWhat's the best practice for handling object dependencies in useEffect?",
    author: "ReactDeveloper123",
    votes: 234,
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    tags: ["reactjs", "hooks", "useeffect", "javascript"],
    answers: 15,
    views: 18943
  },
  {
    id: uuidv4(),
    title: "Why does UUID.randomUUID() sometimes produce duplicate values?",
    content: "I'm using Java's UUID.randomUUID() method in a multi-threaded application and occasionally getting duplicate UUIDs. This shouldn't be possible with proper UUID v4 generation. Could this be related to threading issues or insufficient entropy?\n\n```java\npublic class UUIDGenerator {\n    private static final ExecutorService executor = Executors.newFixedThreadPool(10);\n    private static final Set<String> generatedUUIDs = new ConcurrentHashMap().newKeySet();\n    \n    public void generateUUIDs() {\n        for (int i = 0; i < 1000; i++) {\n            executor.submit(() -> {\n                String uuid = UUID.randomUUID().toString();\n                if (!generatedUUIDs.add(uuid)) {\n                    System.out.println(\"Duplicate UUID: \" + uuid);\n                }\n            });\n        }\n    }\n}\n```\n\nI'm seeing duplicates about once every 10,000 generations. Is this normal? How can I ensure truly unique UUIDs?",
    author: "JavaDeveloper123",
    votes: 89,
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
    tags: ["java", "uuid", "multithreading", "random", "concurrency"],
    answers: 5,
    views: 6721
  },
  {
    id: uuidv4(),
    title: "Best practices for storing UUIDs in MongoDB",
    content: "What's the recommended way to store UUIDs in MongoDB? Should I use the UUID BSON type or store them as strings? I'm concerned about storage efficiency and query performance. Also, should I use UUID v4 or would v1 be better for time-based queries?\n\n```javascript\n// Option 1: String\n{\n  _id: ObjectId(),\n  userId: \"550e8400-e29b-41d4-a716-446655440000\",\n  createdAt: ISODate()\n}\n\n// Option 2: UUID BSON\n{\n  _id: ObjectId(),\n  userId: UUID(\"550e8400-e29b-41d4-a716-446655440000\"),\n  createdAt: ISODate()\n}\n\n// Option 3: UUID as _id\n{\n  _id: UUID(\"550e8400-e29b-41d4-a716-446655440000\"),\n  createdAt: ISODate()\n}\n```\n\nWhich approach gives the best performance for:\n- Indexing\n- Query operations\n- Storage efficiency\n- Cross-language compatibility",
    author: "MongoMaster",
    votes: 76,
    timestamp: new Date(Date.now() - 16 * 60 * 60 * 1000),
    tags: ["mongodb", "uuid", "bson", "storage", "performance"],
    answers: 7,
    views: 4532
  },
  {
    id: uuidv4(),
    title: "Convert UUID to short URL-safe string for public APIs",
    content: "I need to expose UUIDs in public APIs but they're quite long and not very user-friendly. What's the best way to convert a UUID to a shorter, URL-safe string that I can later convert back to the original UUID? Base64 encoding removes some characters but still quite long.\n\n```python\nimport uuid\nimport base64\n\n# Original UUID\noriginal_uuid = uuid.uuid4()\nprint(f\"Original: {original_uuid}\")  # 550e8400-e29b-41d4-a716-446655440000\n\n# Base64 encoding\nuuid_bytes = original_uuid.bytes\nencoded = base64.urlsafe_b64encode(uuid_bytes).decode('ascii').rstrip('=')\nprint(f\"Encoded: {encoded}\")  # VQ6EAOKbQdSnFkRmVUQAAA\n\n# Decoding\npadded = encoded + '=' * (4 - len(encoded) % 4)\ndecoded_bytes = base64.urlsafe_b64decode(padded)\ndecoded_uuid = uuid.UUID(bytes=decoded_bytes)\nprint(f\"Decoded: {decoded_uuid}\")\n```\n\nThis gives me 22 characters instead of 36. Is there a better approach? What about base58 or base32?",
    author: "APIDesigner",
    votes: 156,
    timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000),
    tags: ["uuid", "encoding", "api-design", "url", "base64"],
    answers: 11,
    views: 12678
  },
  {
    id: uuidv4(),
    title: "Python asyncio: How to properly handle exceptions in concurrent tasks?",
    content: "I'm working with asyncio and having trouble properly handling exceptions when running multiple tasks concurrently. Some tasks fail but others succeed, and I want to collect both results and errors.\n\n```python\nimport asyncio\nimport aiohttp\nimport logging\n\nasync def fetch_url(session, url):\n    try:\n        async with session.get(url) as response:\n            return await response.text()\n    except Exception as e:\n        logging.error(f\"Error fetching {url}: {e}\")\n        raise\n\nasync def main():\n    urls = ['http://example.com', 'http://invalid-url', 'http://google.com']\n    \n    async with aiohttp.ClientSession() as session:\n        tasks = [fetch_url(session, url) for url in urls]\n        \n        # How do I get both successful results and errors?\n        results = await asyncio.gather(*tasks, return_exceptions=True)\n        \n        for i, result in enumerate(results):\n            if isinstance(result, Exception):\n                print(f\"URL {urls[i]} failed: {result}\")\n            else:\n                print(f\"URL {urls[i]} succeeded: {len(result)} chars\")\n```\n\nIs `return_exceptions=True` the right approach? What about using `asyncio.as_completed()` instead?",
    author: "PythonAsync",
    votes: 198,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    tags: ["python", "asyncio", "exception-handling", "aiohttp", "concurrency"],
    answers: 9,
    views: 11234
  },
  {
    id: uuidv4(),
    title: "Validating UUID format with regex - what's the best pattern?",
    content: "I need to validate UUID strings on both client and server side. What's the most reliable regex pattern for UUID validation? I've found several different patterns online and not sure which one is the most comprehensive and handles edge cases properly.\n\n```javascript\n// Pattern 1 - Simple\nconst pattern1 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;\n\n// Pattern 2 - With version validation\nconst pattern2 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;\n\n// Pattern 3 - RFC 4122 compliant\nconst pattern3 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;\n\nfunction validateUUID(uuid) {\n    return pattern2.test(uuid);\n}\n```\n\nShould I validate the version bits and variant bits? What about case sensitivity? Also, do I need to handle UUID formats without hyphens?",
    author: "ValidationExpert",
    votes: 298,
    timestamp: new Date(Date.now() - 30 * 60 * 60 * 1000),
    tags: ["regex", "uuid", "validation", "javascript", "rfc4122"],
    answers: 13,
    views: 23456
  },
  {
    id: uuidv4(),
    title: "Memory usage of UUID vs Long in Java applications",
    content: "I'm building a high-throughput Java application that processes millions of records. Each record has an identifier that could be either a UUID (128-bit) or a Long (64-bit). What's the real-world memory impact of using UUIDs? Should I be concerned about GC pressure?\n\n```java\npublic class PerformanceTest {\n    private static final int RECORD_COUNT = 10_000_000;\n    \n    static class RecordWithLong {\n        private final long id;\n        private final String data;\n        \n        RecordWithLong(long id, String data) {\n            this.id = id;\n            this.data = data;\n        }\n    }\n    \n    static class RecordWithUUID {\n        private final UUID id;\n        private final String data;\n        \n        RecordWithUUID(UUID id, String data) {\n            this.id = id;\n            this.data = data;\n        }\n    }\n    \n    public static void testMemoryUsage() {\n        // Test with Long IDs\n        List<RecordWithLong> longRecords = new ArrayList<>();\n        for (int i = 0; i < RECORD_COUNT; i++) {\n            longRecords.add(new RecordWithLong(i, \"data\" + i));\n        }\n        \n        // Test with UUID IDs\n        List<RecordWithUUID> uuidRecords = new ArrayList<>();\n        for (int i = 0; i < RECORD_COUNT; i++) {\n            uuidRecords.add(new RecordWithUUID(UUID.randomUUID(), \"data\" + i));\n        }\n    }\n}\n```\n\nI've measured about 40% more memory usage with UUIDs. Is this worth the benefits of globally unique IDs?",
    author: "PerformanceGuru",
    votes: 67,
    timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000),
    tags: ["java", "uuid", "memory", "performance", "gc"],
    answers: 6,
    views: 5432
  },
  {
    id: uuidv4(),
    title: "CSS Grid vs Flexbox: When to use which layout method?",
    content: "I'm confused about when to use CSS Grid vs Flexbox. Both seem to solve similar problems but I keep reading conflicting advice. Can someone explain the key differences and provide clear guidelines on when to use each?\n\n```css\n/* Flexbox approach */\n.flex-container {\n    display: flex;\n    flex-direction: row;\n    justify-content: space-between;\n    align-items: center;\n}\n\n.flex-item {\n    flex: 1;\n}\n\n/* Grid approach */\n.grid-container {\n    display: grid;\n    grid-template-columns: repeat(3, 1fr);\n    grid-gap: 20px;\n    align-items: center;\n}\n\n.grid-item {\n    /* No additional CSS needed */\n}\n```\n\nI understand that Grid is 2D and Flexbox is 1D, but in practice, when should I choose one over the other? What about browser support and performance considerations?",
    author: "CSSDesigner",
    votes: 445,
    timestamp: new Date(Date.now() - 40 * 60 * 60 * 1000),
    tags: ["css", "css-grid", "flexbox", "layout", "web-design"],
    answers: 18,
    views: 28934
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
        drawOfferCooldown: 0, // Track moves since last draw offer
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
    try {
      const { gameId, from, to } = data;
      
      // Rate limiting
      const now = Date.now();
      const playerRateData = moveRateLimit.get(socket.id) || { lastMove: 0, moveCount: 0, windowStart: now };
      
      // Check minimum time between moves
      if (now - playerRateData.lastMove < MOVE_RATE_LIMIT) {
        console.warn('Move rate limit exceeded by', socket.id);
        return;
      }
      
      // Reset window if needed
      if (now - playerRateData.windowStart > 60000) {
        playerRateData.moveCount = 0;
        playerRateData.windowStart = now;
      }
      
      // Check moves per minute limit
      if (playerRateData.moveCount >= MAX_MOVES_PER_MINUTE) {
        console.warn('Moves per minute limit exceeded by', socket.id);
        return;
      }
      
      // Update rate limit data
      playerRateData.lastMove = now;
      playerRateData.moveCount++;
      moveRateLimit.set(socket.id, playerRateData);
      
      // Validate input data
      if (!gameId || !from || !to || 
          typeof gameId !== 'string' || 
          typeof from !== 'object' || typeof to !== 'object' ||
          typeof from.row !== 'number' || typeof from.col !== 'number' ||
          typeof to.row !== 'number' || typeof to.col !== 'number' ||
          from.row < 0 || from.row > 7 || from.col < 0 || from.col > 7 ||
          to.row < 0 || to.row > 7 || to.col < 0 || to.col > 7) {
        console.error('Invalid move data received from', socket.id);
        return;
      }
      
      const game = games.get(gameId);
      const player = players.get(socket.id);
      
      if (!game || !player) {
        console.error('Game or player not found for move request');
        return;
      }
      
      // Validate game state and player turn
      if (game.gameState !== 'active') {
        console.error('Move attempted on inactive game');
        return;
      }
      
      if (game.currentPlayer !== player.color) {
        console.error('Move attempted by wrong player');
        return;
      }
      
      // Validate that the player is actually in this game
      const playerInGame = game.players.find(p => p.id === socket.id);
      if (!playerInGame) {
        console.error('Player not in game attempting move');
        return;
      }
    
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
        
        // Increment draw offer cooldown
        game.drawOfferCooldown++;
        
        // Clear any existing draw offers after a move
        game.drawOffer = null;
        
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
    } catch (error) {
      console.error('Error processing move:', error);
      socket.emit('message-error', { error: 'Move processing failed' });
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
      // Check if enough moves have passed since last draw offer (minimum 5 moves)
      if (game.drawOfferCooldown < 5) {
        socket.emit('draw-offer-denied', { 
          reason: `Must wait ${5 - game.drawOfferCooldown} more moves before offering draw again` 
        });
        return;
      }
      
      // Check if this player already has a pending draw offer
      if (game.drawOffer === player.color) {
        socket.emit('draw-offer-denied', { 
          reason: 'You already have a pending draw offer' 
        });
        return;
      }
      
      game.drawOffer = player.color;
      game.drawOfferCooldown = 0; // Reset cooldown after offering
      
      // Pause the game timer to prevent time exploitation
      game.drawOfferTime = Date.now();
      
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
      
      // Resume game timer if draw was declined
      if (!accept && game.drawOfferTime) {
        const timePaused = Date.now() - game.drawOfferTime;
        game.lastMoveTime += timePaused; // Adjust last move time to account for pause
      }
      
      game.drawOffer = null;
      game.drawOfferTime = null;
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
  socket.on('get-possible-moves', (data) => {
    const { gameId, square } = data;
    const game = games.get(gameId);
    const player = players.get(socket.id);
    
    if (game && player && game.gameState === 'active' && game.currentPlayer === player.color) {
      const possibleMoves = getPossibleMovesForSquare(game.board, square, player.color, game);
      socket.emit('possible-moves', { square, moves: possibleMoves });
    }
  });

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
        
        // Send individual game updates to ensure proper color sync
        game.players.forEach(player => {
          io.to(player.id).emit('game-update', game);
        });
        
        // Send to spectators as well
        if (game.spectators && game.spectators.length > 0) {
          game.spectators.forEach(spectator => {
            io.to(spectator.id).emit('game-update', game);
          });
        }
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
    
    // Input validation
    if (!game || !player || !message || typeof message !== 'string') {
      return;
    }
    
    // HTML sanitization - remove HTML tags
    const sanitizedMessage = message.replace(/<[^>]*>/g, '').trim();
    
    if (!sanitizedMessage) {
      return;
    }
    
    // Max length validation (150 characters)
    if (sanitizedMessage.length > 150) {
      socket.emit('message-error', { error: 'Message too long (max 150 characters)' });
      return;
    }
    
    // Basic content filtering
    const forbiddenWords = ['spam', 'hack', 'cheat']; // Add more as needed
    const lowerMessage = sanitizedMessage.toLowerCase();
    if (forbiddenWords.some(word => lowerMessage.includes(word))) {
      socket.emit('message-error', { error: 'Message contains inappropriate content' });
      return;
    }
    
    const messageData = {
      id: uuidv4(),
      gameId: gameId,
      sender: player.name,
      senderColor: player.color,
      message: sanitizedMessage,
      timestamp: new Date(),
      readBy: [socket.id] // Sender automatically reads their own message
    };
    
    if (!game.messages) {
      game.messages = [];
    }
    game.messages.push(messageData);
    
    // Send to all players in the game
    io.to(gameId).emit('new-message', messageData);
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
    
    // Clean up rate limiting data
    moveRateLimit.delete(socket.id);
    
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
            // Give the player 30 seconds to reconnect before abandoning
            setTimeout(() => {
              const currentGame = games.get(player.gameId);
              const currentPlayer = players.get(socket.id);
              if (!currentPlayer && currentGame && currentGame.gameState === 'active') {
                currentGame.gameState = 'abandoned';
                currentGame.endReason = 'disconnection';
                io.to(player.gameId).emit('game-update', currentGame);
              }
            }, 30000);
          }
          io.to(player.gameId).emit('game-update', game);
        }
      }
      players.delete(socket.id);
    }
  });
});

function getPossibleMovesForSquare(board, square, playerColor, gameState) {
  const possibleMoves = [];
  const fromCol = square.charCodeAt(0) - 97;
  const fromRow = parseInt(square[1]) - 1;
  
  // Check bounds
  if (fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7) {
    return possibleMoves;
  }
  
  const piece = board[7 - fromRow][fromCol];
  if (!piece) return possibleMoves;
  
  const isWhitePiece = piece === piece.toUpperCase();
  if ((playerColor === 'white' && !isWhitePiece) || (playerColor === 'black' && isWhitePiece)) {
    return possibleMoves;
  }
  
  // Check all possible destination squares
  for (let toRow = 0; toRow < 8; toRow++) {
    for (let toCol = 0; toCol < 8; toCol++) {
      const to = String.fromCharCode(97 + toCol) + (toRow + 1);
      if (isValidMove(board, square, to, playerColor, gameState)) {
        const targetPiece = board[7 - toRow][toCol];
        const isCapture = targetPiece !== null && targetPiece !== undefined;
        
        possibleMoves.push({
          to: to,
          isCapture: isCapture
        });
      }
    }
  }
  
  return possibleMoves;
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
        
        // Check if king doesn't pass through check or land in check
        for (let i = 1; i <= 2; i++) {
          const testBoard = JSON.parse(JSON.stringify(board));
          const newKingCol = fromCol + (i * step);
          testBoard[7 - fromRow][newKingCol] = testBoard[7 - fromRow][fromCol];
          testBoard[7 - fromRow][fromCol] = null;
          
          // Check if any enemy piece can attack this square
          if (isSquareUnderAttack(testBoard, fromRow, newKingCol, isWhite ? 'black' : 'white')) {
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

function isSquareUnderAttack(board, targetRow, targetCol, attackingColor) {
  // Check if any piece of the attacking color can attack the target square
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        const isPieceWhite = piece === piece.toUpperCase();
        const pieceColor = isPieceWhite ? 'white' : 'black';
        
        if (pieceColor === attackingColor) {
          const fromRow = 7 - row;
          const fromCol = col;
          if (isPieceMoveLegal(board, piece.toLowerCase(), fromRow, fromCol, targetRow, targetCol, isPieceWhite)) {
            return true;
          }
        }
      }
    }
  }
  return false;
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
