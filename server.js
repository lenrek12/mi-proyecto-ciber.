const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const LOG_FILE = path.join(__dirname, 'visits.json');

// Asegurar que el archivo de logs exista
if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, JSON.stringify([]));
}

// Servir archivos estáticos de la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal (Visitantes)
app.get('/', (req, res) => {
    // Capturar la IP real del visitante (incluso si está detrás de un proxy)
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    // Limpiar el formato de la IP
    const clientIp = rawIp.replace(/^.*:/, '') || '127.0.0.1';
    const timestamp = new Date().toLocaleString();

    const newLog = { ip: clientIp, date: timestamp };

    // Guardar la visita en visits.json
    fs.readFile(LOG_FILE, 'utf8', (err, data) => {
        let logs = [];
        if (!err && data) {
            try { logs = JSON.parse(data); } catch (e) { logs = []; }
        }
        logs.push(newLog);
        fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
    });

    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta API para que el panel de administración lea las visitas
app.get('/api/logs', (req, res) => {
    fs.readFile(LOG_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Error al leer registros' });
        res.json(JSON.parse(data || '[]'));
    });
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});