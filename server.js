const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Store active room details to track participants
const activeRooms = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // User creates a new private room
    socket.ioCreateRoom = io;
    socket.on('create_room', ({ username, roomId }) => {
        socket.join(roomId);
        activeRooms[roomId] = activeRooms[roomId] || [];
        activeRooms[roomId].push({ id: socket.id, username });

        socket.emit('room_joined', { roomId, username });
        console.log(`Room created: ${roomId} by ${username}`);
    });

    // User joins an existing room via Room ID
    socket.on('join_room', ({ username, roomId }) => {
        if (io.sockets.adapter.rooms.has(roomId)) {
            socket.join(roomId);
            activeRooms[roomId] = activeRooms[roomId] || [];
            activeRooms[roomId].push({ id: socket.id, username });

            socket.emit('room_joined', { roomId, username });
            // Notify others in the room
            socket.to(roomId).emit('user_joined', { username });
            console.log(`${username} joined room: ${roomId}`);
        } else {
            socket.emit('error_message', 'Room ID does not exist or has expired.');
        }
    });

    // Handle incoming chat messages
    socket.on('send_message', ({ roomId, username, message }) => {
        io.to(roomId).emit('receive_message', { username, message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    });

    // Handle user disconnection / leaving room
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        for (const roomId in activeRooms) {
            const index = activeRooms[roomId].findIndex(user => user.id === socket.id);
            if (index !== -1) {
                const leavingUser = activeRooms[roomId][index];
                activeRooms[roomId].splice(index, 1);
                
                // Notify room members
                io.to(roomId).emit('user_left', { username: leavingUser.username });

                // If room becomes empty, clean it up (Ephemeral self-destruction)
                if (activeRooms[roomId].length === 0) {
                    delete activeRooms[roomId];
                    console.log(`Room ${roomId} is empty and has been destroyed.`);
                }
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running smoothly at http://localhost:${PORT}`);
});