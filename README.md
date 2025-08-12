# TechStack - Programming Q&A with Chess

A modern StackOverflow-like interface with an integrated online chess game. Built with Node.js, Express, Socket.IO, and vanilla JavaScript.

## Features

### Main Platform
- 📝 StackOverflow-like Q&A interface
- 🏷️ Tagging system for questions
- 👤 User profiles and voting system
- 💬 Real-time chat/comments section
- 🕒 Live time display in header
- 📱 Responsive design

### Chess Game
- ♟️ Beautiful Chess.com-style board
- 🌐 Online multiplayer over local network
- ⏱️ Multiple time controls: 3+2, 5+0, 5+5
- 👥 Real-time gameplay with Socket.IO
- 📊 Game status and timer display
- 🎯 Styled as an attractive sidebar "ad"

### Technical Features
- 🚀 Real-time communication with Socket.IO
- 📡 Network play (friends can join via your IP)
- 💅 Modern CSS with gradients and animations
- 📱 Mobile-responsive design
- ⚡ Fast and interactive UX
- 🎨 Professional UI/UX design

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation
1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application
1. Start the server:
   ```bash
   npm start
   ```
   
2. Open your browser and go to:
   - Local: `http://localhost:3000`
   - Network: `http://[YOUR-IP-ADDRESS]:3000`

3. Share your network IP with friends so they can join chess games!

### For Development
```bash
npm run dev  # Uses nodemon for auto-restart
```

## How to Play Chess Online

1. **Start a Game:**
   - Enter your name
   - Choose time control (3+2, 5+0, or 5+5)
   - Click "Join Game"
   - Share the Game ID with your opponent

2. **Network Play:**
   - Start the server on your computer
   - Share your IP address with friends
   - Friends can access: `http://[YOUR-IP]:3000`
   - Use the same Game ID to play together

3. **Game Controls:**
   - Click a piece to select it
   - Click destination square to move
   - Timer automatically switches between players
   - Game ends when time runs out or checkmate

## Project Structure

```
chess-stackoverflow/
├── server.js          # Express server with Socket.IO
├── package.json       # Dependencies and scripts
├── public/
│   ├── index.html     # Main HTML structure
│   ├── style.css      # Beautiful CSS styling
│   └── app.js         # Client-side JavaScript
└── README.md          # This file
```

## Technology Stack

- **Backend:** Node.js, Express.js
- **Real-time:** Socket.IO
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Styling:** Modern CSS with Flexbox/Grid
- **Icons:** Font Awesome
- **Chess:** Custom implementation with real-time sync

## Features in Detail

### Q&A Platform
- Create and edit questions with rich content
- Tag-based categorization
- Voting system for quality content
- User attribution and timestamps
- Search and filter capabilities

### Chess Integration
- Seamless integration as sidebar "advertisement"
- Multiple time control formats
- Real-time move synchronization
- Beautiful piece animations
- Chess.com-inspired design

### User Experience
- Intuitive drag-and-drop chess interface
- Responsive design for all devices
- Real-time chat for community interaction
- Professional color scheme and typography
- Smooth animations and transitions

## Network Configuration

To allow friends to connect over your network:

1. Find your local IP address:
   - Windows: `ipconfig` in Command Prompt
   - macOS/Linux: `ifconfig` in Terminal

2. Make sure port 3000 is not blocked by firewall

3. Share the URL: `http://[YOUR-IP]:3000`

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use this project as a base for your own applications.

---

Enjoy playing chess while browsing programming questions! 🎯♟️
