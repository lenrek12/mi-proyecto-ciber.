const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

// Permite leer la IP real del visitante detrás del proxy de Render
app.set('trust proxy', true);

app.use(express.json());

// Arreglo en memoria para guardar las visitas
let registrosIP = [];

const CONTRASEÑA_ADMIN = 'lenrek_171026+16';

// Función para identificar el tipo de dispositivo desde el User-Agent
function detectarDispositivo(userAgent = '') {
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    if (/tablet|ipad/i.test(ua)) {
      return 'Tablet';
    }
    return 'Celular';
  }
  return 'Computadora (PC/Laptop)';
}

// 1. CAPTURA DE IP EN LA RUTA PRINCIPAL (Debe ir antes de express.static)
app.get('/', (req, res) => {
  // Obtener la IP pública real del cliente
  const rawIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || 'Desconocida';
  const ipCliente = rawIp.replace(/^.*:/, '') || rawIp;
  
  const fecha = new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' });
  const userAgent = req.headers['user-agent'] || 'Desconocido';
  const tipoDispositivo = detectarDispositivo(userAgent);

  // Guardar la nueva visita
  registrosIP.unshift({
    ip: ipCliente,
    fecha: fecha,
    dispositivo: tipoDispositivo,
    userAgent: userAgent
  });

  console.log(`[NUEVA VISITA] IP: ${ipCliente} | Dispositivo: ${tipoDispositivo}`);

  // Entregar el archivo principal manualmente
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. Servir el resto de archivos estáticos (CSS, imágenes, admin.html, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint para validar la contraseña
app.post('/api/login-admin', (req, res) => {
  const { password } = req.body;
  if (password === CONTRASEÑA_ADMIN) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
});

// Endpoint protegido para obtener los datos en JSON
app.post('/api/obtener-ips', (req, res) => {
  const { password } = req.body;
  if (password !== CONTRASEÑA_ADMIN) {
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }
  res.json(registrosIP);
});

// Endpoint para descargar el archivo .txt
app.post('/api/descargar-txt', (req, res) => {
  const { password } = req.body;
  if (password !== CONTRASEÑA_ADMIN) {
    return res.status(403).send('Acceso denegado');
  }

  let contenidoTxt = '===========================================\n';
  contenidoTxt += '       REPORTE DE CAPTURA DE IP Y DISPOSITIVOS\n';
  contenidoTxt += `       Generado el: ${new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}\n`;
  contenidoTxt += '===========================================\n\n';

  if (registrosIP.length === 0) {
    contenidoTxt += 'No hay registros capturados aún.\n';
  } else {
    registrosIP.forEach((reg, index) => {
      contenidoTxt += `[#${index + 1}]\n`;
      contenidoTxt += `IP Público  : ${reg.ip}\n`;
      contenidoTxt += `Fecha/Hora  : ${reg.fecha}\n`;
      contenidoTxt += `Dispositivo : ${reg.dispositivo}\n`;
      contenidoTxt += `Detalle UA  : ${reg.userAgent}\n`;
      contenidoTxt += '-------------------------------------------\n';
    });
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="registros_ip.txt"');
  res.send(contenidoTxt);
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});
