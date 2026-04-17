const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};
const users = {}; // room-wise users

io.on("connection", (socket) => {

    socket.on("join-room", ({ roomId, username }) => {
        socket.join(roomId);

        socket.username = username;
        socket.roomId = roomId;

        // initialize room data
        if (!rooms[roomId]) rooms[roomId] = "";
        if (!users[roomId]) users[roomId] = [];

        // add user
        users[roomId].push(username);

        // send existing doc
        socket.emit("load-document", rooms[roomId]);

        // update user list for everyone
        io.to(roomId).emit("update-users", users[roomId]);
    });

    // document sync
    socket.on("send-changes", (data) => {
        const roomId = socket.roomId;
        rooms[roomId] = data;

        socket.to(roomId).emit("receive-changes", data);
    });

    // chat system
    socket.on("send-message", (msg) => {
        const roomId = socket.roomId;

        io.to(roomId).emit("receive-message", {
            user: socket.username,
            message: msg
        });
    });

    // handle disconnect
    socket.on("disconnect", () => {
        const roomId = socket.roomId;
        const username = socket.username;

        if (users[roomId]) {
            users[roomId] = users[roomId].filter(u => u !== username);

            io.to(roomId).emit("update-users", users[roomId]);
        }
    });
});

server.listen(4000, () => {
    console.log("Server running on http://localhost:4000");
});