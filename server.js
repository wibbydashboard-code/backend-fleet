import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { validateEntidad, getAllContracts, getAllUnits, createUnit, updateUnitStatus, checkActiveContracts, getStats, getPaymentsReport, createContract, getContractsWithData, updateContractPDF, getProviders, createProvider, updateProvider, updateProviderStatus, getProviderStatement, createPayment, getPaymentsByContract, updatePaymentStatus, updatePaymentPDF, getAllPayments } from './repository.js';
import { calculateSaldoInicial, getAbonosReales, generateCargosContratos, generateCargosSeguros, unifyMovimientos, sortMovimientos, calculateFinancials } from './financialService.js';
import { generateExcel } from './excelGenerator.js';

console.log('🚀 Iniciando servidor...');
console.log('📡 DB HOST:', process.env.DB_HOST || 'localhost (por defecto)');
console.log('🗄️  DB NAME:', process.env.DB_NAME || 'fleet_db');

const app = express();
app.use(express.json());

const uploadsDir = path.join(process.cwd(), 'uploads', 'contracts');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const paymentsDir = path.join(process.cwd(), 'uploads', 'payments');
if (!fs.existsSync(paymentsDir)) {
  fs.mkdirSync(paymentsDir, { recursive: true });
}

const staticDir = path.join(process.cwd(), 'uploads');

app.use(
  '/uploads',
  express.static(staticDir)
);

// Serve frontend in production
const distDir = path.join(process.cwd(), 'dist');
app.use(express.static(distDir));

// Handle client-side routing
app.get('/*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(distDir, 'index.html'));
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'contract-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

const paymentsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, paymentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadPayment = multer({
  storage: paymentsStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF o imágenes'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

console.log('>> server.js cargado correctamente');

// Endpoint to generate Estado de Cuenta
app.post('/api/reports/estado-cuenta', async (req, res) => {
  try {
    const { entidad_tipo, entidad_id, periodo_inicio, periodo_fin, filtro_estatus } = req.body;

    // Validations
    if (!['unidad', 'empresa', 'proveedor'].includes(entidad_tipo)) {
      return res.status(400).json({ error: 'entidad_tipo must be unidad, empresa, or proveedor' });
    }
    if (!entidad_id || !periodo_inicio || !periodo_fin) {
      return res.status(400).json({ error: 'entidad_id, periodo_inicio, and periodo_fin are required' });
    }

    // Validate entidad
    await validateEntidad(entidad_tipo, entidad_id);

    // Saldo inicial
    const saldoInicial = calculateSaldoInicial(entidad_tipo, entidad_id, periodo_inicio);

    // Abonos
    const abonos = await getAbonosReales(entidad_tipo, entidad_id, periodo_inicio, periodo_fin);

    // Cargos contratos
    const cargosContratos = await generateCargosContratos(entidad_tipo, entidad_id, periodo_inicio, periodo_fin);

    // Cargos seguros
    const cargosSeguros = await generateCargosSeguros(entidad_tipo, entidad_id, periodo_inicio, periodo_fin);

    // Unify
    const movimientos = unifyMovimientos(abonos, cargosContratos, cargosSeguros);

    // Sort
    const movimientosOrdenados = sortMovimientos(movimientos);

    // Calculate financials
    const financialData = calculateFinancials(movimientosOrdenados, saldoInicial);

    // Generate Excel
    const buffer = await generateExcel(financialData, entidad_tipo, entidad_id, periodo_inicio, periodo_fin, saldoInicial);

    // Response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Estado_Cuenta_${entidad_tipo}_${entidad_id}_${periodo_inicio.replace(/-/g, '')}_${periodo_fin.replace(/-/g, '')}.xlsx`);
    res.send(buffer);
  } catch (error) {
    if (error.message === 'ENTITY_NOT_FOUND') {
      return res.status(400).json({ error: 'Entidad not found' });
    }
    if (error.message === 'DB_INTEGRITY_ERROR') {
      return res.status(500).json({ error: 'Database integrity error' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando /api/stats');
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    const nextExp = await getUpcomingExpirations();
    res.json({ ok: true, stats, nextExp });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando /api/units');
app.get('/api/units', async (req, res) => {
  try {
    const { q, status, company } = req.query;
    const units = await getAllUnits({ q, status, company });
    res.json({ ok: true, data: units });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando POST /api/units');
app.post('/api/units', async (req, res) => {
  try {
    const { economic_number, license_plate, serial_number, type, brand, model, year, assigned_company_id, assigned_provider_id } = req.body;

    if (!economic_number || !license_plate || !serial_number || !type || !brand || !model || !year || !assigned_company_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (year < 2000) {
      return res.status(400).json({ error: 'Year must be >= 2000' });
    }

    const unit = await createUnit({
      economic_number,
      license_plate,
      serial_number,
      type,
      brand,
      model,
      year,
      assigned_company_id,
      assigned_provider_id
    });

    res.status(201).json({ ok: true, data: unit });
  } catch (error) {
    console.error(error);
    if (error.message === 'DUPLICATE_ECONOMIC_NUMBER') {
      return res.status(400).json({ error: 'Economic number already exists' });
    }
    if (error.message === 'DUPLICATE_LICENSE_PLATE') {
      return res.status(400).json({ error: 'License plate already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando PUT /api/units/:id/status');
app.put('/api/units/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Activo', 'Baja'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (status === 'Baja') {
      const activeContracts = await checkActiveContracts(id);
      if (activeContracts.length > 0) {
        return res.status(400).json({
          error: 'UNIT_HAS_ACTIVE_CONTRACTS',
          contracts: activeContracts
        });
      }
    }

    const unit = await updateUnitStatus(id, status);
    res.json({ ok: true, data: unit });
  } catch (error) {
    console.error(error);
    if (error.message === 'UNIT_NOT_FOUND') {
      return res.status(404).json({ error: 'Unit not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function getUpcomingExpirations() {
  const mysql = await import('mysql2/promise');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fleet_db'
  });

  const query = `
    SELECT
      'Renta' AS type,
      u.economic_number AS unitName,
      c.contract_number AS reference,
      DATEDIFF(c.end_date, CURDATE()) AS days_left
    FROM contracts c
    JOIN units u ON c.unit_id = u.id
    WHERE c.end_date >= CURDATE() AND c.is_active = 1
    ORDER BY c.end_date ASC
    LIMIT 10
  `;

  const [rows] = await conn.execute(query);
  await conn.end();
  return rows.map(r => ({
    type: r.type,
    unit: r.unitName,
    contract_number: r.reference,
    days_left: r.days_left
  }));
}

console.log('>> registrando GET /api/contracts');
app.get('/api/contracts', async (req, res) => {
  try {
    const { unit_id, company_id } = req.query;
    const contracts = await getAllContracts({ unit_id, company_id });
    res.json({ ok: true, data: contracts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando GET /api/payments/report');
app.get('/api/payments/report', async (req, res) => {
  try {
    const { from, to, company, provider_id } = req.query;
    const payments = await getPaymentsReport({ from, to, company, provider_id: provider_id ? parseInt(provider_id) : undefined });
    res.json({ ok: true, data: payments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando GET /api/contracts/complete');
app.get('/api/contracts/complete', async (req, res) => {
  try {
    const { unit_id, company_id } = req.query;
    const contracts = await getContractsWithData({ unit_id, company_id });
    res.json({ ok: true, data: contracts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando POST /api/contracts');
app.post('/api/contracts', async (req, res) => {
  try {
    const { contract_number, provider_id, unit_id, contracting_company_id, start_date, end_date, term_months, monthly_rent } = req.body;

    if (!contract_number || !provider_id || !unit_id || !contracting_company_id || !start_date || !end_date || !term_months || !monthly_rent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (startDate >= endDate) {
      return res.status(400).json({ error: 'start_date must be before end_date' });
    }

    if (term_months < 1) {
      return res.status(400).json({ error: 'term_months must be at least 1' });
    }

    if (monthly_rent < 0) {
      return res.status(400).json({ error: 'monthly_rent must be positive' });
    }

    const contract = await createContract({
      contract_number,
      provider_id,
      unit_id,
      contracting_company_id,
      start_date,
      end_date,
      term_months,
      monthly_rent
    });

    res.status(201).json({ ok: true, data: contract });
  } catch (error) {
    console.error(error);
    if (error.message === 'DUPLICATE_CONTRACT_NUMBER') {
      return res.status(400).json({ error: 'Contract number already exists' });
    }
    if (error.message === 'INVALID_FOREIGN_KEY') {
      return res.status(400).json({ error: 'Invalid unit, provider, or company reference' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando GET /api/providers');
app.get('/api/providers', async (req, res) => {
  try {
    const providers = await getProviders();
    res.json({ ok: true, data: providers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando POST /api/providers');
app.post('/api/providers', async (req, res) => {
  try {
    const { name, type, rfc, contact_name, contact_email, contact_phone } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['arrendador', 'aseguradora'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be arrendador or aseguradora' });
    }

    const provider = await createProvider({
      name,
      type,
      rfc,
      contact_name,
      contact_email,
      contact_phone
    });

    res.status(201).json({ ok: true, data: provider });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando PUT /api/providers/:id');
app.put('/api/providers/:id', async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    const { name, rfc, contact_name, contact_email, contact_phone } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing required field: name' });
    }

    const provider = await updateProvider(providerId, {
      name,
      rfc,
      contact_name,
      contact_email,
      contact_phone
    });

    res.json({ ok: true, data: provider });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando PUT /api/providers/:id/status');
app.put('/api/providers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Activo', 'Inactivo'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const provider = await updateProviderStatus(id, status);
    res.json({ ok: true, data: provider });
  } catch (error) {
    console.error(error);
    if (error.message === 'PROVIDER_NOT_FOUND') {
      return res.status(404).json({ error: 'Provider not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando GET /api/providers/:id/statement');
app.get('/api/providers/:id/statement', async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    const statement = await getProviderStatement(providerId);
    res.json({ ok: true, data: statement });
  } catch (error) {
    console.error(error);
    if (error.message === 'PROVIDER_NOT_FOUND') {
      return res.status(404).json({ error: 'Provider not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando POST /api/contracts/:id/upload');
app.post('/api/contracts/:id/upload', upload.single('pdf'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    const pdfPath = 'uploads/contracts/' + req.file.filename;
    const result = await updateContractPDF(id, pdfPath);

    res.json({ ok: true, data: result });
  } catch (error) {
    console.error(error);
    if (error.message === 'CONTRACT_NOT_FOUND') {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando POST /api/payments');
app.post('/api/payments', async (req, res) => {
  try {
    const { contract_id, payment_date, due_date, amount, payment_method, status } = req.body;

    if (!contract_id || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const payment = await createPayment({
      contract_id,
      payment_date,
      due_date,
      amount,
      payment_method,
      status
    });

    res.status(201).json({ ok: true, data: payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando GET /api/payments');
app.get('/api/payments', async (req, res) => {
  try {
    const { contract_id, status } = req.query;
    const payments = await getAllPayments({ contract_id, status });
    res.json({ ok: true, data: payments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando GET /api/payments/by-contract/:id');
app.get('/api/payments/by-contract/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payments = await getPaymentsByContract(id);
    res.json({ ok: true, data: payments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando PUT /api/payments/:id/status');
app.put('/api/payments/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Pagado', 'Pendiente', 'Vencido'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const payment = await updatePaymentStatus(id, status);
    res.json({ ok: true, data: payment });
  } catch (error) {
    console.error(error);
    if (error.message === 'PAYMENT_NOT_FOUND') {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando POST /api/payments/:id/upload');
app.post('/api/payments/:id/upload', uploadPayment.single('pdf'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const pdfPath = 'uploads/payments/' + req.file.filename;
    const result = await updatePaymentPDF(id, pdfPath);

    res.json({ ok: true, data: result });
  } catch (error) {
    console.error(error);
    if (error.message === 'PAYMENT_NOT_FOUND') {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> ejecutando app.listen');
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});