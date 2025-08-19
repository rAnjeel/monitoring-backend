const { io } = require("socket.io-client");

const socket = io("http://localhost:3000"); // ton backend Nest

socket.on("connect", () => {
  console.log("✅ Connecté au serveur Socket.IO");

  // Simuler un login
  socket.emit("login_attempt", {
    Ip: "10.14.50.146",
    siteUsername: "admin",
    sitePassword: "wrongpass",
    sitePort: 22
  });
});

socket.on("login_result", (data) => {
  console.log("📩 Résultat pour moi :", data);
});

socket.on("login_attempt_log", (data) => {
  console.log("📢 Log reçu :", data);
});
