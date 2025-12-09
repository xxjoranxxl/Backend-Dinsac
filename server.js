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
require('dotenv').config(); // ✅ UNA SOLA VEZ

const app = express();
const PORT = 3000;

// Crear servidor HTTP
const server = http.createServer(app);

// Carpeta uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// =================== CONFIGURACIÓN DE NODEMAILER (UNA SOLA VEZ - GLOBAL) ===================
console.log('🔧 Configurando transporter de correo...');
console.log('📧 EMAIL_USER:', process.env.EMAIL_USER || '❌ NO CONFIGURADO');
console.log('🔑 EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Configurado' : '❌ NO CONFIGURADO');
console.log('🏢 EMAIL_OWNER:', process.env.EMAIL_OWNER || '❌ NO CONFIGURADO');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verificar conexión al iniciar el servidor
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error al conectar con Gmail:', error.message);
    console.error('⚠️ Verifica EMAIL_USER y EMAIL_PASS en tu archivo .env');
  } else {
    console.log('✅ Servidor de correo listo para enviar mensajes');
  }
});

// 🔥 INICIALIZAR SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: [
      '*',
      'https://dinsac-admin.onrender.com',
      'http://localhost:4200'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware CORS
app.use(cors({
  origin: [
    'http://localhost:4200',
    'http://localhost:3000',
    'http://localhost:3200',
    'https://dinsac-admin.onrender.com',
    'https://backend-dinsac-hlf0.onrender.com',
    'https://dinsac-cliente.onrender.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.options('*', cors());

app.use(express.json({ limit: '80mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// Middleware personalizado
app.use((req, res, next) => {
  if (req.headers['content-type'] === 'text/plain' && req.body && typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
      console.error('Failed to parse text/plain as JSON:', e);
    }
  }
  next();
});

// MongoDB Connection
const dbURI = process.env.MONGODB_URI;
mongoose.connect(dbURI, {})
  .then(() => console.log('✅ MongoDB Atlas connected'))
  .catch(err => console.error('❌ MongoDB Atlas connection error:', err));

// =================== SCHEMAS ===================
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' }
});
const User = mongoose.model('User', userSchema);

const userClienteSchema = new mongoose.Schema({
  password: { type: String, required: true },
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  telefono: { type: String },
  direccion: { type: String },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
});
const UserCliente = mongoose.model('UserCliente', userClienteSchema);

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
    enum: ['Normal', 'Oferta'],
    required: true
  },
  videoURL: { type: String, required: false },
  featuresText: { type: String, required: false },
  tagsText: { type: String, required: false },
  destacado: { type: Boolean, default: false }
});
const Product = mongoose.model('Product', productSchema);

const cotizacionSchema = new mongoose.Schema({
  numeroCotizacion: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserCliente', required: false },
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
  fecha: { type: Date, default: Date.now },
  estado: { type: String, default: 'pendiente' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Cotizacion = mongoose.model('Cotizacion', cotizacionSchema);

const ordenSchema = new mongoose.Schema({
  nombre: String,
  email: String,
  productos: [{
    name: String,
    cantidad: Number,
    price: Number
  }],
  total: Number,
  fecha: { type: Date, default: Date.now }
});
const Orden = mongoose.model('Orden', ordenSchema);

const interaccionSchema = new mongoose.Schema({
  usuario: String,
  mensaje: String,
  fecha: Date
});
const Interaccion = mongoose.model('Interaccion', interaccionSchema);

// =================== CREAR ADMIN ===================
async function createAdminUser() {
  const admin = await User.findOne({ username: 'admin' });
  if (!admin) {
    const newAdmin = new User({ username: 'admin', password: 'admin123', role: 'admin' });
    await newAdmin.save();
    console.log('Admin user created');
  } else {
    console.log('Admin user already exists');
  }
}
createAdminUser();

// =================== RUTAS BASE ===================
app.get('/', (req, res) => {
  res.status(200).json({
    message: '✅ API DINSAC corriendo correctamente en Render',
    environment: process.env.NODE_ENV || 'production'
  });
});

// =================== RUTAS DE USUARIOS ===================
app.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: err });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
    res.json({ message: 'Login successful', user });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }
    const newUser = new User({ username, password, role: 'cliente' });
    await newUser.save();
    res.status(201).json({ message: 'Cliente registrado correctamente', user: newUser });
  } catch (err) {
    res.status(500).json({ message: 'Error al registrar cliente', error: err });
  }
});

// =================== RUTAS DE CLIENTES ===================
app.get('/clientes', async (req, res) => {
  try {
    const clientes = await UserCliente.find().select('-password');
    res.json(clientes);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener clientes', error: err.message });
  }
});

app.post('/clientes/register', async (req, res) => {
  try {
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

    const newCliente = new UserCliente({
      password,
      nombre,
      email,
      telefono: telefono || '',
      direccion: direccion || ''
    });

    await newCliente.save();
    console.log('✅ Cliente guardado en BD');

    // ✅ ENVIAR CORREO DE BIENVENIDA
    try {
      const mailOptions = {
        from: `"Distribuidora Industrial S.A.C." <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🎉 ¡Bienvenido a DINSAC!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #007bff;">¡Bienvenido a DINSAC!</h2>
            </div>
            <p>Hola <strong>${nombre}</strong>,</p>
            <p>¡Gracias por registrarte en la plataforma de <strong>Distribuidora Industrial S.A.C.</strong>!</p>
            <p>Ahora puedes explorar nuestros productos y realizar tus compras cuando gustes.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Tu cuenta ha sido creada exitosamente</strong></p>
              <p style="margin: 5px 0;">📧 Email: ${email}</p>
            </div>
            <p>Si tienes dudas, contáctanos al 938716412</p>
            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 5px; margin-top: 20px;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                <strong>Distribuidora Industrial S.A.C.</strong><br>
                AV. CESAR VALLEJO 1005 ARANJUEZ TRUJILLO<br>
                Tel: 938716412
              </p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Correo de bienvenida enviado a:', email);
    } catch (emailError) {
      console.error('⚠️ Error al enviar correo de bienvenida:', emailError.message);
    }

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
      res.status(400).json({ message: 'El email ya está registrado' });
    } else {
      res.status(500).json({ message: 'Error al registrar cliente', error: err.message });
    }
  }
});

app.post('/clientes/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y password son obligatorios' });
    }

    const cliente = await UserCliente.findOne({ email, password });

    if (cliente) {
      const clienteResponse = {
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
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ message: 'Error en el servidor', error: err.message });
  }
});

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

// =================== RUTAS DE PRODUCTOS ===================
app.get('/products', async (req, res) => {
  try {
    const { category, estado } = req.query;
    const query = {};
    if (category) query.category = category;
    if (estado) query.estado = estado;
    const products = await Product.find(query);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching products', error: err });
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching product', error: err });
  }
});

app.post('/products', async (req, res) => {
  try {
    const { codigo, name, description, image, stock, category, estado } = req.body;

    if (!codigo || !name || !description || !image || !stock || !category || !estado) {
      return res.status(400).json({
        message: 'Faltan campos obligatorios',
        receivedData: req.body
      });
    }

    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(400).json({
      message: 'Error creando producto',
      error: err.message
    });
  }
});

app.put('/products/:id', async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedProduct) return res.status(404).json({ message: 'Product not found' });
    res.json(updatedProduct);
  } catch (err) {
    res.status(400).json({ message: 'Error updating product', error: err });
  }
});

app.delete('/products/:id', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting product', error: err });
  }
});

// =================== FAVORITOS ===================
app.post('/favorites', async (req, res) => {
  try {
    const { userId, productId } = req.body;
    if (!userId || !productId) {
      return res.status(400).json({ message: "Faltan userId o productId" });
    }

    const user = await UserCliente.findById(userId);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    if (!user.favorites.includes(productId)) {
      user.favorites.push(productId);
      user.favorites = [...new Set(user.favorites.map(f => f.toString()))];
      await user.save();
    }

    const updatedUser = await UserCliente.findById(userId).populate('favorites');
    res.json({
      message: "Producto agregado a favoritos",
      favorites: updatedUser.favorites
    });
  } catch (err) {
    res.status(500).json({ message: "Error al agregar a favoritos", error: err.message });
  }
});

app.get('/favorites/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await UserCliente.findById(userId).populate('favorites');
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json({
      message: "Favoritos obtenidos correctamente",
      favorites: user.favorites
    });
  } catch (err) {
    res.status(500).json({ message: "Error al obtener favoritos", error: err.message });
  }
});

app.delete('/favorites/:userId/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    const user = await UserCliente.findById(userId);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const before = user.favorites.length;
    user.favorites = user.favorites.filter(fav => fav.toString() !== productId);

    if (before === user.favorites.length) {
      return res.status(404).json({ message: "Producto no estaba en favoritos" });
    }

    await user.save();
    const updatedUser = await UserCliente.findById(userId).populate('favorites');
    res.json({
      message: "Producto eliminado de favoritos",
      favorites: updatedUser.favorites
    });
  } catch (err) {
    res.status(500).json({ message: "Error al eliminar de favoritos", error: err.message });
  }
});

// =================== ÓRDENES ===================
app.post('/ordenes', async (req, res) => {
  try {
    const { nombre, email, productos, total } = req.body;

    const nuevaOrden = new Orden({ nombre, email, productos, total });
    await nuevaOrden.save();

    const resumen = productos
      .map(p => `- ${p.name} (x${p.cantidad}) - S/ ${p.price * p.cantidad}`)
      .join('\n');

    const mensaje = `Hola ${nombre},\n\nGracias por tu compra en DINSAC.\n\nResumen:\n${resumen}\n\nTotal: S/ ${total}\n\nSaludos,\nEquipo DINSAC`;

    await transporter.sendMail({
      from: `"Distribuidora Industrial S.A.C." <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🧾 Confirmación de tu compra en DINSAC',
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
    const ordenes = await Orden.find().sort({ fecha: -1 });
    res.json(ordenes);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener órdenes' });
  }
});

// =================== INTERACCIONES ===================
app.post('/interacciones', async (req, res) => {
  try {
    const nueva = new Interaccion(req.body);
    await nueva.save();
    res.status(201).json({ message: '✅ Interacción guardada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar la interacción' });
  }
});

app.get('/interacciones', async (req, res) => {
  try {
    const interacciones = await Interaccion.find().sort({ fecha: -1 });
    res.json(interacciones);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener interacciones' });
  }
});

// =================== COTIZACIONES ===================
app.post('/cotizaciones', async (req, res) => {
  try {
    console.log('📧 Procesando cotización...');

    const { nombre, dniRuc, email, telefonoMovil, contacto, productos, pdfBase64 } = req.body;

    if (!nombre || !dniRuc || !email || !telefonoMovil || !contacto) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios'
      });
    }

    if (!productos || productos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debes agregar al menos un producto'
      });
    }

    if (!pdfBase64) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió el PDF'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      });
    }

    let numeroCotizacion = req.body.numeroCotizacion;

    if (!numeroCotizacion) {
      const total = await Cotizacion.countDocuments();
      const numero = total + 1;
      numeroCotizacion = `COT-${numero.toString().padStart(8, '0')}`;
    }

    const existente = await Cotizacion.findOne({ numeroCotizacion });
    if (existente) {
      const total = await Cotizacion.countDocuments();
      const numero = total + 1;
      numeroCotizacion = `COT-${numero.toString().padStart(8, '0')}`;
    }

    const nuevaCotizacion = new Cotizacion({
      numeroCotizacion,
      userId: req.body.userId || null,
      nombre: nombre.trim(),
      dniRuc: dniRuc.trim(),
      email: email.trim().toLowerCase(),
      telefonoMovil: telefonoMovil.trim(),
      mensaje: req.body.mensaje?.trim() || '',
      contacto: contacto.trim(),
      productos: productos.map(p => ({
        categoria: p.categoria?.trim() || '',
        equipo: p.equipo?.trim() || '',
        cantidad: parseInt(p.cantidad) || 1,
        precioUnitario: parseFloat(p.precioUnitario) || 0
      })),
      pdfBase64: pdfBase64,
      fecha: new Date(),
      estado: 'pendiente'
    });

    await nuevaCotizacion.save();
    console.log('✅ Cotización guardada en BD:', numeroCotizacion);

    // =================== ENVÍO DE CORREO ===================
    let emailEnviado = false;
    let errorEmail = null;

    try {
      console.log('📧 Preparando correo...');

      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      const emailCliente = email.trim().toLowerCase();
      const emailEmpresa = process.env.EMAIL_OWNER || 'monica.romeroz.2003@gmail.com';

      console.log(`📧 Enviando a: ${emailCliente} y ${emailEmpresa}`);

      const mailOptions = {
        from: `"Distribuidora Industrial S.A.C." <${process.env.EMAIL_USER}>`,
        to: `${emailCliente}, ${emailEmpresa}`,
        subject: `Cotización ${numeroCotizacion} - Distribuidora Industrial S.A.C.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #007bff; text-align: center;">Cotización ${numeroCotizacion}</h2>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Cliente:</strong> ${nombre}</p>
              <p style="margin: 5px 0;"><strong>DNI/RUC:</strong> ${dniRuc}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Teléfono:</strong> ${telefonoMovil}</p>
              <p style="margin: 5px 0;"><strong>Forma de contacto preferida:</strong> ${contacto}</p>
              ${req.body.mensaje ? `<p style="margin: 5px 0;"><strong>Mensaje:</strong> ${req.body.mensaje}</p>` : ''}
            </div>
            <h3>Productos solicitados:</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #007bff; color: white;">
                  <th style="padding: 10px; border: 1px solid #ddd;">Categoría</th>
                  <th style="padding: 10px; border: 1px solid #ddd;">Equipo</th>
                  <th style="padding: 10px; border: 1px solid #ddd;">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                ${productos.map((p, i) => `
                  <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                    <td style="padding: 10px; border: 1px solid #ddd;">${p.categoria}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${p.equipo}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${p.cantidad}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <p style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; color: #856404;">
              📎 <strong>Adjunto:</strong> La cotización completa está en el archivo PDF adjunto.
            </p>
            <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 5px; margin-top: 20px;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                <strong>Distribuidora Industrial S.A.C.</strong><br>
                AV. CESAR VALLEJO 1005 ARANJUEZ TRUJILLO<br>
                Tel: 938716412
              </p>
            </div>
            <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
              Este correo fue generado automáticamente.
            </p>
          </div>
        `,
        attachments: [{
          filename: `Cotizacion_${numeroCotizacion}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }]
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Correo enviado exitosamente:', info.messageId);
      console.log('📧 Enviado a:', mailOptions.to);
      emailEnviado = true;

    } catch (emailError) {
      console.error('⚠️ Error al enviar correo:', emailError.message);
      errorEmail = emailError.message;
    }

    res.status(201).json({ 
      success: true,
      message: `Cotización ${numeroCotizacion} guardada correctamente`,
      numeroCotizacion: numeroCotizacion,
      data: {
        id: nuevaCotizacion._id,
        numeroCotizacion: numeroCotizacion,
        fecha: nuevaCotizacion.fecha,
        estado: nuevaCotizacion.estado
      }
    });

  } catch (error) {
    console.error('❌ Error completo:', error);
    console.error('❌ Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Error al procesar la cotización',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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


// =================== HISTORIAL DE COTIZACIONES ===================

app.get('/cotizaciones', async (req, res) => {
  try {
    const cotizaciones = await Cotizacion.find()
      .sort({ fecha: -1 })
      .lean(); 

    // ✅ Si hay userId, intentar poblar
    const cotizacionesConUsuario = await Promise.all(
      cotizaciones.map(async (cot) => {
        let usuario = null;
        if (cot.userId) {
          try {
            usuario = await mongoose.model('UserCliente').findById(cot.userId).lean();
          } catch (err) {
            console.warn(`⚠️ No se pudo poblar usuario ${cot.userId}`);
          }
        }

        return {
          _id: cot._id,
          numeroCotizacion: cot.numeroCotizacion,
          fecha: cot.fecha,
          estado: cot.estado || 'pendiente',
          nombre: cot.nombre,
          email: cot.email,
          telefonoMovil: cot.telefonoMovil,
          dniRuc: cot.dniRuc,
          dni: cot.dniRuc, // Alias
          contacto: cot.contacto || 'No especificado',
          mensaje: cot.mensaje || '',
          pdfBase64: cot.pdfBase64 || '',
          productos: cot.productos.map(p => ({
            categoria: p.categoria || '',
            equipo: p.equipo || '',
            nombre: p.equipo || 'Sin nombre',
            cantidad: p.cantidad || 1,
            precio: p.precioUnitario || 0
          })),
          // Info del usuario si existe
          usuario: usuario ? {
            nombre: usuario.nombre,
            email: usuario.email
          } : null
        };
      })
    );

    res.json(cotizacionesConUsuario);
  } catch (error) {
    console.error('❌ Error al obtener cotizaciones:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener cotizaciones',
      error: error.message
    });
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
    console.log('📜 Solicitando historial para:', clienteId);
    
    const mensajes = await Chat.find({ clienteId }).sort({ fecha: 1 });
    console.log(`✅ Historial enviado: ${mensajes.length} mensajes`);
    
    res.json(mensajes);
  } catch (error) {
    console.error('❌ Error obteniendo chat:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// 🗑️ Borrar todo el chat de un cliente
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
// ✅ ENDPOINT UPLOAD - SOLUCIÓN DEFINITIVA
app.post('/upload-chat', upload.single('archivo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo' });
  }

  console.log('📤 Archivo subido:', req.file.filename);
  console.log('📝 Nombre original:', req.file.originalname);

  // ✅ CORREGIDO: URL sin doble barra
  const fileUrl = `https://backend-dinsac-hlf0.onrender.com/uploads/${req.file.filename}`;

  console.log('🔗 URL generada:', fileUrl);

  res.json({
    url: fileUrl,
    nombre: req.file.originalname,
    tipo: 'archivo'
  });
});

// =================== SOCKET.IO ===================
io.on('connection', (socket) => {
  console.log("🔵 Usuario conectado:", socket.id);

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
      console.log("💬 Mensaje recibido:", {
        remitente: msg.remitente,
        clienteId: msg.clienteId,
        mensaje: msg.mensaje.substring(0, 50)
      });

      // ✅ Guardar en base de datos
      const mensajeGuardado = await Chat.create({
        remitente: msg.remitente,
        mensaje: msg.mensaje,
        clienteId: msg.clienteId,
        nombre: msg.nombre || (msg.clienteId.startsWith("anon-")
          ? `Cliente ${msg.clienteId.substring(5, 9)}`
          : 'Cliente'),
        fecha: msg.fecha || new Date()
      });

      console.log("💾 Mensaje guardado en BD con ID:", mensajeGuardado._id);

      // ✅ Emitir a los destinatarios correspondientes
      if (msg.remitente === 'cliente') {
        console.log("📤 Enviando mensaje a admins...");
        io.to('admins').emit('mensaje', msg);
      } else if (msg.remitente === 'admin') {
        console.log(`📤 Enviando mensaje al cliente ${msg.clienteId}...`);
        io.to(msg.clienteId).emit('mensaje', msg);
      }

      console.log("✅ Mensaje procesado correctamente");

    } catch (error) {
      console.error("❌ Error guardando mensaje:", error);
    }
  });

  socket.on('disconnect', () => {
    console.log("🔴 Usuario desconectado:", socket.id);
  });
  app.get('/descargar/:archivo', (req, res) => {
  const archivo = req.params.archivo;
  const ruta = path.join(__dirname, 'uploads', archivo);

  console.log('⬇️ Descargando archivo:', archivo);

  res.download(ruta, archivo, (err) => {
    if (err) {
      console.error("❌ Error descargando archivo:", err);
      res.status(500).send("Error descargando archivo");
    }
  });
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



const bannerSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  image: { type: Buffer, required: true },
  contentType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Banner = mongoose.model('Banner', bannerSchema);

// =================== CONFIGURACIÓN MULTER ===================
const storageBanner = multer.memoryStorage();

const uploadBanner = multer({ 
  storage: storageBanner,
  limits: { 
    fileSize: 5 * 1024 * 1024 // Límite de 5MB
  },
  fileFilter: (req, file, cb) => {
    // Validar que sea imagen
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'), false);
    }
  }
});

// =================== ENDPOINT: SUBIR BANNER (POST) ===================
app.post('/banner', uploadBanner.single('image'), async (req, res) => {
  try {
    const { tipo, orden } = req.body;
    
    // Log para debugging
    console.log('📥 Recibido:', { 
      tipo, 
      orden, 
      hasFile: !!req.file,
      fileSize: req.file ? req.file.size : 0,
      mimetype: req.file ? req.file.mimetype : null
    });
    
    // Validaciones
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        mensaje: "No se envió ninguna imagen" 
      });
    }
    
    if (!tipo) {
      return res.status(400).json({ 
        success: false,
        mensaje: "Debes indicar el tipo de banner (principal, ofertasHome, carrusel)" 
      });
    }

    // Validar tipos permitidos
    const tiposPermitidos = ['principal', 'ofertasHome', 'carrusel'];
    if (!tiposPermitidos.includes(tipo)) {
      return res.status(400).json({
        success: false,
        mensaje: `Tipo no válido. Permitidos: ${tiposPermitidos.join(', ')}`
      });
    }

    // Determinar el ID del banner
    let bannerId = tipo;
    
    if (tipo === 'carrusel') {
      if (orden === undefined || orden === null) {
        return res.status(400).json({
          success: false,
          mensaje: "Para carrusel debes enviar el campo 'orden' (0, 1 o 2)"
        });
      }
      
      // Validar que orden sea 0, 1 o 2
      const ordenNum = parseInt(orden);
      if (![0, 1, 2].includes(ordenNum)) {
        return res.status(400).json({
          success: false,
          mensaje: "El orden debe ser 0, 1 o 2"
        });
      }
      
      bannerId = `carrusel_${ordenNum}`;
    }

    // Guardar o actualizar el banner en MongoDB
    const bannerGuardado = await Banner.findOneAndUpdate(
      { _id: bannerId },
      { 
        image: req.file.buffer,
        contentType: req.file.mimetype,
        createdAt: new Date()
      },
      { 
        upsert: true, 
        new: true 
      }
    );

    console.log('✅ Banner guardado exitosamente:', bannerId);
    
    res.status(200).json({ 
      success: true,
      mensaje: `Banner guardado correctamente`,
      data: {
        id: bannerId,
        tipo: tipo,
        orden: tipo === 'carrusel' ? orden : null,
        size: req.file.size,
        contentType: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('❌ Error en POST /banner:', error);
    
    res.status(500).json({ 
      success: false,
      mensaje: "Error interno del servidor",
      error: error.message 
    });
  }
});

// =================== ENDPOINT: OBTENER BANNER (GET) ===================
app.get('/banner', async (req, res) => {
  try {
    const { tipo } = req.query;
    
    console.log('📤 Solicitado banner tipo:', tipo);
    
    // Validación
    if (!tipo) {
      return res.status(400).json({ 
        success: false,
        mensaje: "Debes indicar el tipo de banner (?tipo=principal o ?tipo=carrusel)" 
      });
    }

    // CASO 1: Solicitud de CARRUSEL (devuelve array de imágenes)
    if (tipo === 'carrusel') {
      const banners = await Banner.find({ 
        _id: { $regex: /^carrusel_/ } 
      }).sort({ _id: 1 });

      if (banners.length === 0) {
        return res.status(404).json({ 
          success: false,
          mensaje: "No hay imágenes en el carrusel" 
        });
      }

      const imagenes = banners.map(b => ({
        id: b._id,
        orden: parseInt(b._id.split('_')[1]),
        image: `data:${b.contentType};base64,${b.image.toString('base64')}`,
        contentType: b.contentType
      }));

      console.log(`✅ Devolviendo ${imagenes.length} imágenes del carrusel`);

      return res.status(200).json({ 
        success: true,
        imagenes: imagenes
      });
    }

    // CASO 2: Solicitud de BANNER INDIVIDUAL (principal o ofertasHome)
    const banner = await Banner.findOne({ _id: tipo });

    if (!banner || !banner.image) {
      return res.status(404).json({ 
        success: false,
        mensaje: `No hay banner del tipo '${tipo}'` 
      });
    }

    const base64 = `data:${banner.contentType};base64,${banner.image.toString('base64')}`;
    
    console.log(`✅ Banner '${tipo}' encontrado`);

    res.status(200).json({ 
      success: true,
      image: base64,
      contentType: banner.contentType
    });

  } catch (error) {
    console.error('❌ Error en GET /banner:', error);
    
    res.status(500).json({ 
      success: false,
      mensaje: "Error interno del servidor", 
      error: error.message 
    });
  }
});

// =================== ENDPOINT: ELIMINAR BANNER (DELETE) - OPCIONAL ===================
app.delete('/banner', async (req, res) => {
  try {
    const { tipo, orden } = req.query;
    
    if (!tipo) {
      return res.status(400).json({ 
        success: false,
        mensaje: "Debes indicar el tipo de banner" 
      });
    }

    let bannerId = tipo;
    if (tipo === 'carrusel' && orden !== undefined) {
      bannerId = `carrusel_${orden}`;
    }

    const resultado = await Banner.findByIdAndDelete(bannerId);

    if (!resultado) {
      return res.status(404).json({
        success: false,
        mensaje: `No se encontró el banner '${bannerId}'`
      });
    }

    console.log('🗑️ Banner eliminado:', bannerId);

    res.status(200).json({
      success: true,
      mensaje: `Banner '${bannerId}' eliminado correctamente`
    });

  } catch (error) {
    console.error('❌ Error en DELETE /banner:', error);
    
    res.status(500).json({
      success: false,
      mensaje: "Error interno del servidor",
      error: error.message
    });
  }
});

 

// =================== FIN PRODUCTOS ===================

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`🚀 Servidor con Socket.IO corriendo en https://backend-dinsac-hlf0.onrender.com/${PORT}`);
});





