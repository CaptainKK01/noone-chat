const socket = io();

let myUsername = "";
let currentRoomId = "";

// 1. Handle GhostID Submission
function setUsername() {
    const input = document.getElementById('usernameInput').value.trim();
    if (!input) {
        alert("Enter your GhostID to proceed.");
        return;
    }
    myUsername = input;
    document.getElementById('displayUsername').textContent = myUsername;
    
    // Hide modal, show lobby
    document.getElementById('usernameModal').classList.add('hidden');
    document.getElementById('lobbyScreen').classList.remove('hidden');
}

// 2. Generate a random dark Space ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function createRoom() {
    currentRoomId = generateRoomId();
    socket.emit('create_room', { username: myUsername, roomId: currentRoomId });
}

function joinRoom() {
    const roomId = document.getElementById('roomIdInput').value.trim().toUpperCase();
    if (!roomId) {
        alert("Enter a valid Space ID.");
        return;
    }
    currentRoomId = roomId;
    socket.emit('join_room', { username: myUsername, roomId: currentRoomId });
}

// 3. Room Joined Event Success
socket.on('room_joined', ({ roomId }) => {
    document.getElementById('lobbyScreen').classList.add('hidden');
    document.getElementById('chatScreen').classList.remove('hidden');
    document.getElementById('activeRoomId').textContent = roomId;
    appendSystemMessage(`You have entered Space [${roomId}]. The portal is open.`);
});

socket.on('error_message', (msg) => {
    alert(msg);
});

// 4. Notifications for souls joining/leaving
socket.on('user_joined', ({ username }) => {
    appendSystemMessage(`Soul '${username}' has materialized into the space.`);
});

socket.on('user_left', ({ username }) => {
    appendSystemMessage(`Soul '${username}' has vanished into the shadows.`);
});

// 5. Messaging Logic
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    if (!message) return;

    socket.emit('send_message', { roomId: currentRoomId, username: MyUsernameCheck(myUsername), message });
    input.value = '';
}

function MyUsernameCheck(name) {
    return name;
}

function handleKeypress(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
}

socket.on('receive_message', ({ username, message, time }) => {
    const chatMessages = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    
    const isMe = username === myUsername;
    msgDiv.className = `message ${isMe ? 'outgoing' : 'incoming'}`;
    
    msgDiv.innerHTML = `
        <span class="msg-user">${isMe ? 'You' : username} • ${time}</span>
        <span>${escapeHtml(message)}</span>
    `;
    
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

function appendSystemMessage(text) {
    const chatMessages = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message system';
    msgDiv.textContent = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function leaveRoom() {
    window.location.reload(); 
}

// Security helper to prevent HTML injection
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}