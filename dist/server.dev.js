"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

var express = require('express');

var mongoose = require('mongoose');

var cors = require('cors');

var app = express();
var PORT = 3000;

var PDFDocument = require('pdfkit'); // Middleware - IMPORTANTE: el orden es crucial
// CORS primero


app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:3200'],
  // acepta ambos
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({
  limit: '60mb'
})); // aceptar JSON grandes

app.use(express.urlencoded({
  extended: true,
  limit: '50mb'
})); // aceptar formularios grandes

app.use(express.json({
  limit: '80mb'
})); // muy importante para imágenes en base64
// Middleware personalizado para convertir text/plain a JSON cuando es necesario

app.use(function (req, res, next) {
  if (req.headers['content-type'] === 'text/plain' && req.body && typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
      console.log('Converted text/plain to JSON:', req.body);
    } catch (e) {
      console.error('Failed to parse text/plain as JSON:', e);
    }
  }

  next();
}); // MongoDB Connection

var dbURI = 'mongodb://localhost:27017/mydatabase';
mongoose.connect(dbURI).then(function () {
  return console.log('MongoDB connected');
})["catch"](function (err) {
  return console.error('MongoDB connection error:', err);
}); // User Schema

var userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    "default": 'admin'
  }
});
var User = mongoose.model('User', userSchema); // Default Admin User

function createAdminUser() {
  var admin, newAdmin;
  return regeneratorRuntime.async(function createAdminUser$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return regeneratorRuntime.awrap(User.findOne({
            username: 'admin'
          }));

        case 2:
          admin = _context.sent;

          if (admin) {
            _context.next = 10;
            break;
          }

          newAdmin = new User({
            username: 'admin',
            password: 'admin123',
            role: 'admin'
          });
          _context.next = 7;
          return regeneratorRuntime.awrap(newAdmin.save());

        case 7:
          console.log('Admin user created');
          _context.next = 11;
          break;

        case 10:
          console.log('Admin user already exists');

        case 11:
        case "end":
          return _context.stop();
      }
    }
  });
}

createAdminUser(); // 📌 Agregar producto a favoritos

app.post('/favorites', function _callee(req, res) {
  var _req$body, userId, productId, user, updatedUser;

  return regeneratorRuntime.async(function _callee$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          _req$body = req.body, userId = _req$body.userId, productId = _req$body.productId;

          if (!(!userId || !productId)) {
            _context2.next = 4;
            break;
          }

          return _context2.abrupt("return", res.status(400).json({
            message: "Faltan userId o productId"
          }));

        case 4:
          _context2.next = 6;
          return regeneratorRuntime.awrap(UserCliente.findById(userId));

        case 6:
          user = _context2.sent;

          if (user) {
            _context2.next = 9;
            break;
          }

          return _context2.abrupt("return", res.status(404).json({
            message: "Usuario no encontrado"
          }));

        case 9:
          if (user.favorites.includes(productId)) {
            _context2.next = 14;
            break;
          }

          user.favorites.push(productId);
          user.favorites = _toConsumableArray(new Set(user.favorites.map(function (f) {
            return f.toString();
          })));
          _context2.next = 14;
          return regeneratorRuntime.awrap(user.save());

        case 14:
          _context2.next = 16;
          return regeneratorRuntime.awrap(UserCliente.findById(userId).populate('favorites'));

        case 16:
          updatedUser = _context2.sent;
          // 👈 cambio
          res.json({
            message: "Producto agregado a favoritos",
            favorites: updatedUser.favorites
          });
          _context2.next = 24;
          break;

        case 20:
          _context2.prev = 20;
          _context2.t0 = _context2["catch"](0);
          console.error("❌ Error en POST /favorites:", _context2.t0);
          res.status(500).json({
            message: "Error al agregar a favoritos",
            error: _context2.t0.message
          });

        case 24:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[0, 20]]);
}); // 📌 Obtener favoritos de un cliente

app.get('/favorites/:userId', function _callee2(req, res) {
  var userId, user;
  return regeneratorRuntime.async(function _callee2$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          userId = req.params.userId;
          _context3.next = 4;
          return regeneratorRuntime.awrap(UserCliente.findById(userId).populate('favorites'));

        case 4:
          user = _context3.sent;

          if (user) {
            _context3.next = 7;
            break;
          }

          return _context3.abrupt("return", res.status(404).json({
            message: "Usuario no encontrado"
          }));

        case 7:
          res.json({
            message: "Favoritos obtenidos correctamente",
            favorites: user.favorites
          });
          _context3.next = 14;
          break;

        case 10:
          _context3.prev = 10;
          _context3.t0 = _context3["catch"](0);
          console.error("❌ Error en GET /favorites/:userId:", _context3.t0);
          res.status(500).json({
            message: "Error al obtener favoritos",
            error: _context3.t0.message
          });

        case 14:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[0, 10]]);
}); // 📌 Eliminar producto de favoritos

app["delete"]('/favorites/:userId/:productId', function _callee3(req, res) {
  var _req$params, userId, productId, user, before, updatedUser;

  return regeneratorRuntime.async(function _callee3$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.prev = 0;
          _req$params = req.params, userId = _req$params.userId, productId = _req$params.productId;
          _context4.next = 4;
          return regeneratorRuntime.awrap(UserCliente.findById(userId));

        case 4:
          user = _context4.sent;

          if (user) {
            _context4.next = 7;
            break;
          }

          return _context4.abrupt("return", res.status(404).json({
            message: "Usuario no encontrado"
          }));

        case 7:
          before = user.favorites.length;
          user.favorites = user.favorites.filter(function (fav) {
            return fav.toString() !== productId;
          });

          if (!(before === user.favorites.length)) {
            _context4.next = 11;
            break;
          }

          return _context4.abrupt("return", res.status(404).json({
            message: "Producto no estaba en favoritos"
          }));

        case 11:
          _context4.next = 13;
          return regeneratorRuntime.awrap(user.save());

        case 13:
          _context4.next = 15;
          return regeneratorRuntime.awrap(UserCliente.findById(userId).populate('favorites'));

        case 15:
          updatedUser = _context4.sent;
          // 👈 cambio
          res.json({
            message: "Producto eliminado de favoritos",
            favorites: updatedUser.favorites
          });
          _context4.next = 23;
          break;

        case 19:
          _context4.prev = 19;
          _context4.t0 = _context4["catch"](0);
          console.error("❌ Error en DELETE /favorites/:userId/:productId:", _context4.t0);
          res.status(500).json({
            message: "Error al eliminar de favoritos",
            error: _context4.t0.message
          });

        case 23:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[0, 19]]);
}); // Rutas de Usuario

app.get('/users', function _callee4(req, res) {
  var users;
  return regeneratorRuntime.async(function _callee4$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.prev = 0;
          _context5.next = 3;
          return regeneratorRuntime.awrap(User.find());

        case 3:
          users = _context5.sent;
          res.json(users);
          _context5.next = 10;
          break;

        case 7:
          _context5.prev = 7;
          _context5.t0 = _context5["catch"](0);
          res.status(500).json({
            message: 'Error al obtener usuarios',
            error: _context5.t0
          });

        case 10:
        case "end":
          return _context5.stop();
      }
    }
  }, null, null, [[0, 7]]);
});
app.post('/login', function _callee5(req, res) {
  var _req$body2, username, password, user;

  return regeneratorRuntime.async(function _callee5$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _req$body2 = req.body, username = _req$body2.username, password = _req$body2.password;
          _context6.next = 3;
          return regeneratorRuntime.awrap(User.findOne({
            username: username,
            password: password
          }));

        case 3:
          user = _context6.sent;

          if (user) {
            res.json({
              message: 'Login successful',
              user: user
            });
          } else {
            res.status(401).json({
              message: 'Invalid credentials'
            });
          }

        case 5:
        case "end":
          return _context6.stop();
      }
    }
  });
}); // Registro de Cliente

app.post('/register', function _callee6(req, res) {
  var _req$body3, username, password, existingUser, newUser;

  return regeneratorRuntime.async(function _callee6$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          _req$body3 = req.body, username = _req$body3.username, password = _req$body3.password;
          _context7.prev = 1;
          _context7.next = 4;
          return regeneratorRuntime.awrap(User.findOne({
            username: username
          }));

        case 4:
          existingUser = _context7.sent;

          if (!existingUser) {
            _context7.next = 7;
            break;
          }

          return _context7.abrupt("return", res.status(400).json({
            message: 'El usuario ya existe'
          }));

        case 7:
          newUser = new User({
            username: username,
            password: password,
            role: 'cliente'
          });
          _context7.next = 10;
          return regeneratorRuntime.awrap(newUser.save());

        case 10:
          res.status(201).json({
            message: 'Cliente registrado correctamente',
            user: newUser
          });
          _context7.next = 16;
          break;

        case 13:
          _context7.prev = 13;
          _context7.t0 = _context7["catch"](1);
          res.status(500).json({
            message: 'Error al registrar cliente',
            error: _context7.t0
          });

        case 16:
        case "end":
          return _context7.stop();
      }
    }
  }, null, null, [[1, 13]]);
}); //===========================USER CLIENTE =================///

var userClienteSchema = new mongoose.Schema({
  password: {
    type: String,
    required: true
  },
  nombre: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  telefono: {
    type: String
  },
  direccion: {
    type: String
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }] // ⭐ nuevo campo

});
var UserCliente = mongoose.model('UserCliente', userClienteSchema);
app.get('/clientes', function _callee7(req, res) {
  var clientes;
  return regeneratorRuntime.async(function _callee7$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          _context8.prev = 0;
          _context8.next = 3;
          return regeneratorRuntime.awrap(UserCliente.find().select('-password'));

        case 3:
          clientes = _context8.sent;
          // No devolver passwords
          res.json(clientes);
          _context8.next = 10;
          break;

        case 7:
          _context8.prev = 7;
          _context8.t0 = _context8["catch"](0);
          res.status(500).json({
            message: 'Error al obtener clientes',
            error: _context8.t0.message
          });

        case 10:
        case "end":
          return _context8.stop();
      }
    }
  }, null, null, [[0, 7]]);
}); // Registro de nuevo cliente

app.post('/clientes/register', function _callee8(req, res) {
  var _req$body4, password, nombre, email, telefono, direccion, existingCliente, _nodemailer, _transporter, newCliente, mailOptions, clienteResponse;

  return regeneratorRuntime.async(function _callee8$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          _context9.prev = 0;
          console.log('Datos recibidos para registro:', req.body);
          _req$body4 = req.body, password = _req$body4.password, nombre = _req$body4.nombre, email = _req$body4.email, telefono = _req$body4.telefono, direccion = _req$body4.direccion; // Validaciones

          if (!(!password || !nombre || !email)) {
            _context9.next = 5;
            break;
          }

          return _context9.abrupt("return", res.status(400).json({
            message: 'Password, nombre y email son obligatorios',
            receivedData: req.body
          }));

        case 5:
          _context9.next = 7;
          return regeneratorRuntime.awrap(UserCliente.findOne({
            email: email
          }));

        case 7:
          existingCliente = _context9.sent;

          if (!existingCliente) {
            _context9.next = 10;
            break;
          }

          return _context9.abrupt("return", res.status(400).json({
            message: 'El email ya está registrado'
          }));

        case 10:
          _nodemailer = require('nodemailer'); // Configura tu transporte (puede ser Gmail)

          _transporter = _nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: 'monica.romeroz.2003@gmail.com',
              // <-- tu correo Gmail
              pass: 'txapatbhiebaxbbg' // <-- tu contraseña de app (¡no tu clave real!)

            }
          }); // Crear nuevo cliente

          newCliente = new UserCliente({
            password: password,
            nombre: nombre,
            email: email,
            telefono: telefono || '',
            direccion: direccion || ''
          });
          _context9.next = 15;
          return regeneratorRuntime.awrap(newCliente.save());

        case 15:
          // ENVIAR CORREO AL CLIENTE
          mailOptions = {
            from: 'monica.romeroz.2003@gmail.com',
            to: email,
            subject: 'Registro en la Web de DINSAC',
            text: "\xA1Hola ".concat(nombre, "! \n  \xA1Gracias por registrarte en la plataforma de DINSAC!\n\nAhora puedes explorar nuestros productos y realizar tus compras cuando gustes.  \nSi tienes dudas, escr\xEDbenos a soporte@dinsac.com\n\n\xA1Que tengas un excelente d\xEDa!\n\nAtentamente,  \nEl equipo de DINSAC..")
          };

          _transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              console.error('Error al enviar correo:', error);
            } else {
              console.log('Correo enviado: ' + info.response);
            }
          }); // Devolver cliente sin password


          clienteResponse = {
            _id: newCliente._id,
            nombre: newCliente.nombre,
            email: newCliente.email,
            telefono: newCliente.telefono,
            direccion: newCliente.direccion
          };
          res.status(201).json({
            message: 'Cliente registrado correctamente',
            cliente: clienteResponse
          });
          _context9.next = 25;
          break;

        case 21:
          _context9.prev = 21;
          _context9.t0 = _context9["catch"](0);
          console.error('Error registrando cliente:', _context9.t0);

          if (_context9.t0.code === 11000) {
            // Error de duplicado de MongoDB
            res.status(400).json({
              message: 'El email ya está registrado'
            });
          } else {
            res.status(500).json({
              message: 'Error al registrar cliente',
              error: _context9.t0.message
            });
          }

        case 25:
        case "end":
          return _context9.stop();
      }
    }
  }, null, null, [[0, 21]]);
}); // Login de cliente

app.post('/clientes/login', function _callee9(req, res) {
  var _req$body5, email, password, cliente, clienteResponse;

  return regeneratorRuntime.async(function _callee9$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
        case 0:
          _context10.prev = 0;
          console.log('Intento de login:', req.body);
          _req$body5 = req.body, email = _req$body5.email, password = _req$body5.password; // Validaciones

          if (!(!email || !password)) {
            _context10.next = 5;
            break;
          }

          return _context10.abrupt("return", res.status(400).json({
            message: 'Email y password son obligatorios'
          }));

        case 5:
          _context10.next = 7;
          return regeneratorRuntime.awrap(UserCliente.findOne({
            email: email,
            password: password
          }));

        case 7:
          cliente = _context10.sent;

          if (cliente) {
            // Login exitoso - devolver datos sin password
            clienteResponse = {
              _id: cliente._id,
              nombre: cliente.nombre,
              email: cliente.email,
              telefono: cliente.telefono,
              direccion: cliente.direccion
            };
            res.json({
              message: 'Login exitoso',
              cliente: clienteResponse,
              success: true
            });
          } else {
            res.status(401).json({
              message: 'Credenciales inválidas',
              success: false
            });
          }

          _context10.next = 15;
          break;

        case 11:
          _context10.prev = 11;
          _context10.t0 = _context10["catch"](0);
          console.error('Error en login:', _context10.t0);
          res.status(500).json({
            message: 'Error en el servidor',
            error: _context10.t0.message
          });

        case 15:
        case "end":
          return _context10.stop();
      }
    }
  }, null, null, [[0, 11]]);
}); // Eliminar cliente

app["delete"]('/clientes/:id', function _callee10(req, res) {
  var deletedCliente;
  return regeneratorRuntime.async(function _callee10$(_context11) {
    while (1) {
      switch (_context11.prev = _context11.next) {
        case 0:
          _context11.prev = 0;
          _context11.next = 3;
          return regeneratorRuntime.awrap(UserCliente.findByIdAndDelete(req.params.id));

        case 3:
          deletedCliente = _context11.sent;

          if (deletedCliente) {
            _context11.next = 6;
            break;
          }

          return _context11.abrupt("return", res.status(404).json({
            message: 'Cliente no encontrado'
          }));

        case 6:
          res.json({
            message: 'Cliente eliminado correctamente',
            cliente: {
              _id: deletedCliente._id,
              nombre: deletedCliente.nombre,
              email: deletedCliente.email
            }
          });
          _context11.next = 13;
          break;

        case 9:
          _context11.prev = 9;
          _context11.t0 = _context11["catch"](0);
          console.error('Error eliminando cliente:', _context11.t0);
          res.status(500).json({
            message: 'Error eliminando cliente',
            error: _context11.t0.message
          });

        case 13:
        case "end":
          return _context11.stop();
      }
    }
  }, null, null, [[0, 9]]);
}); // =================== PRODUCTOS ===================

var nodemailer = require('nodemailer'); // =================== CONFIGURACIÓN DE CORREO ===================


var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'monica.romeroz.2003@gmail.com',
    pass: 'txapatbhiebaxbbg'
  }
}); // =================== PRODUCTOS ===================
// Esquema actualizado del producto

var productSchema = new mongoose.Schema({
  codigo: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  image1: {
    type: String,
    required: false
  },
  image2: {
    type: String,
    required: false
  },
  image3: {
    type: String,
    required: false
  },
  stock: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  estado: {
    type: String,
    "enum": ['Normal', 'Oferta'],
    // <-- solo acepta estos dos valores
    required: true
  },
  videoURL: {
    type: String,
    required: false
  },
  featuresText: {
    type: String,
    required: false
  },
  tagsText: {
    type: String,
    required: false
  },
  destacado: {
    type: Boolean,
    "default": false
  }
});
var Product = mongoose.model('Product', productSchema); // =================== RUTAS ===================
// Obtener todos los productos (con filtros opcionales)

app.get('/products', function _callee11(req, res) {
  var _req$query, category, estado, query, products;

  return regeneratorRuntime.async(function _callee11$(_context12) {
    while (1) {
      switch (_context12.prev = _context12.next) {
        case 0:
          _context12.prev = 0;
          _req$query = req.query, category = _req$query.category, estado = _req$query.estado;
          query = {};
          if (category) query.category = category;
          if (estado) query.estado = estado; // <-- permite filtrar por Normal u Oferta

          _context12.next = 7;
          return regeneratorRuntime.awrap(Product.find(query));

        case 7:
          products = _context12.sent;
          res.json(products);
          _context12.next = 14;
          break;

        case 11:
          _context12.prev = 11;
          _context12.t0 = _context12["catch"](0);
          res.status(500).json({
            message: 'Error fetching products',
            error: _context12.t0
          });

        case 14:
        case "end":
          return _context12.stop();
      }
    }
  }, null, null, [[0, 11]]);
}); // Obtener producto por ID

app.get('/products/:id', function _callee12(req, res) {
  var product;
  return regeneratorRuntime.async(function _callee12$(_context13) {
    while (1) {
      switch (_context13.prev = _context13.next) {
        case 0:
          _context13.prev = 0;
          _context13.next = 3;
          return regeneratorRuntime.awrap(Product.findById(req.params.id));

        case 3:
          product = _context13.sent;

          if (product) {
            _context13.next = 6;
            break;
          }

          return _context13.abrupt("return", res.status(404).json({
            message: 'Product not found'
          }));

        case 6:
          res.json(product);
          _context13.next = 12;
          break;

        case 9:
          _context13.prev = 9;
          _context13.t0 = _context13["catch"](0);
          res.status(500).json({
            message: 'Error fetching product',
            error: _context13.t0
          });

        case 12:
        case "end":
          return _context13.stop();
      }
    }
  }, null, null, [[0, 9]]);
}); // Crear un nuevo producto

app.post('/products', function _callee13(req, res) {
  var _req$body6, codigo, name, description, image, image1, image2, image3, stock, category, estado, videoURL, featuresText, tagsText, destacado, newProduct;

  return regeneratorRuntime.async(function _callee13$(_context14) {
    while (1) {
      switch (_context14.prev = _context14.next) {
        case 0:
          _context14.prev = 0;
          console.log('📥 POST /products recibido');
          console.log('Body:', req.body);

          if (!(!req.body || Object.keys(req.body).length === 0)) {
            _context14.next = 5;
            break;
          }

          return _context14.abrupt("return", res.status(400).json({
            message: 'Error: Request body vacío o indefinido',
            receivedHeaders: req.headers
          }));

        case 5:
          _req$body6 = req.body, codigo = _req$body6.codigo, name = _req$body6.name, description = _req$body6.description, image = _req$body6.image, image1 = _req$body6.image1, image2 = _req$body6.image2, image3 = _req$body6.image3, stock = _req$body6.stock, category = _req$body6.category, estado = _req$body6.estado, videoURL = _req$body6.videoURL, featuresText = _req$body6.featuresText, tagsText = _req$body6.tagsText, destacado = _req$body6.destacado; // Validaciones mínimas

          if (!(!codigo || !name || !description || !image || !stock || !category || !estado)) {
            _context14.next = 8;
            break;
          }

          return _context14.abrupt("return", res.status(400).json({
            message: 'Faltan campos obligatorios',
            receivedData: req.body
          }));

        case 8:
          newProduct = new Product({
            codigo: codigo,
            name: name,
            description: description,
            image: image,
            image1: image1,
            image2: image2,
            image3: image3,
            stock: stock,
            category: category,
            estado: estado,
            videoURL: videoURL,
            featuresText: featuresText,
            tagsText: tagsText,
            destacado: destacado
          });
          _context14.next = 11;
          return regeneratorRuntime.awrap(newProduct.save());

        case 11:
          console.log('✅ Producto guardado correctamente:', newProduct);
          res.status(201).json(newProduct);
          _context14.next = 19;
          break;

        case 15:
          _context14.prev = 15;
          _context14.t0 = _context14["catch"](0);
          console.error('❌ Error al crear producto:', _context14.t0);
          res.status(400).json({
            message: 'Error creando producto',
            error: _context14.t0.message || _context14.t0,
            stack: _context14.t0.stack
          });

        case 19:
        case "end":
          return _context14.stop();
      }
    }
  }, null, null, [[0, 15]]);
}); // Actualizar un producto por ID

app.put('/products/:id', function _callee14(req, res) {
  var updatedProduct;
  return regeneratorRuntime.async(function _callee14$(_context15) {
    while (1) {
      switch (_context15.prev = _context15.next) {
        case 0:
          _context15.prev = 0;
          _context15.next = 3;
          return regeneratorRuntime.awrap(Product.findByIdAndUpdate(req.params.id, req.body, {
            "new": true
          }));

        case 3:
          updatedProduct = _context15.sent;

          if (updatedProduct) {
            _context15.next = 6;
            break;
          }

          return _context15.abrupt("return", res.status(404).json({
            message: 'Product not found'
          }));

        case 6:
          res.json(updatedProduct);
          _context15.next = 12;
          break;

        case 9:
          _context15.prev = 9;
          _context15.t0 = _context15["catch"](0);
          res.status(400).json({
            message: 'Error updating product',
            error: _context15.t0
          });

        case 12:
        case "end":
          return _context15.stop();
      }
    }
  }, null, null, [[0, 9]]);
}); // Eliminar un producto por ID

app["delete"]('/products/:id', function _callee15(req, res) {
  var deletedProduct;
  return regeneratorRuntime.async(function _callee15$(_context16) {
    while (1) {
      switch (_context16.prev = _context16.next) {
        case 0:
          _context16.prev = 0;
          _context16.next = 3;
          return regeneratorRuntime.awrap(Product.findByIdAndDelete(req.params.id));

        case 3:
          deletedProduct = _context16.sent;

          if (deletedProduct) {
            _context16.next = 6;
            break;
          }

          return _context16.abrupt("return", res.status(404).json({
            message: 'Product not found'
          }));

        case 6:
          res.json({
            message: 'Product deleted successfully'
          });
          _context16.next = 12;
          break;

        case 9:
          _context16.prev = 9;
          _context16.t0 = _context16["catch"](0);
          res.status(500).json({
            message: 'Error deleting product',
            error: _context16.t0
          });

        case 12:
        case "end":
          return _context16.stop();
      }
    }
  }, null, null, [[0, 9]]);
}); // =================== orden===================

var ordenSchema = new mongoose.Schema({
  nombre: String,
  email: String,
  productos: [{
    name: String,
    cantidad: Number,
    price: Number
  }],
  total: Number,
  fecha: {
    type: Date,
    "default": Date.now
  }
});
var Orden = mongoose.model('Orden', ordenSchema);
app.post('/ordenes', function _callee16(req, res) {
  var _req$body7, nombre, email, productos, total, nuevaOrden, resumen, mensaje;

  return regeneratorRuntime.async(function _callee16$(_context17) {
    while (1) {
      switch (_context17.prev = _context17.next) {
        case 0:
          _context17.prev = 0;
          _req$body7 = req.body, nombre = _req$body7.nombre, email = _req$body7.email, productos = _req$body7.productos, total = _req$body7.total; // Guardar la orden en MongoDB

          nuevaOrden = new Orden({
            nombre: nombre,
            email: email,
            productos: productos,
            total: total
          });
          _context17.next = 5;
          return regeneratorRuntime.awrap(nuevaOrden.save());

        case 5:
          // Armar el mensaje del correo
          resumen = productos.map(function (p) {
            return "- ".concat(p.name, " (x").concat(p.cantidad, ") - S/ ").concat(p.price * p.cantidad);
          }).join('\n');
          mensaje = "Hola ".concat(nombre, ",\n\nGracias por tu compra en DINSAC.\n\nResumen:\n").concat(resumen, "\n\nTotal: S/ ").concat(total, "\n\nSaludos,\nEquipo DINSAC"); // Enviar correo

          _context17.next = 9;
          return regeneratorRuntime.awrap(transporter.sendMail({
            from: 'tucorreo@gmail.com',
            // reemplaza por tu correo real
            to: email,
            subject: '🧾 Confirmación de tu compra en DINSAC, ¡Gracias por tu compra en DINSAC! 🎉',
            text: mensaje
          }));

        case 9:
          res.status(200).json({
            message: 'Orden registrada y correo enviado.'
          });
          _context17.next = 16;
          break;

        case 12:
          _context17.prev = 12;
          _context17.t0 = _context17["catch"](0);
          console.error('Error al registrar orden:', _context17.t0);
          res.status(500).json({
            message: 'Error al guardar orden o enviar correo.'
          });

        case 16:
        case "end":
          return _context17.stop();
      }
    }
  }, null, null, [[0, 12]]);
});
app.get('/ordenes', function _callee17(req, res) {
  var ordenes;
  return regeneratorRuntime.async(function _callee17$(_context18) {
    while (1) {
      switch (_context18.prev = _context18.next) {
        case 0:
          _context18.prev = 0;
          _context18.next = 3;
          return regeneratorRuntime.awrap(Orden.find().sort({
            fecha: -1
          }));

        case 3:
          ordenes = _context18.sent;
          // más recientes arriba
          res.json(ordenes);
          _context18.next = 10;
          break;

        case 7:
          _context18.prev = 7;
          _context18.t0 = _context18["catch"](0);
          res.status(500).json({
            message: 'Error al obtener órdenes'
          });

        case 10:
        case "end":
          return _context18.stop();
      }
    }
  }, null, null, [[0, 7]]);
}); // =================== para IA  ===================
// ========== ESQUEMA DE INTERACCIONES ==========

var interaccionSchema = new mongoose.Schema({
  usuario: String,
  mensaje: String,
  fecha: Date
});
var Interaccion = mongoose.model('Interaccion', interaccionSchema); // ========== RUTA PARA GUARDAR ==========

app.post('/interacciones', function _callee18(req, res) {
  var nueva;
  return regeneratorRuntime.async(function _callee18$(_context19) {
    while (1) {
      switch (_context19.prev = _context19.next) {
        case 0:
          _context19.prev = 0;
          nueva = new Interaccion(req.body);
          _context19.next = 4;
          return regeneratorRuntime.awrap(nueva.save());

        case 4:
          res.status(201).json({
            message: '✅ Interacción guardada'
          });
          _context19.next = 10;
          break;

        case 7:
          _context19.prev = 7;
          _context19.t0 = _context19["catch"](0);
          res.status(500).json({
            error: 'Error al guardar la interacción'
          });

        case 10:
        case "end":
          return _context19.stop();
      }
    }
  }, null, null, [[0, 7]]);
}); // ========== RUTA PARA OBTENER ==========

app.get('/interacciones', function _callee19(req, res) {
  var interacciones;
  return regeneratorRuntime.async(function _callee19$(_context20) {
    while (1) {
      switch (_context20.prev = _context20.next) {
        case 0:
          _context20.prev = 0;
          _context20.next = 3;
          return regeneratorRuntime.awrap(Interaccion.find().sort({
            fecha: -1
          }));

        case 3:
          interacciones = _context20.sent;
          res.json(interacciones);
          _context20.next = 10;
          break;

        case 7:
          _context20.prev = 7;
          _context20.t0 = _context20["catch"](0);
          res.status(500).json({
            error: 'Error al obtener interacciones'
          });

        case 10:
        case "end":
          return _context20.stop();
      }
    }
  }, null, null, [[0, 7]]);
}); // =================== COTIZACION  ===================

var cotizacionSchema = new mongoose.Schema({
  numeroCotizacion: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserCliente',
    required: true
  },
  nombre: String,
  dniRuc: String,
  email: String,
  telefonoMovil: String,
  mensaje: String,
  contacto: String,
  productos: [{
    categoria: String,
    equipo: String,
    cantidad: Number,
    precioUnitario: Number
  }],
  pdfBase64: String,
  fecha: {
    type: Date,
    "default": Date.now
  },
  estado: {
    type: String,
    "default": 'pendiente'
  },
  // 🟢 <--- AGREGA ESTO
  createdAt: {
    type: Date,
    "default": Date.now
  },
  updatedAt: {
    type: Date,
    "default": Date.now
  }
});
var Cotizacion = mongoose.model('Cotizacion', cotizacionSchema); // ===================  GUARDAR COTIZACION  ===================
// ✅ Endpoint corregido para guardar cotización y enviar correo

app.post('/cotizaciones', function _callee20(req, res) {
  var numeroCotizacion, total, numero, nuevaCotizacion, pdfBuffer, mailOptions;
  return regeneratorRuntime.async(function _callee20$(_context21) {
    while (1) {
      switch (_context21.prev = _context21.next) {
        case 0:
          _context21.prev = 0;
          console.log('📧 Procesando cotización...'); // 👉 Usar el número que viene del frontend o generar uno nuevo

          numeroCotizacion = req.body.numeroCotizacion;

          if (numeroCotizacion) {
            _context21.next = 9;
            break;
          }

          _context21.next = 6;
          return regeneratorRuntime.awrap(Cotizacion.countDocuments());

        case 6:
          total = _context21.sent;
          numero = total + 1;
          numeroCotizacion = "COT-".concat(numero.toString().padStart(8, '0'));

        case 9:
          // 👉 Crear nueva cotización
          nuevaCotizacion = new Cotizacion({
            numeroCotizacion: numeroCotizacion,
            userId: req.body.userId,
            // 👈 vincula con el cliente logueado
            nombre: req.body.nombre,
            dniRuc: req.body.dniRuc,
            email: req.body.email,
            telefonoMovil: req.body.telefonoMovil,
            mensaje: req.body.mensaje,
            contacto: req.body.contacto,
            productos: req.body.productos,
            pdfBase64: req.body.pdfBase64,
            fecha: new Date(),
            estado: 'pendiente' // 🔹 por defecto al crear

          });
          _context21.next = 12;
          return regeneratorRuntime.awrap(nuevaCotizacion.save());

        case 12:
          console.log('✅ Cotización guardada en BD'); // 👉 Convertir el PDF base64 a buffer

          pdfBuffer = Buffer.from(req.body.pdfBase64, 'base64'); // 👉 Configurar correo

          mailOptions = {
            from: process.env.EMAIL_USER,
            to: "".concat(req.body.email, ", ").concat(process.env.EMAIL_OWNER || 'admin@tuempresa.com'),
            subject: "Cotizaci\xF3n ".concat(numeroCotizacion, " - Distribuidora Industrial S.A.C."),
            html: "\n        <h3>Cotizaci\xF3n ".concat(numeroCotizacion, "</h3>\n        <p><strong>Cliente:</strong> ").concat(req.body.nombre, "</p>\n        <p><strong>Email:</strong> ").concat(req.body.email, "</p>\n        <p><strong>Tel\xE9fono:</strong> ").concat(req.body.telefonoMovil, "</p>\n        <p><strong>Mensaje:</strong> ").concat(req.body.mensaje, "</p>\n        <br>\n        <p>Adjuntamos la cotizaci\xF3n en formato PDF.</p>\n        <p><em>Distribuidora Industrial S.A.C.</em></p>\n      "),
            attachments: [{
              filename: "Cotizacion_".concat(numeroCotizacion, ".pdf"),
              content: pdfBuffer,
              contentType: 'application/pdf'
            }]
          }; // 👉 Enviar correo

          _context21.next = 17;
          return regeneratorRuntime.awrap(transporter.sendMail(mailOptions));

        case 17:
          console.log('✅ Correo enviado exitosamente');
          res.status(201).json({
            message: "Cotizaci\xF3n ".concat(numeroCotizacion, " guardada y enviada por correo exitosamente"),
            numeroCotizacion: numeroCotizacion,
            success: true
          });
          _context21.next = 25;
          break;

        case 21:
          _context21.prev = 21;
          _context21.t0 = _context21["catch"](0);
          console.error('❌ Error:', _context21.t0);
          res.status(500).json({
            message: 'Error al procesar la cotización',
            error: _context21.t0.message,
            success: false
          });

        case 25:
        case "end":
          return _context21.stop();
      }
    }
  }, null, null, [[0, 21]]);
}); // 🔹 Contar cotizaciones pendientes
// 🔹 Contar cotizaciones pendientes (usando Mongoose)

app.get('/cotizaciones/pendientes/total', function _callee21(req, res) {
  var totalPendientes;
  return regeneratorRuntime.async(function _callee21$(_context22) {
    while (1) {
      switch (_context22.prev = _context22.next) {
        case 0:
          _context22.prev = 0;
          _context22.next = 3;
          return regeneratorRuntime.awrap(Cotizacion.countDocuments({
            estado: 'pendiente'
          }));

        case 3:
          totalPendientes = _context22.sent;
          res.json({
            total: totalPendientes
          });
          _context22.next = 11;
          break;

        case 7:
          _context22.prev = 7;
          _context22.t0 = _context22["catch"](0);
          console.error('❌ Error al contar cotizaciones pendientes:', _context22.t0);
          res.status(500).json({
            message: 'Error al obtener cotizaciones pendientes',
            error: _context22.t0.message
          });

        case 11:
        case "end":
          return _context22.stop();
      }
    }
  }, null, null, [[0, 7]]);
});
app["delete"]('/cotizaciones/:id', function _callee22(req, res) {
  var id;
  return regeneratorRuntime.async(function _callee22$(_context23) {
    while (1) {
      switch (_context23.prev = _context23.next) {
        case 0:
          _context23.prev = 0;
          id = req.params.id;
          _context23.next = 4;
          return regeneratorRuntime.awrap(Cotizacion.findByIdAndDelete(id));

        case 4:
          res.json({
            message: 'Cotización eliminada correctamente'
          });
          _context23.next = 11;
          break;

        case 7:
          _context23.prev = 7;
          _context23.t0 = _context23["catch"](0);
          console.error('Error al eliminar cotización:', _context23.t0);
          res.status(500).json({
            message: 'Error al eliminar cotización'
          });

        case 11:
        case "end":
          return _context23.stop();
      }
    }
  }, null, null, [[0, 7]]);
}); // ===================  contar COTIZACION  ===================

app.get('/cotizaciones/total', function _callee23(req, res) {
  var total;
  return regeneratorRuntime.async(function _callee23$(_context24) {
    while (1) {
      switch (_context24.prev = _context24.next) {
        case 0:
          _context24.prev = 0;
          _context24.next = 3;
          return regeneratorRuntime.awrap(Cotizacion.countDocuments());

        case 3:
          total = _context24.sent;
          res.json({
            total: total
          });
          _context24.next = 10;
          break;

        case 7:
          _context24.prev = 7;
          _context24.t0 = _context24["catch"](0);
          res.status(500).json({
            message: 'Error al contar cotizaciones',
            error: _context24.t0
          });

        case 10:
        case "end":
          return _context24.stop();
      }
    }
  }, null, null, [[0, 7]]);
}); // =================== HISTORIAL DE COTIZACIONES ===================
// =================== HISTORIAL DE COTIZACIONES ===================

/**
 * GET /cotizaciones
 * Obtiene todas las cotizaciones (para panel admin)
 */

app.get('/cotizaciones', function _callee24(req, res) {
  var historial;
  return regeneratorRuntime.async(function _callee24$(_context25) {
    while (1) {
      switch (_context25.prev = _context25.next) {
        case 0:
          _context25.prev = 0;
          _context25.next = 3;
          return regeneratorRuntime.awrap(Cotizacion.find().sort({
            fecha: -1
          }).populate('userId', 'nombre email').lean());

        case 3:
          historial = _context25.sent;
          // Normaliza nombres de productos
          historial.forEach(function (cot) {
            if (cot.productos && Array.isArray(cot.productos)) {
              cot.productos = cot.productos.map(function (p) {
                return {
                  nombre: p.nombre || p.name || 'Sin nombre',
                  cantidad: p.cantidad || 1,
                  precio: p.precio || 0
                };
              });
            }
          });
          res.status(200).json({
            success: true,
            count: historial.length,
            data: historial
          });
          _context25.next = 12;
          break;

        case 8:
          _context25.prev = 8;
          _context25.t0 = _context25["catch"](0);
          console.error('Error al obtener todas las cotizaciones:', _context25.t0);
          res.status(500).json({
            success: false,
            message: 'Error al obtener cotizaciones',
            error: _context25.t0.message
          });

        case 12:
        case "end":
          return _context25.stop();
      }
    }
  }, null, null, [[0, 8]]);
});
/**
 * GET /cotizaciones/usuario/:userId
 * Obtiene las cotizaciones de un usuario específico
 */

app.get('/cotizaciones/usuario/:userId', function _callee25(req, res) {
  var userId, cotizaciones;
  return regeneratorRuntime.async(function _callee25$(_context26) {
    while (1) {
      switch (_context26.prev = _context26.next) {
        case 0:
          _context26.prev = 0;
          userId = req.params.userId;

          if (!(!userId || userId === 'undefined' || userId === 'null')) {
            _context26.next = 4;
            break;
          }

          return _context26.abrupt("return", res.status(400).json({
            success: false,
            message: 'ID de usuario no válido'
          }));

        case 4:
          console.log("\uD83D\uDD0E Buscando historial de cotizaciones del usuario: ".concat(userId)); // Buscar cotizaciones del usuario con populate

          _context26.next = 7;
          return regeneratorRuntime.awrap(Cotizacion.find({
            userId: userId
          }).sort({
            fecha: -1
          }).populate({
            path: 'productos.productoId',
            model: 'Product',
            // Asegúrate de que coincida con el nombre de tu modelo
            select: 'name nombre image category description precio',
            strictPopulate: false
          }).select('fecha productos estado createdAt updatedAt').lean());

        case 7:
          cotizaciones = _context26.sent;
          // Ajustamos el formato de los productos
          cotizaciones.forEach(function (cot) {
            if (cot.productos && Array.isArray(cot.productos)) {
              cot.productos = cot.productos.map(function (p) {
                var producto = p.productoId || {};
                return {
                  nombre: p.equipo || p.nombre || p.name || 'Sin nombre',
                  cantidad: p.cantidad || 1,
                  precio: producto.precio || 0,
                  imagen: producto.image || '',
                  categoria: producto.category || ''
                };
              });
            }
          });
          return _context26.abrupt("return", res.status(200).json({
            success: true,
            count: cotizaciones.length,
            data: cotizaciones
          }));

        case 12:
          _context26.prev = 12;
          _context26.t0 = _context26["catch"](0);
          console.error('Error al obtener historial del usuario:', _context26.t0);
          res.status(500).json({
            success: false,
            message: 'Error al obtener historial del usuario',
            error: _context26.t0.message
          });

        case 16:
        case "end":
          return _context26.stop();
      }
    }
  }, null, null, [[0, 12]]);
});
/**
 * GET /cotizaciones/:cotizacionId
 * Obtiene los detalles de una cotización específica
 */

app.get('/cotizaciones/:cotizacionId', function _callee26(req, res) {
  var cotizacionId, cotizacion;
  return regeneratorRuntime.async(function _callee26$(_context27) {
    while (1) {
      switch (_context27.prev = _context27.next) {
        case 0:
          _context27.prev = 0;
          cotizacionId = req.params.cotizacionId;

          if (!(!cotizacionId || cotizacionId === 'undefined')) {
            _context27.next = 4;
            break;
          }

          return _context27.abrupt("return", res.status(400).json({
            success: false,
            message: 'ID de cotización no válido'
          }));

        case 4:
          _context27.next = 6;
          return regeneratorRuntime.awrap(Cotizacion.findById(cotizacionId).populate({
            path: 'productos.productoId',
            model: 'Product',
            select: 'name nombre image category description precio',
            strictPopulate: false
          }).lean());

        case 6:
          cotizacion = _context27.sent;

          if (cotizacion) {
            _context27.next = 9;
            break;
          }

          return _context27.abrupt("return", res.status(404).json({
            success: false,
            message: 'Cotización no encontrada'
          }));

        case 9:
          // Normaliza productos
          if (cotizacion.productos && Array.isArray(cotizacion.productos)) {
            cotizacion.productos = cotizacion.productos.map(function (p) {
              var producto = p.productoId || {};
              return {
                nombre: p.equipo || p.nombre || p.name || 'Sin nombre',
                cantidad: p.cantidad || 1,
                precio: producto.precio || 0,
                imagen: producto.image || '',
                categoria: producto.category || ''
              };
            });
          }

          res.status(200).json({
            success: true,
            data: cotizacion
          });
          _context27.next = 17;
          break;

        case 13:
          _context27.prev = 13;
          _context27.t0 = _context27["catch"](0);
          console.error('Error al obtener cotización:', _context27.t0);
          res.status(500).json({
            success: false,
            message: 'Error al obtener la cotización',
            error: _context27.t0.message
          });

        case 17:
        case "end":
          return _context27.stop();
      }
    }
  }, null, null, [[0, 13]]);
});
/**
 * PATCH /cotizaciones/:cotizacionId/estado
 * Actualiza el estado de una cotización
 */

app.patch('/cotizaciones/:cotizacionId/estado', function _callee27(req, res) {
  var cotizacionId, estado, estadosPermitidos, cotizacion;
  return regeneratorRuntime.async(function _callee27$(_context28) {
    while (1) {
      switch (_context28.prev = _context28.next) {
        case 0:
          _context28.prev = 0;
          cotizacionId = req.params.cotizacionId;
          estado = req.body.estado;
          estadosPermitidos = ['pendiente', 'en proceso', 'atendida', 'completada', 'cancelada'];

          if (!(!estado || !estadosPermitidos.includes(estado.toLowerCase()))) {
            _context28.next = 6;
            break;
          }

          return _context28.abrupt("return", res.status(400).json({
            success: false,
            message: 'Estado no válido',
            estadosPermitidos: estadosPermitidos
          }));

        case 6:
          _context28.next = 8;
          return regeneratorRuntime.awrap(Cotizacion.findByIdAndUpdate(cotizacionId, {
            estado: estado.toLowerCase(),
            updatedAt: new Date()
          }, {
            "new": true,
            runValidators: true
          }));

        case 8:
          cotizacion = _context28.sent;

          if (cotizacion) {
            _context28.next = 11;
            break;
          }

          return _context28.abrupt("return", res.status(404).json({
            success: false,
            message: 'Cotización no encontrada'
          }));

        case 11:
          res.status(200).json({
            success: true,
            message: 'Estado actualizado correctamente',
            data: cotizacion
          });
          _context28.next = 18;
          break;

        case 14:
          _context28.prev = 14;
          _context28.t0 = _context28["catch"](0);
          console.error('Error al actualizar estado:', _context28.t0);
          res.status(500).json({
            success: false,
            message: 'Error al actualizar el estado',
            error: _context28.t0.message
          });

        case 18:
        case "end":
          return _context28.stop();
      }
    }
  }, null, null, [[0, 14]]);
});
/**
 * DELETE /cotizaciones/:cotizacionId
 * Elimina una cotización
 */

app["delete"]('/cotizaciones/:cotizacionId', function _callee28(req, res) {
  var cotizacionId, cotizacion;
  return regeneratorRuntime.async(function _callee28$(_context29) {
    while (1) {
      switch (_context29.prev = _context29.next) {
        case 0:
          _context29.prev = 0;
          cotizacionId = req.params.cotizacionId;
          _context29.next = 4;
          return regeneratorRuntime.awrap(Cotizacion.findByIdAndDelete(cotizacionId));

        case 4:
          cotizacion = _context29.sent;

          if (cotizacion) {
            _context29.next = 7;
            break;
          }

          return _context29.abrupt("return", res.status(404).json({
            success: false,
            message: 'Cotización no encontrada'
          }));

        case 7:
          res.status(200).json({
            success: true,
            message: 'Cotización eliminada correctamente'
          });
          _context29.next = 14;
          break;

        case 10:
          _context29.prev = 10;
          _context29.t0 = _context29["catch"](0);
          console.error('Error al eliminar cotización:', _context29.t0);
          res.status(500).json({
            success: false,
            message: 'Error al eliminar la cotización',
            error: _context29.t0.message
          });

        case 14:
        case "end":
          return _context29.stop();
      }
    }
  }, null, null, [[0, 10]]);
});
app.put('/cotizaciones/:id', function _callee29(req, res) {
  var id, estado, cotizacion;
  return regeneratorRuntime.async(function _callee29$(_context30) {
    while (1) {
      switch (_context30.prev = _context30.next) {
        case 0:
          _context30.prev = 0;
          id = req.params.id;
          estado = req.body.estado;
          _context30.next = 5;
          return regeneratorRuntime.awrap(Cotizacion.findByIdAndUpdate(id, {
            estado: estado
          }, {
            "new": true
          }));

        case 5:
          cotizacion = _context30.sent;

          if (cotizacion) {
            _context30.next = 8;
            break;
          }

          return _context30.abrupt("return", res.status(404).json({
            success: false,
            message: 'Cotización no encontrada'
          }));

        case 8:
          res.json({
            success: true,
            data: cotizacion
          });
          _context30.next = 15;
          break;

        case 11:
          _context30.prev = 11;
          _context30.t0 = _context30["catch"](0);
          console.error(_context30.t0);
          res.status(500).json({
            success: false,
            message: 'Error al actualizar el estado'
          });

        case 15:
        case "end":
          return _context30.stop();
      }
    }
  }, null, null, [[0, 11]]);
}); // =================== FIN PRODUCTOS ===================
// Iniciar servidor

app.listen(PORT, function () {
  console.log("Server running on http://localhost:".concat(PORT));
});
//# sourceMappingURL=server.dev.js.map
