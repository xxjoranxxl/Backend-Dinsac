"use strict";

// server.js
var express = require('express');

var mongoose = require('mongoose');

var cors = require('cors');

var _require = require('socket.io'),
    Server = _require.Server;

var http = require('http');

var path = require('path');

var fs = require('fs');

var multer = require('multer');

var PDFDocument = require('pdfkit');

require('dotenv').config();

var app = express();
var PORT = process.env.PORT || 3000; // Middlewares

app.use(cors());
app.use(express.json({
  limit: '50mb'
})); // Para JSON grandes

app.use(express.urlencoded({
  extended: true,
  limit: '50mb'
})); // Para form-data

app.use(express.text({
  type: 'text/plain'
})); // Para text/plain
// Conexión a MongoDB Atlas

var MONGO_URI = process.env.MONGO_URI || 'tu_mongo_uri_aqui';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(function () {
  return console.log('MongoDB conectado');
})["catch"](function (err) {
  return console.error('Error al conectar MongoDB:', err);
}); // Configuración de Multer

var storage = multer.diskStorage({
  destination: function destination(req, file, cb) {
    var uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: function filename(req, file, cb) {
    var uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
var upload = multer({
  storage: storage
}); // Rutas

app.get('/', function (req, res) {
  res.send('Backend funcionando correctamente');
}); // Login

app.post('/login', function _callee(req, res) {
  var _req$body, email, password;

  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          try {
            _req$body = req.body, email = _req$body.email, password = _req$body.password; // Aquí tu lógica de login
            // Ejemplo:
            // const user = await User.findOne({ email, password });
            // if (!user) return res.status(401).json({ msg: 'Usuario no encontrado' });
            // res.json(user);

            res.json({
              msg: 'Login simulado'
            });
          } catch (err) {
            console.error(err);
            res.status(500).json({
              error: 'Error en login'
            });
          }

        case 1:
        case "end":
          return _context.stop();
      }
    }
  });
}); // Productos

app.get('/productos', function _callee2(req, res) {
  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          try {
            // const productos = await Producto.find();
            // res.json(productos);
            res.json({
              msg: 'Productos simulados'
            });
          } catch (err) {
            console.error(err);
            res.status(500).json({
              error: 'Error al obtener productos'
            });
          }

        case 1:
        case "end":
          return _context2.stop();
      }
    }
  });
}); // Banner

app.post('/banner', upload.single('image'), function (req, res) {
  try {
    if (!req.file) return res.status(400).json({
      msg: 'No se subió la imagen'
    });
    res.json({
      msg: 'Imagen subida',
      file: req.file.filename
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Error al subir banner'
    });
  }
}); // Favoritos

app.post('/favoritos', function _callee3(req, res) {
  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          try {
            // const { userId, productoId } = req.body;
            // Lógica de favoritos
            res.json({
              msg: 'Favorito agregado simuladamente'
            });
          } catch (err) {
            console.error(err);
            res.status(500).json({
              error: 'Error en favoritos'
            });
          }

        case 1:
        case "end":
          return _context3.stop();
      }
    }
  });
}); // Cotizaciones

app.post('/cotizaciones', function _callee4(req, res) {
  return regeneratorRuntime.async(function _callee4$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          try {
            // const cotizacion = new Cotizacion(req.body);
            // await cotizacion.save();
            res.json({
              msg: 'Cotización registrada simuladamente'
            });
          } catch (err) {
            console.error(err);
            res.status(500).json({
              error: 'Error en cotizaciones'
            });
          }

        case 1:
        case "end":
          return _context4.stop();
      }
    }
  });
}); // PDF

app.get('/pdf', function (req, res) {
  try {
    var doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    doc.text('PDF generado correctamente');
    doc.pipe(res);
    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Error al generar PDF'
    });
  }
}); // Servidor HTTP + Socket.io

var server = http.createServer(app);
var io = new Server(server, {
  cors: {
    origin: '*'
  }
});
io.on('connection', function (socket) {
  console.log('Cliente conectado', socket.id);
  socket.on('disconnect', function () {
    return console.log('Cliente desconectado', socket.id);
  });
}); // Iniciar servidor

server.listen(PORT, function () {
  console.log("Servidor corriendo en http://localhost:".concat(PORT));
});
//# sourceMappingURL=server.dev.js.map
