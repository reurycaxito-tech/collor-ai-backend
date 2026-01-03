require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const { v2: cloudinary } = require('cloudinary');
const OpenAI = require('openai');
const Groq = require('groq-sdk');

const app = express();
app.use(express.json());
app.use(cors());

// ===== CLOUDINARY =====
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ===== IA =====
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// ===== MONGODB =====
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => console.error('❌ Erro MongoDB:', err.message));

// ===== CONFIG =====
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const JWT_SECRET = process.env.JWT_SECRET || 'collor-ai-secret';

// ===== SCHEMAS =====
const UserSchema = new mongoose.Schema({
  nome: String,
  email: { type: String, unique: true },
  senha: String,
  role: { type: String, default: 'PROFISSIONAL' }
});

const ClienteSchema = new mongoose.Schema({
  nome: String,
  telefone: String,
  email: String,
  saldoPontos: { type: Number, default: 0 },
  nivel: { type: Number, default: 1 }
});

const AgendaSchema = new mongoose.Schema({
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
  servicoId: { type: mongoose.Schema.Types.ObjectId },
  dataHora: Date,
  status: String
});

const ProdutoSchema = new mongoose.Schema({
  nome: String,
  quantidade: Number,
  unidade: String,
  alertaBaixoEstoque: Boolean
});

const FinanceiroSchema = new mongoose.Schema({
  tipo: String, // ENTRADA | SAIDA
  valor: Number,
  descricao: String,
  data: { type: Date, default: Date.now }
});

// ===== MODELS =====
const User = mongoose.model('User', UserSchema);
const Cliente = mongoose.model('Cliente', ClienteSchema);
const Agenda = mongoose.model('Agenda', AgendaSchema);
const Produto = mongoose.model('Produto', ProdutoSchema);
const Financeiro = mongoose.model('Financeiro', FinanceiroSchema);

// ===== AUTH MIDDLEWARE =====
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// ===== AUTH =====
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    const hash = await bcrypt.hash(senha, 10);
    const user = await User.create({ nome, email, senha: hash });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: { id: user._id, nome, email, role: user.role },
      token
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(senha, user.senha))) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: { id: user._id, nome: user.nome, email, role: user.role },
      token
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ===== CLIENTES =====
app.get('/api/clientes', authMiddleware, async (req, res) => {
  const clientes = await Cliente.find();
  res.json({ clientes });
});

app.post('/api/clientes', authMiddleware, async (req, res) => {
  const cliente = await Cliente.create(req.body);
  res.json(cliente);
});

// ===== AGENDA =====
app.get('/api/agenda', authMiddleware, async (req, res) => {
  const agenda = await Agenda.find().populate('clienteId');
  res.json(agenda);
});

// ===== PRODUTOS =====
app.get('/api/produtos', authMiddleware, async (req, res) => {
  const produtos = await Produto.find();
  res.json(produtos);
});

// ===== FINANCEIRO =====
app.get('/api/financeiro', authMiddleware, async (req, res) => {
  const financeiro = await Financeiro.find().sort({ data: -1 });
  res.json(financeiro);
});

// ===== DASHBOARD =====
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  const totalClientes = await Cliente.countDocuments();

  const hoje = new Date();
  const inicioDia = new Date(hoje.setHours(0, 0, 0, 0));
  const fimDia = new Date(hoje.setHours(23, 59, 59, 999));

  const agendamentosHoje = await Agenda.countDocuments({
    dataHora: { $gte: inicioDia, $lte: fimDia }
  });

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const lancamentos = await Financeiro.find({ data: { $gte: inicioMes } });

  const faturamentoMes = lancamentos
    .filter(l => l.tipo === 'ENTRADA')
    .reduce((s, l) => s + l.valor, 0);

  const despesasMes = lancamentos
    .filter(l => l.tipo === 'SAIDA')
    .reduce((s, l) => s + l.valor, 0);

  res.json({
    totalClientes,
    agendamentosHoje,
    faturamentoMes,
    lucroMes: faturamentoMes - despesasMes
  });
});

// ===== IA FOTO =====
app.post(
  '/api/ia/analisar-foto',
  authMiddleware,
  upload.single('foto'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Foto não enviada' });
      }

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: 'collor-ai' }, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          })
          .end(req.file.buffer);
      });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analise este cabelo: cor base, % brancos, condição e 3 fórmulas.' },
              { type: 'image_url', image_url: { url: uploadResult.secure_url } }
            ]
          }
        ]
      });

      res.json({
        analise: response.choices[0].message.content,
        imageUrl: uploadResult.secure_url
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
);

// ===== IA CHAT =====
app.post('/api/ia/chat', authMiddleware, async (req, res) => {
  const { pergunta } = req.body;

  const response = await groq.chat.completions.create({
    model: 'llama-3.1-70b-versatile',
    messages: [{ role: 'user', content: pergunta }]
  });

  res.json({ resposta: response.choices[0].message.content });
});

// ===== HEALTH =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'online' });
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎨 Collor.AI na porta ${PORT}`);
});
