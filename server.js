const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with max payload buffer set to 50MB for image transfers
const io = new Server(server, {
    maxHttpBufferSize: 50 * 1024 * 1024 
});

const PORT = process.env.PORT || 3000;

// Serve static frontend files from 'public' folder
app.use(express.static('public'));

// Track active rooms and users
const activeRooms = {};

io.on('connection', (socket) => {
    console.log(`A soul connected: ${socket.id}`);

    // Create a new room
    socket.on('create_room', ({ username, roomId }) => {
        socket.join(roomId);
        activeRooms[roomId] = [{ id: socket.id, username }];
        
        socket.emit('room_joined', { roomId });
        console.log(`Room created: ${roomId} by ${username}`);
    });

    // Join an existing room
    socket.on('join_room', ({ username, roomId }) => {
        if (!activeRooms[roomId]) {
            socket.emit('error_message', 'This realm does not exist or has vanished.');
            return;
        }

        socket.join(roomId);
        activeRooms[roomId].push({ id: socket.id, username });

        socket.emit('room_joined', { roomId });
        socket.to(roomId).emit('user_joined', { username });
        console.log(`${username} joined room: ${roomId}`);
    });

    // Handle text chat messages
    socket.on('send_message', ({ roomId, username, message }) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        io.to(roomId).emit('receive_message', { username, message, time });
    });

    // Handle image transfers
    socket.on('send_image', ({ roomId, username, image, time }) => {
        io.to(roomId).emit('receive_image', { username, image, time });
    });

    // Handle user disconnects & auto-clean empty rooms
    socket.on('disconnect', () => {
        console.log(`Soul disconnected: ${socket.id}`);
        for (const roomId in activeRooms) {
            const index = activeRooms[roomId].findIndex(user => user.id === socket.id);
            if (index !== -1) {
                const leavingUser = activeRooms[roomId][index];
                activeRooms[roomId].splice(index, 1);
                
                io.to(roomId).emit('user_left', { username: leavingUser.username });

                // If room is empty, delete it
                if (activeRooms[roomId].length === 0) {
                    delete activeRooms[roomId];
                    console.log(`Room ${roomId} destroyed due to zero presence.`);
                }
                break;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Hell portal open at http://localhost:${PORT}`);
});