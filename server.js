const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

// Crear servidor HTTP
const server = http.createServer(app);

// Carpeta uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
require('dotenv').config();



const bcrypt = require('bcrypt');



// Middleware - IMPORTANTE: el orden es crucial
// CORS primero
// Middleware - IMPORTANTE: el orden es crucial
// CORS primero
// ==== CORS GLOBAL ====
const allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:3000',
  'http://localhost:3200',
  'https://dinsac-admin.onrender.com',
  'https://dinsac-cliente.onrender.com'
];

// 🔥 INICIALIZAR SOCKET.IO (esto faltaba)
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS bloqueado por seguridad: " + origin), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));






app.use(express.json({ limit: '100mb' })); // aceptar JSON grandes
app.use(express.urlencoded({ extended: true, limit: '100mb' })); // aceptar formularios grandes
app.use('/uploads', express.static('uploads'));


// Middleware personalizado para convertir text/plain a JSON cuando es necesario
app.use((req, res, next) => {
    if (req.headers['content-type'] === 'text/plain' && req.body && typeof req.body === 'string') {
        try {
            req.body = JSON.parse(req.body);
            console.log('Converted text/plain to JSON:', req.body);
        } catch (e) {
            console.error('Failed to parse text/plain as JSON:', e);
        }
    }
    next();
});

// MongoDB Connection
//const dbURI = 'mongodb://localhost:27017/mydatabase';
//mongoose.connect(dbURI)
  //  .then(() => console.log('MongoDB connected'))
   // .catch(err => console.error('MongoDB connection error:', err));

    // MongoDB Connection
const dbURI = process.env.MONGODB_URI; // antes tenías localhost
mongoose.connect(dbURI, {
    
})
.then(() => console.log('✅ MongoDB Atlas connected'))
.catch(err => console.error('❌ MongoDB Atlas connection error:', err));



// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin' }
});
const User = mongoose.model('User', userSchema);

// Default Admin User
async function createAdminUser() {
  const admin = await User.findOne({ username: 'admin' });
  if (!admin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const newAdmin = new User({ username: 'admin', password: hashedPassword, role: 'admin' });
      await newAdmin.save();
      console.log('Admin user created');
  } else {
      console.log('Admin user already exists');
  }
}
createAdminUser();






createAdminUser();

// 🔧 RUTA TEMPORAL PARA FORZAR RECREACIÓN DEL ADMIN
app.post('/forzar-crear-admin', async (req, res) => {
    try {
        // Primero eliminar cualquier admin existente
        await User.deleteMany({ username: 'admin' });
        console.log('✅ Admins anteriores eliminados');

        // Crear nuevo admin con password hasheado
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const newAdmin = new User({ 
            username: 'admin', 
            password: hashedPassword, 
            role: 'admin' 
        });
        
        await newAdmin.save();
        console.log('✅ Nuevo admin creado');

        res.json({ 
            message: '✅ Admin creado exitosamente',
            admin: {
                _id: newAdmin._id,
                username: newAdmin.username,
                role: newAdmin.role,
                passwordHash: newAdmin.password.substring(0, 20) + '...'
            }
        });
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({ 
            error: err.message,
            stack: err.stack 
        });
    }
});

// 🔧 RUTA PARA VERIFICAR QUÉ HAY EN LA BASE DE DATOS
app.get('/ver-usuarios', async (req, res) => {
    try {
        const users = await User.find({});
        res.json({ 
            total: users.length,
            usuarios: users.map(u => ({
                _id: u._id,
                username: u.username,
                role: u.role,
                passwordLength: u.password.length,
                passwordStart: u.password.substring(0, 10) + '...'
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});





// =================== RUTA BASE / (ROOT) ===================
app.get('/', (req, res) => {
  res.status(200).json({
  message: '✅ API DINSAC corriendo correctamente en Render. Usa las rutas /users, /products, etc.',
 environment: process.env.NODE_ENV || 'production'
 });
});


// Rutas de Usuario
app.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Error al obtener usuarios', error: err });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username y password son obligatorios' });
        }

        // Buscar usuario admin
        const user = await User.findOne({ username });
        
        if (user && await bcrypt.compare(password, user.password)) {
            res.json({ 
                message: 'Login exitoso', 
                user: {
                    _id: user._id,
                    username: user.username,
                    role: user.role
                },
                success: true
            });
        } else {
            res.status(401).json({ 
                message: 'Credenciales incorrectas',
                success: false
            });
        }
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ message: 'Error en el servidor', error: err.message });
    }
});

// Registro de Cliente
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password) {
            return res.status(400).json({ message: 'Username y password son obligatorios' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        // 🔐 Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ 
            username, 
            password: hashedPassword,  // ✅ Guardar password hasheado
            role: 'cliente' 
        });
        
        await newUser.save();
        
        res.status(201).json({ 
            message: 'Cliente registrado correctamente', 
            user: {
                _id: newUser._id,
                username: newUser.username,
                role: newUser.role
            }
        });
    } catch (err) {
        console.error('Error registrando usuario:', err);
        res.status(500).json({ message: 'Error al registrar cliente', error: err.message });
    }
});







//===========================USER CLIENTE =================///


const userClienteSchema = new mongoose.Schema({
  password: { type: String, required: true },               
  nombre: { type: String, required: true },                 
  email: { type: String, required: true, unique: true },    
  telefono: { type: String },                               
  direccion: { type: String },       
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }] // ⭐ nuevo campo
                        
});

const UserCliente = mongoose.model('UserCliente', userClienteSchema);

app.get('/clientes', async (req, res) => {
    try {
        const clientes = await UserCliente.find().select('-password'); // No devolver passwords
        res.json(clientes);
    } catch (err) {
        res.status(500).json({ message: 'Error al obtener clientes', error: err.message });
    }
});


// Registro de nuevo cliente
// Registro de nuevo cliente
app.post('/clientes/register', async (req, res) => {
    try {
        console.log('Datos recibidos para registro:', req.body);
        
        const { password, nombre, email, telefono, direccion } = req.body;

        if (!password || !nombre || !email) {
            return res.status(400).json({ 
                message: 'Password, nombre y email son obligatorios',
                receivedData: req.body
            });
        }

        const existingCliente = await UserCliente.findOne({ email });
        if (existingCliente) {
            return res.status(400).json({ message: 'El email ya está registrado' });
        }

        // 🔐 HASHEAR LA CONTRASEÑA
        const hashedPassword = await bcrypt.hash(password, 10);

        const newCliente = new UserCliente({ 
            password: hashedPassword,  // ✅ Guardar hasheado
            nombre, 
            email, 
            telefono: telefono || '', 
            direccion: direccion || '' 
        });

        await newCliente.save();
        

// ENVIAR CORREO AL CLIENTE
const mailOptions = {
  from: 'monica.romeroz.2003@gmail.com',
  to: email,
  subject: 'Registro en la Web de DINSAC',
  text: `¡Hola ${nombre}! 
  ¡Gracias por registrarte en la plataforma de DINSAC, Bienvenido!

Ahora puedes explorar nuestros productos y realizar tus compras cuando gustes.  
Si tienes dudas, escríbenos a soporte@dinsac.com

¡Que tengas un excelente día!

Atentamente,  
El equipo de DINSAC..`
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Error al enviar correo:', error);
  } else {
    console.log('Correo enviado: ' + info.response);
  }
});

        
        // Devolver cliente sin password
        const clienteResponse = {
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
    } catch (err) {
        console.error('Error registrando cliente:', err);
        if (err.code === 11000) {
            // Error de duplicado de MongoDB
            res.status(400).json({ message: 'El email ya está registrado' });
        } else {
            res.status(500).json({ message: 'Error al registrar cliente', error: err.message });
        }
    }
});

// Login de cliente
// Login de cliente
app.post('/clientes/login', async (req, res) => {
    try {
        console.log('Intento de login de cliente:', req.body);
        
        const { email, password } = req.body;

        // Validaciones
        if (!email || !password) {
            return res.status(400).json({ message: 'Email y password son obligatorios' });
        }

        // ✅ Buscar cliente por email en UserCliente
        const cliente = await UserCliente.findOne({ email });
        
        if (!cliente) {
            console.log('❌ Cliente no encontrado:', email);
            return res.status(401).json({ 
                message: 'Credenciales inválidas',
                success: false
            });
        }

        // ✅ Comparar password con bcrypt
        const passwordValido = await bcrypt.compare(password, cliente.password);
        
        if (!passwordValido) {
            console.log('❌ Password incorrecto para:', email);
            return res.status(401).json({ 
                message: 'Credenciales inválidas',
                success: false
            });
        }

        // ✅ Login exitoso
        const clienteResponse = {
            _id: cliente._id,
            nombre: cliente.nombre,
            email: cliente.email,
            telefono: cliente.telefono,
            direccion: cliente.direccion
        };
        
        console.log('✅ Login exitoso:', clienteResponse.nombre);
        
        res.json({ 
            message: 'Login exitoso', 
            cliente: clienteResponse,
            success: true
        });

    } catch (err) {
        console.error('Error en login de cliente:', err);
        res.status(500).json({ message: 'Error en el servidor', error: err.message });
    }
});




// Eliminar cliente
app.delete('/clientes/:id', async (req, res) => {
    try {
        const deletedCliente = await UserCliente.findByIdAndDelete(req.params.id);
        
        if (!deletedCliente) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        res.json({ 
            message: 'Cliente eliminado correctamente',
            cliente: {
                _id: deletedCliente._id,
                nombre: deletedCliente.nombre,
                email: deletedCliente.email
            }
        });
    } catch (err) {
        console.error('Error eliminando cliente:', err);
        res.status(500).json({ message: 'Error eliminando cliente', error: err.message });
    }
});







// =================== PRODUCTOS ===================

// =================== CONFIGURACIÓN DE CORREO ===================
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'monica.romeroz.2003@gmail.com',  // ✅ 'user' no 'EMAIL_USER'
    pass: 'xjflfqsxxynkpkqi'  // ✅ 'pass' no 'EMAIL_PASS'
  },
  tls: { rejectUnauthorized: false }
});

// =================== PRODUCTOS ===================

// Esquema actualizado del producto
const productSchema = new mongoose.Schema({
  codigo: { type: Number, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  image1: { type: String, required: false },
  image2: { type: String, required: false },
  image3: { type: String, required: false },
  stock: { type: Number, required: true },
  category: { type: String, required: true },
  estado: { 
    type: String, 
    enum: ['Normal', 'Oferta'], // <-- solo acepta estos dos valores
    required: true 
  },
  videoURL: { type: String, required: false },
  featuresText: { type: String, required: false },
  tagsText: { type: String, required: false },
  destacado: { type: Boolean, default: false }
});

const Product = mongoose.model('Product', productSchema);

// =================== RUTAS ===================

// Obtener todos los productos (con filtros opcionales)
app.get('/products', async (req, res) => {
  try {
    const { category, estado } = req.query;

    const query = {};
    if (category) query.category = category;
if (estado) query.estado = new RegExp(`^${estado}$`, 'i');  

    const products = await Product.find(query);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching products', error: err });
  }
});

// Obtener producto por ID
app.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching product', error: err });
  }
});

// Crear un nuevo producto
app.post('/products', async (req, res) => {
  try {
    console.log('📥 POST /products recibido');
    console.log('Body:', req.body);

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message: 'Error: Request body vacío o indefinido',
        receivedHeaders: req.headers
      });
    }

    const {
      codigo,
      name,
      description,
      image,
      image1,
      image2,
      image3,
      stock,
      category,
      estado,
      videoURL,
      featuresText,
      tagsText,
      destacado
    } = req.body;

    // Validaciones mínimas
    if (!codigo || !name || !description || !image || !stock || !category || !estado) {
      return res.status(400).json({
        message: 'Faltan campos obligatorios',
        receivedData: req.body
      });
    }

    const newProduct = new Product({
      codigo,
      name,
      description,
      image,
      image1,
      image2,
      image3,
      stock,
      category,
      estado,
      videoURL,
      featuresText,
      tagsText,
      destacado
    });

    await newProduct.save();
    console.log('✅ Producto guardado correctamente:', newProduct);
    res.status(201).json(newProduct);
  } catch (err) {
    console.error('❌ Error al crear producto:', err);
    res.status(400).json({
      message: 'Error creando producto',
      error: err.message || err,
      stack: err.stack
    });
  }
});

// Actualizar un producto por ID
app.put('/products/:id', async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedProduct) return res.status(404).json({ message: 'Product not found' });
    res.json(updatedProduct);
  } catch (err) {
    res.status(400).json({ message: 'Error updating product', error: err });
  }
});

// Eliminar un producto por ID
app.delete('/products/:id', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting product', error: err });
  }
});





// 📌 Agregar producto a favoritos
app.post('/favorites', async (req, res) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ message: "Faltan userId o productId" });
    }

    const user = await UserCliente.findById(userId); // 👈 cambio a UserCliente
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    if (!user.favorites.includes(productId)) {
      user.favorites.push(productId);
      user.favorites = [...new Set(user.favorites.map(f => f.toString()))];
      await user.save();
    }

    const updatedUser = await UserCliente.findById(userId).populate('favorites'); // 👈 cambio
    res.json({
      message: "Producto agregado a favoritos",
      favorites: updatedUser.favorites
    });
  } catch (err) {
    console.error("❌ Error en POST /favorites:", err);
    res.status(500).json({ message: "Error al agregar a favoritos", error: err.message });
  }
});

// 📌 Obtener favoritos de un cliente
app.get('/favorites/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await UserCliente.findById(userId).populate('favorites'); // 👈 cambio
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    res.json({
      message: "Favoritos obtenidos correctamente",
      favorites: user.favorites
    });
  } catch (err) {
    console.error("❌ Error en GET /favorites/:userId:", err);
    res.status(500).json({ message: "Error al obtener favoritos", error: err.message });
  }
});

// 📌 Eliminar producto de favoritos
app.delete('/favorites/:userId/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;

    const user = await UserCliente.findById(userId); // 👈 cambio
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const before = user.favorites.length;
    user.favorites = user.favorites.filter(fav => fav.toString() !== productId);

    if (before === user.favorites.length) {
      return res.status(404).json({ message: "Producto no estaba en favoritos" });
    }

    await user.save();
    const updatedUser = await UserCliente.findById(userId).populate('favorites'); // 👈 cambio

    res.json({
      message: "Producto eliminado de favoritos",
      favorites: updatedUser.favorites
    });
  } catch (err) {
    console.error("❌ Error en DELETE /favorites/:userId/:productId:", err);
    res.status(500).json({ message: "Error al eliminar de favoritos", error: err.message });
  }
});










// =================== orden===================


const ordenSchema = new mongoose.Schema({
  nombre: String,
  email: String,
  productos: [
    {
      name: String,
      cantidad: Number,
      price: Number
    }
  ],
  total: Number,
  fecha: {
    type: Date,
    default: Date.now
  }
});

const Orden = mongoose.model('Orden', ordenSchema);


app.post('/ordenes', async (req, res) => {
  try {
    const { nombre, email, productos, total } = req.body;

    // Guardar la orden en MongoDB
    const nuevaOrden = new Orden({ nombre, email, productos, total });
    await nuevaOrden.save();

    // Armar el mensaje del correo
    const resumen = productos
      .map(p => `- ${p.name} (x${p.cantidad}) - S/ ${p.price * p.cantidad}`)
      .join('\n');

    const mensaje = `Hola ${nombre},\n\nGracias por tu compra en DINSAC.\n\nResumen:\n${resumen}\n\nTotal: S/ ${total}\n\nSaludos,\nEquipo DINSAC`;

    // Enviar correo
    await transporter.sendMail({
      from: 'monica.romeroz.2003@gmail.com', // reemplaza por tu correo real
      to: email,
      subject: '🧾 Confirmación de tu compra en DINSAC, ¡Gracias por tu compra en DINSAC! 🎉',
      text: mensaje
    });

    res.status(200).json({ message: 'Orden registrada y correo enviado.' });
  } catch (error) {
    console.error('Error al registrar orden:', error);
    res.status(500).json({ message: 'Error al guardar orden o enviar correo.' });
  }
});

app.get('/ordenes', async (req, res) => {
  try {
    const ordenes = await Orden.find().sort({ fecha: -1 }); // más recientes arriba
    res.json(ordenes);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener órdenes' });
  }
});





// =================== para IA  ===================
// ========== ESQUEMA DE INTERACCIONES ==========
const interaccionSchema = new mongoose.Schema({
  usuario: String,
  mensaje: String,
  fecha: Date
});

const Interaccion = mongoose.model('Interaccion', interaccionSchema);

// ========== RUTA PARA GUARDAR ==========
app.post('/interacciones', async (req, res) => {
  try {
    const nueva = new Interaccion(req.body);
    await nueva.save();
    res.status(201).json({ message: '✅ Interacción guardada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar la interacción' });
  }
});

// ========== RUTA PARA OBTENER ==========
app.get('/interacciones', async (req, res) => {
  try {
    const interacciones = await Interaccion.find().sort({ fecha: -1 });
    res.json(interacciones);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener interacciones' });
  }
});






// =================== COTIZACION  ===================

const cotizacionSchema = new mongoose.Schema({
  numeroCotizacion: { type: String, required: true, unique: true },
userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserCliente', required: true },
  nombre: String,
  dniRuc: String,
  email: String,
  telefonoMovil: String,
  mensaje: String,
  contacto: String,
  productos: [
    {
      categoria: String,
      equipo: String,
      cantidad: Number,
      precioUnitario: Number
    }
  ],
  pdfBase64: String,
  fecha: { type: Date, default: Date.now },
  estado: { type: String, default: 'pendiente' }, // 🟢 <--- AGREGA ESTO
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});



const Cotizacion = mongoose.model('Cotizacion', cotizacionSchema);



// ===================  GUARDAR COTIZACION  ===================

// ✅ Endpoint corregido para guardar cotización y enviar correo
// =================== GUARDAR COTIZACION ===================

// =================== GUARDAR COTIZACION ===================
// =================== GUARDAR COTIZACION ===================
app.post('/cotizaciones', async (req, res) => {
  try {
    console.log('📧 Procesando cotización...');
    console.log('📦 Datos recibidos:', JSON.stringify(req.body, null, 2));

    const email = req.body.email;
    const telefonoMovil = req.body.telefonoMovil;
    const contacto = req.body.contacto;

    if (!email && !telefonoMovil) {
      return res.status(400).json({
        message: 'Se requiere al menos email o teléfono',
        success: false
      });
    }

    // 🔹 Buscar datos del usuario si viene userId
    let usuarioData = {
      nombre: req.body.nombre || 'Cliente sin nombre',
      email: email || '',
      telefono: telefonoMovil || ''
    };

    if (req.body.userId) {
      try {
        const usuarioExiste = await UserCliente.findById(req.body.userId);
        if (usuarioExiste) {
          usuarioData = {
            nombre: usuarioExiste.nombre,
            email: usuarioExiste.email,
            telefono: usuarioExiste.telefono || usuarioExiste.telefonoMovil
          };
          console.log('✅ Usuario encontrado:', usuarioData.nombre);
        }
      } catch (err) {
        console.log('⚠️ userId inválido, usando datos del request');
      }
    }

    // 🔹 Generar número de cotización ÚNICO con retry
    let numeroCotizacion;
    let intentos = 0;
    const maxIntentos = 5;
    
    while (intentos < maxIntentos) {
      const total = await Cotizacion.countDocuments();
      numeroCotizacion = `COT-${(total + 1 + intentos).toString().padStart(8, '0')}`;
      
      // Verificar si ya existe
      const existe = await Cotizacion.findOne({ numeroCotizacion });
      
      if (!existe) {
        console.log('✅ Número único generado:', numeroCotizacion);
        break;
      }
      
      console.log('⚠️ Número duplicado, reintentando...', numeroCotizacion);
      intentos++;
    }

    if (intentos >= maxIntentos) {
      // Generar con timestamp si falla
      numeroCotizacion = `COT-${Date.now().toString().slice(-8)}`;
      console.log('⚠️ Usando timestamp:', numeroCotizacion);
    }

    // 🔹 Preparar datos
    const datosCotizacion = {
      numeroCotizacion,
      userId: req.body.userId || null,
      nombre: req.body.nombre || usuarioData.nombre,
      dniRuc: req.body.dniRuc || '',
      email: req.body.email || usuarioData.email,
      telefonoMovil: req.body.telefonoMovil || usuarioData.telefono,
      mensaje: req.body.mensaje || '',
      contacto: req.body.contacto || 'No especificado',
      productos: Array.isArray(req.body.productos) && req.body.productos.length > 0 
        ? req.body.productos 
        : [{
            categoria: 'Sin categoría',
            equipo: 'Producto no especificado',
            cantidad: 0,
            precioUnitario: 0
          }],
      pdfBase64: req.body.pdfBase64 || '',
      fecha: new Date(),
      estado: 'pendiente'
    };

    console.log('📋 Datos a guardar:', {
      numeroCotizacion: datosCotizacion.numeroCotizacion,
      nombre: datosCotizacion.nombre,
      email: datosCotizacion.email,
      productos: datosCotizacion.productos.length,
      pdfBase64: datosCotizacion.pdfBase64 ? '[PDF PRESENTE]' : '[SIN PDF]'
    });

    // 🔹 Guardar cotización
    const nuevaCotizacion = new Cotizacion(datosCotizacion);
    await nuevaCotizacion.save();
    console.log('✅ Cotización guardada con ID:', nuevaCotizacion._id);

    // =================== ENVÍO DE CORREO ===================
    console.log('\n🔍 === VERIFICACIÓN DE ENVÍO DE CORREO ===');
    
    const tieneEmail = !!datosCotizacion.email;
    const tienePDF = !!datosCotizacion.pdfBase64;
    const pdfValido = datosCotizacion.pdfBase64?.length > 100;

    console.log('📧 Email:', datosCotizacion.email);
    console.log('📄 PDF válido?', pdfValido);

    if (tieneEmail && tienePDF && pdfValido) {
      console.log('✅ Intentando enviar correo...');
      
      try {
        const pdfBuffer = Buffer.from(datosCotizacion.pdfBase64, 'base64');
        console.log('📄 Buffer creado:', pdfBuffer.length, 'bytes');

        const mailOptions = {
          from: 'monica.romeroz.2003@gmail.com',
          to: `${datosCotizacion.email}, monica.romeroz.2003@gmail.com`,
          subject: `Cotización ${numeroCotizacion} - DINSAC`,
          html: `
            <h3>Cotización ${numeroCotizacion}</h3>
            <p><strong>Cliente:</strong> ${datosCotizacion.nombre}</p>
            <p><strong>Email:</strong> ${datosCotizacion.email}</p>
            <p><strong>Teléfono:</strong> ${datosCotizacion.telefonoMovil}</p>
            <p><strong>DNI/RUC:</strong> ${datosCotizacion.dniRuc}</p>
            <p><strong>Contacto preferido:</strong> ${datosCotizacion.contacto}</p>
            <p><strong>Mensaje:</strong> ${datosCotizacion.mensaje}</p>
            <br>
            <p>Adjuntamos la cotización en formato PDF.</p>
          `,
          attachments: [{
            filename: `Cotizacion_${numeroCotizacion}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }]
        };

        console.log('📧 Enviando a:', mailOptions.to);

        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅✅✅ CORREO ENVIADO EXITOSAMENTE ✅✅✅');
        console.log('  - MessageId:', info.messageId);
        console.log('  - Response:', info.response);
        
      } catch (emailError) {
        console.error('❌ ERROR AL ENVIAR CORREO:');
        console.error('  - Mensaje:', emailError.message);
        console.error('  - Código:', emailError.code);
        // No fallar la petición
      }
    } else {
      console.log('⚠️ No se envió correo (condiciones no cumplidas)');
    }

    console.log('=== FIN VERIFICACIÓN DE CORREO ===\n');

    res.status(201).json({ 
      message: `Cotización ${numeroCotizacion} guardada exitosamente`,
      numeroCotizacion,
      cotizacionId: nuevaCotizacion._id,
      success: true
    });

  } catch (error) {
    console.error('❌ ERROR CRÍTICO:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      message: 'Error al procesar la cotización',
      error: error.message,
      success: false
    });
  }
});










// 🔹 Contar cotizaciones pendientes
// 🔹 Contar cotizaciones pendientes (usando Mongoose)
app.get('/cotizaciones/pendientes/total', async (req, res) => {
  try {
    const totalPendientes = await Cotizacion.countDocuments({ estado: 'pendiente' });
    res.json({ total: totalPendientes });
  } catch (error) {
    console.error('❌ Error al contar cotizaciones pendientes:', error);
    res.status(500).json({
      message: 'Error al obtener cotizaciones pendientes',
      error: error.message
    });
  }
});


app.delete('/cotizaciones/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await Cotizacion.findByIdAndDelete(id);
    res.json({ message: 'Cotización eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar cotización:', error);
    res.status(500).json({ message: 'Error al eliminar cotización' });
  }
});

// ===================  contar COTIZACION  ===================


app.get('/cotizaciones/total', async (req, res) => {
  try {
    const total = await Cotizacion.countDocuments();
    res.json({ total });
  } catch (err) {
    res.status(500).json({ message: 'Error al contar cotizaciones', error: err });
  }
});




// =================== HISTORIAL DE COTIZACIONES ===================
// =================== HISTORIAL DE COTIZACIONES ===================


app.get('/cotizaciones', async (req, res) => {
  try {
    const cotizaciones = await Cotizacion.find()
      .populate('userId', 'nombre email telefonoMovil dniRuc') // ❌ Quita 'contacto' de aquí
      .sort({ fecha: -1 })
      .lean(); 

    const historial = cotizaciones.map(cot => ({
      _id: cot._id,
      numeroCotizacion: cot.numeroCotizacion, // ✅ Agrega esto
      fecha: cot.fecha,
      estado: cot.estado || 'pendiente',
      nombre: cot.nombre || cot.userId?.nombre || 'Sin nombre', // ✅ Usa cot.nombre primero
      email: cot.email || cot.userId?.email || '', // ✅ Usa cot.email primero
      telefonoMovil: cot.telefonoMovil || cot.userId?.telefonoMovil || '', // ✅ Usa cot.telefonoMovil
      dniRuc: cot.dniRuc || cot.userId?.dniRuc || '',
      dni: cot.dniRuc || cot.userId?.dniRuc || '', // ✅ Agrega alias 'dni'
      contacto: cot.contacto || 'No especificado',  // ✅ Esto ya está bien
      pdfBase64: cot.pdfBase64 || '', // ✅ Agrega el PDF
      productos: cot.productos.map(p => ({
        categoria: p.categoria || '', // ✅ Agrega categoria
        equipo: p.equipo || '', // ✅ Agrega equipo
        nombre: p.equipo || p.nombre || p.name || 'Sin nombre',
        cantidad: p.cantidad || 1,
        precio: p.precioUnitario || p.precio || 0
      }))
    }));

    res.json(historial); // ✅ Envía directamente el array, no { data: historial }
  } catch (error) {
    console.error('❌ Error al obtener cotizaciones:', error);
    res.status(500).json({ message: 'Error al obtener cotizaciones' });
  }
});



app.get('/cotizaciones/usuario/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || userId === 'undefined' || userId === 'null') {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario no válido',
      });
    }

    console.log(`🔎 Buscando historial de cotizaciones del usuario: ${userId}`);

    // Buscar cotizaciones del usuario con populate
    const cotizaciones = await Cotizacion.find({ userId })
      .sort({ fecha: -1 })
      .populate({
        path: 'productos.productoId',
        model: 'Product', // Asegúrate de que coincida con el nombre de tu modelo
        select: 'name nombre image category description precio',
        strictPopulate: false
      })
      .select('fecha productos estado createdAt updatedAt')
      .lean();

    // Ajustamos el formato de los productos
    cotizaciones.forEach(cot => {
      if (cot.productos && Array.isArray(cot.productos)) {
        cot.productos = cot.productos.map(p => {
          const producto = p.productoId || {};
          return {
          nombre: p.equipo || p.nombre || p.name || 'Sin nombre',
            cantidad: p.cantidad || 1,
            precio: producto.precio || 0,
            imagen: producto.image || '',
            categoria: producto.category || '',
          };
        });
      }
    });

    return res.status(200).json({
      success: true,
      count: cotizaciones.length,
      data: cotizaciones,
    });
  } catch (err) {
    console.error('Error al obtener historial del usuario:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial del usuario',
      error: err.message,
    });
  }
});



app.get('/cotizaciones/:cotizacionId', async (req, res) => {
  try {
    const { cotizacionId } = req.params;

    if (!cotizacionId || cotizacionId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'ID de cotización no válido',
      });
    }

    const cotizacion = await Cotizacion.findById(cotizacionId)
      .populate({
        path: 'productos.productoId',
        model: 'Product',
        select: 'name nombre image category description precio',
        strictPopulate: false
      })
      .lean();

    if (!cotizacion) {
      return res.status(404).json({
        success: false,
        message: 'Cotización no encontrada',
      });
    }

    // Normaliza productos
    if (cotizacion.productos && Array.isArray(cotizacion.productos)) {
      cotizacion.productos = cotizacion.productos.map(p => {
        const producto = p.productoId || {};
        return {
        nombre: p.equipo || p.nombre || p.name || 'Sin nombre',
          cantidad: p.cantidad || 1,
          precio: producto.precio || 0,
          imagen: producto.image || '',
          categoria: producto.category || '',
        };
      });
    }

    res.status(200).json({
      success: true,
      data: cotizacion,
    });
  } catch (err) {
    console.error('Error al obtener cotización:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la cotización',
      error: err.message,
    });
  }
});




app.patch('/cotizaciones/:cotizacionId/estado', async (req, res) => {
  try {
    const { cotizacionId } = req.params;
    const { estado } = req.body;

    const estadosPermitidos = [
      'pendiente',
      'en proceso',
      'atendida',
      'completada',
      'cancelada',
    ];

    if (!estado || !estadosPermitidos.includes(estado.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido',
        estadosPermitidos,
      });
    }

    const cotizacion = await Cotizacion.findByIdAndUpdate(
      cotizacionId,
      { estado: estado.toLowerCase(), updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!cotizacion) {
      return res.status(404).json({
        success: false,
        message: 'Cotización no encontrada',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Estado actualizado correctamente',
      data: cotizacion,
    });
  } catch (err) {
    console.error('Error al actualizar estado:', err);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado',
      error: err.message,
    });
  }
});




app.delete('/cotizaciones/:cotizacionId', async (req, res) => {
  try {
    const { cotizacionId } = req.params;

    const cotizacion = await Cotizacion.findByIdAndDelete(cotizacionId);

    if (!cotizacion) {
      return res.status(404).json({
        success: false,
        message: 'Cotización no encontrada',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cotización eliminada correctamente',
    });
  } catch (err) {
    console.error('Error al eliminar cotización:', err);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la cotización',
      error: err.message,
    });
  }
});

app.put('/cotizaciones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const cotizacion = await Cotizacion.findByIdAndUpdate(
      id,
      { estado },
      { new: true }
    );

    if (!cotizacion) {
      return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
    }

    res.json({ success: true, data: cotizacion });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al actualizar el estado' });
  }
});







// 🔹 Asegúrate de haber instalado socket.io:
// npm install socket.io
// =================== CHAT EN TIEMPO REAL ===================

// =================== SCHEMAS ===================
const ChatSchema = new mongoose.Schema({
  remitente: String,
  mensaje: String,
  clienteId: String,
  nombre: String,
  fecha: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chats', ChatSchema);

// =================== CONFIGURACIÓN DE MULTER ===================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const nombreSeguro = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, nombreSeguro);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB máximo
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = /jpeg|jpg|png|pdf/;
    const extension = tiposPermitidos.test(path.extname(file.originalname).toLowerCase());
    const mimetype = tiposPermitidos.test(file.mimetype);
    
    if (extension && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (JPG, PNG) y PDFs'));
  }
});

// =================== ENDPOINTS HTTP ===================

// 📋 Obtener lista de clientes con conversaciones
app.get('/clientes-chat', async (req, res) => {
  try {
    const clienteIds = await Chat.distinct("clienteId");
    
    const data = await Promise.all(
      clienteIds
        .filter(id => id !== 'ADMIN')
        .map(async (id) => {
          const ultimoMensaje = await Chat.findOne({ clienteId: id })
            .sort({ fecha: -1 })
            .limit(1);
          
let nombre;

if (ultimoMensaje?.nombre) {
  nombre = ultimoMensaje.nombre;
} else if (id.startsWith("anon-")) {
  nombre = `Cliente ${id.substring(5, 9)}`;
} else {
  nombre = `Cliente ${id.substring(0, 8)}`;
}

          
          return { 
            id, 
            nombre
          };
        })
    );
    
    res.json(data);
  } catch (error) {
    console.error('❌ Error obteniendo clientes:', error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// 📜 Obtener historial de chat
app.get('/chats/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const mensajes = await Chat.find({ clienteId }).sort({ fecha: 1 });
    res.json(mensajes);
  } catch (error) {
    console.error('❌ Error obteniendo chat:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// 🗑️ NUEVO: Borrar todo el chat de un cliente
app.delete('/chats/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    
    // Obtener todos los mensajes con archivos para borrarlos del servidor
    const mensajes = await Chat.find({ clienteId });
    
    for (const msg of mensajes) {
      if (msg.mensaje.includes('uploads/')) {
        const filename = msg.mensaje.split('uploads/')[1];
        const filepath = path.join(uploadsDir, filename);
        
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          console.log('🗑️ Archivo eliminado:', filename);
        }
      }
    }
    
    // Borrar todos los mensajes del chat
    const result = await Chat.deleteMany({ clienteId });
    console.log(`✅ Chat eliminado: ${clienteId} (${result.deletedCount} mensajes)`);
    
    // Notificar a todos los admins
    io.to('admins').emit('chat-eliminado', { clienteId });
    
    res.json({ 
      success: true, 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('❌ Error eliminando chat:', error);
    res.status(500).json({ error: 'Error al eliminar chat' });
  }
});

// 📤 Subir archivos
app.post('/upload-chat', upload.single('archivo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo' });
  }
  
  const fileUrl = `https://backend-dinsac-hlf0.onrender.com/uploads/${req.file.filename}`;
  console.log('📤 Archivo subido:', fileUrl);
  res.json({ url: fileUrl });
});








// =================== SOCKET.IO ===================
io.on('connection', (socket) => {
  console.log("🔵 Usuario conectado:", socket.id);
  socket.on('mensaje', data => {
    io.emit('mensaje', data);
 });
  socket.on('registrar', ({ clienteId, nombre }) => {
    socket.join(clienteId);

    if (clienteId === 'ADMIN') {
      socket.join('admins');
      console.log("🟣 Admin registrado en sala 'admins'");
    } else {
      console.log(`📌 Cliente registrado: ${clienteId} - ${nombre || 'Sin nombre'}`);
    }
  });

  socket.on('mensaje', async (msg) => {
    try {
      console.log("💬 Mensaje recibido:", msg);

      await Chat.create({
        remitente: msg.remitente,
        mensaje: msg.mensaje,
        clienteId: msg.clienteId,
nombre: msg.nombre || (msg.clienteId.startsWith("anon-")
  ? `Cliente ${msg.clienteId.substring(5, 9)}`
  : 'Cliente'),
        fecha: msg.fecha || new Date()
      });

      if (msg.remitente === 'cliente') {
        io.to('admins').emit('mensaje', msg);
      } else if (msg.remitente === 'admin') {
        io.to(msg.clienteId).emit('mensaje', msg);
      }

      console.log("✅ Mensaje enviado correctamente");

    } catch (error) {
      console.error("❌ Error guardando mensaje:", error);
    }
  });

  socket.on('disconnect', () => {
    console.log("🔴 Usuario desconectado:", socket.id);
  });
});











// 📌 Eliminar producto de favoritos
app.delete('/favorites/:userId/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;

    // Buscar usuario cliente
    const user = await UserCliente.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Verificar si el producto está en favoritos
    const index = user.favorites.indexOf(productId);
    if (index === -1) {
      return res.status(400).json({ message: "El producto no está en favoritos" });
    }

    // Eliminar el producto del array
    user.favorites.splice(index, 1);
    await user.save();

    // Volver a traer los favoritos actualizados con populate
    const updatedUser = await UserCliente.findById(userId).populate('favorites');

    res.json({
      message: "Producto eliminado de favoritos",
      favorites: updatedUser.favorites
    });

  } catch (err) {
    console.error("❌ Error en DELETE /favorites:", err);
    res.status(500).json({ message: "Error al eliminar favorito", error: err.message });
  }
});






// =================== BANNER DE OFERTAS ===================



// =================== BANNER DE OFERTAS ===================

// =================== BANNER DE OFERTAS ===================

const bannerSchema = new mongoose.Schema({
  tipo: { type: String, required: true },
  image: { type: String, required: true },   // nombre del archivo
  orden: { type: Number, default: 0 },       // ✅ NUEVO: para ordenar carrusel
  creado: { type: Date, default: Date.now }
});

const Banner = mongoose.model('Banner', bannerSchema);

// ====== CONFIGURACIÓN MULTER PARA BANNER ======
const storageBanner = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir); // carpeta /uploads
  },
  filename: function (req, file, cb) {
    cb(null, 'banner_' + Date.now() + path.extname(file.originalname));
  }
});

const uploadBanner = multer({ storage: storageBanner });

// ====== SERVIR ARCHIVOS ESTÁTICOS ======
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ====== POST: SUBIR BANNER ======
app.post('/banner', uploadBanner.single('image'), async (req, res) => {
  try {
    const tipo = req.body.tipo;
    const orden = req.body.orden ? parseInt(req.body.orden) : 0; // ✅ NUEVO

    if (!req.file) {
      return res.status(400).json({ mensaje: "No se envió ninguna imagen" });
    }

    console.log('📸 Archivo recibido:', req.file);
    console.log('📝 Tipo de banner:', tipo);
    console.log('🔢 Orden:', orden);

    // ✅ Para carrusel: eliminar solo el banner con el mismo orden
    if (tipo === 'carrusel') {
      await Banner.deleteMany({ tipo: 'carrusel', orden });
      console.log(`🗑️ Banner carrusel orden ${orden} eliminado`);
    } else {
      // Para otros tipos: eliminar todos los anteriores
      await Banner.deleteMany({ tipo });
    }

    const banner = new Banner({
      tipo,
      image: req.file.filename,
      orden // ✅ Guardar el orden
    });

    await banner.save();

    console.log('✅ Banner guardado:', banner);

    res.json({ 
      mensaje: `Banner ${tipo} guardado correctamente`, 
      banner,
      url: `https://backend-dinsac-hlf0.onrender.com/uploads/${req.file.filename}`
    });

  } catch (error) {
    console.error('❌ Error guardando banner:', error);
    res.status(500).json({ mensaje: "Error interno", error: error.message });
  }
});

// ====== GET: OBTENER BANNERS ======
app.get('/banner', async (req, res) => {
  try {
    const tipo = req.query.tipo;

    if (!tipo) {
      return res.status(400).json({ mensaje: "Debes indicar el tipo de banner" });
    }

    console.log(`🔍 Buscando banners del tipo: ${tipo}`);

    // 🔹 CASO 1: CARRUSEL (devolver array ordenado)
    if (tipo === 'carrusel') {
      
      const banners = await Banner.find({ tipo: 'carrusel' })
        .sort({ orden: 1, creado: -1 }) // ✅ Ordenar por "orden" primero
        .limit(3);
      
      const respuesta = banners.map(b => ({
        id: b._id,
        image: `https://backend-dinsac-hlf0.onrender.com/uploads/${b.image}`,
        tipo: b.tipo,
        orden: b.orden
      }));
      
      console.log(`✅ ${respuesta.length} banners de carrusel encontrados:`, respuesta);
      return res.json(respuesta);
    }

    // 🔹 CASO 2: PRINCIPAL u OFERTAS HOME (devolver solo el último)
    const banner = await Banner.findOne({ tipo }).sort({ creado: -1 });

    if (!banner) {
      console.log(`⚠️ No se encontró banner del tipo: ${tipo}`);
      return res.json({ image: '' });
    }

    console.log(`✅ Banner ${tipo} encontrado:`, banner.image);
    
    res.json({
      id: banner._id,
      image: `https://backend-dinsac-hlf0.onrender.com/uploads/${banner.image}`,
      tipo: banner.tipo
    });

  } catch (err) {
    console.error('❌ Error obteniendo banner:', err);
    res.status(500).json({ mensaje: "Error interno", error: err.message });
  }
});

// ====== DELETE: ELIMINAR BANNER (OPCIONAL) ======
app.delete('/banner/:id', async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    
    if (!banner) {
      return res.status(404).json({ mensaje: "Banner no encontrado" });
    }

    // Eliminar archivo físico
    const filePath = path.join(uploadsDir, banner.image);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    console.log('🗑️ Banner eliminado:', banner);
    res.json({ mensaje: "Banner eliminado correctamente" });

  } catch (error) {
    console.error('❌ Error eliminando banner:', error);
    res.status(500).json({ mensaje: "Error interno", error: error.message });
  }
});

 

// =================== FIN PRODUCTOS ===================

server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
