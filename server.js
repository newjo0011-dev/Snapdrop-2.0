const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" } // Permite que qualquer página acesse o servidor
});

const salas = {}; // Guarda os dispositivos conectados por IP

io.on('connection', (socket) => {
    // Detecta o IP do usuário para juntar quem está no mesmo Wi-Fi
    const ipUsuario = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

    if (!salas[ipUsuario]) salas[ipUsuario] = [];
    salas[ipUsuario].push(socket.id);

    // Coloca o usuário em uma "sala" baseada no IP dele
    socket.join(ipUsuario);

    // Avisa os outros aparelhos no mesmo Wi-Fi que alguém entrou
    socket.to(ipUsuario).emit('usuario-conectado', socket.id);

    // Repassa os sinais do WebRTC (dados de conexão) entre os aparelhos
    socket.on('sinal', (dados) => {
        io.to(dados.para).emit('sinal', { de: socket.id, sinal: dados.sinal });
    });

    // Remove o aparelho da lista quando ele fecha o site
    socket.on('disconnect', () => {
        if (salas[ipUsuario]) {
            salas[ipUsuario] = salas[ipUsuario].filter(id => id !== socket.id);
        }
        socket.to(ipUsuario).emit('usuario-desconectado', socket.id);
    });
});

// Roda o servidor na porta padrão do ambiente ou na 3000
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Servidor de sinalização rodando na porta ${PORT}`);
});