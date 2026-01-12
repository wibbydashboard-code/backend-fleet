import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { validateEntidad, getAllContracts, getAllUnits, createUnit, updateUnitStatus, checkActiveContracts, getStats, getPaymentsReport, createContract, getContractsWithData, updateContractPDF, getProviders, createProvider, updateProvider, updateProviderStatus, getProviderStatement, createPayment, getPaymentsByContract, updatePaymentStatus, updatePaymentPDF, getAllPayments, getCompanies, createCompany, updateCompany, updateCompanyStatus, deleteCompany, fixCompaniesSchema, getAllTenants, getTenantById, createTenant, updateTenant, updateTenantStatus, getTenantMetrics, getAllUsers, getUserById, getUserByEmail, createUser, updateUser, updateUserStatus, updateLastLogin } from './repository.js';
import { auditLogger } from './auditLogger.js';
import { generateUnitTemplate, processBatchUpload } from './bulkUploadService.js';
import { calculateSaldoInicial, getAbonosReales, generateCargosContratos, generateCargosSeguros, unifyMovimientos, sortMovimientos, calculateFinancials } from './financialService.js';
import { generateExcel } from './excelGenerator.js';
import helmet from 'helmet';
import { apiRateLimit, batchUploadRateLimit } from './rateLimiter.js';
import logger from './logger.js';
import { errorHandler } from './errorHandler.js';
import { RoleUtils } from './roleUtils.js';
import { resolveTenant } from './resolveTenant.js';
import { requireAuth } from './requireAuth.js';
import { requireRole } from './requireRole.js';
import { hashPassword, comparePasswords, generateToken } from './authService.js';

logger.info('🚀 Iniciando servidor...');
logger.info('📡 DB HOST:', process.env.DB_HOST || 'localhost (por defecto)');
logger.info('🗄️  DB NAME:', process.env.DB_NAME || 'fleet_db');

const app = express();
app.use(helmet());
app.use('/api', apiRateLimit);
app.use(express.json());

const uploadsDir = path.join(process.cwd(), 'uploads', 'contracts');
const tempDir = path.join(process.cwd(), 'uploads', 'temp'); // Directorio temporal para excels

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });


const paymentsDir = path.join(process.cwd(), 'uploads', 'payments');
if (!fs.existsSync(paymentsDir)) {
  fs.mkdirSync(paymentsDir, { recursive: true });
}

const staticDir = path.join(process.cwd(), 'uploads');

app.use(
  '/uploads',
  express.static(staticDir)
);

// Servir archivos estáticos del Frontend - ELIMINADO para Render
// El frontend vive en Hostinger. Este servidor es solo API.

// Ruta raíz para health check
app.get('/', (req, res) => {
  res.send('🚀 Fleet Management Backend API is running!');
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
  const allowedOrigins = ['https://fleet.mentoresestrategicos.com'];
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware global de resolución de tenant (NO BLOQUEANTE)
app.use(resolveTenant);

const requireAdmin = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  try {
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const validateTenantFromJWT = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      req.user = req.user || {};
      req.user.tenantId = decoded.tenantId;
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  next();
};

logger.info('>> server.js cargado correctamente');

// --- CARGA MASIVA CONFIG ---
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, tempDir); },
  filename: (req, file, cb) => { cb(null, 'batch-' + Date.now() + path.extname(file.originalname)); }
});
const uploadExcel = multer({
  storage: tempStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes('sheet') || file.mimetype.includes('excel') || path.extname(file.originalname) === '.xlsx') {
      cb(null, true);
    } else {
      cb(new Error('Solo archivos Excel (.xlsx)'));
    }
  }
});

// Rutas de Carga Masiva
app.get('/api/units/template', async (req, res) => {
  try {
    const workbook = await generateUnitTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Plantilla_Carga_Unidades.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error('Error generando plantilla:', error);
    res.status(500).json({ error: 'Error generando plantilla' });
  }
});

app.use('/api/units/batch-upload', batchUploadRateLimit);
app.post('/api/units/batch-upload', uploadExcel.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

  try {
    const tenantId = req.tenantId || 1; // Default to 1 if not set
    const results = await processBatchUpload(req.file.path, tenantId);
    // Limpiar archivo temporal
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.json(results);
  } catch (error) {
    logger.error('Error procesando batch:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});
// ---------------------------

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
app.get('/api/stats', resolveTenant, requireAuth, async (req, res) => {
  try {
    // Tomar tenantId del middleware resolveTenant (JWT)
    const tenantId = req.tenantId;

    const stats = await getStats(tenantId);
    const nextExp = await getUpcomingExpirations(tenantId);
    res.json({ ok: true, stats, nextExp });
  } catch (error) {
    console.error('Error en /api/stats:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

console.log('>> registrando /api/units');
app.get('/api/units', resolveTenant, requireAuth, requireRole('admin', 'user', 'viewer'), async (req, res) => {
  try {
    const { q, status, company } = req.query;

    // PRIORIDAD 1: tenantId desde middleware resolveTenant (JWT)
    let tenantId = req.tenantId;

    // PRIORIDAD 2: query param tenantId (fallback)
    if (!tenantId && req.query.tenantId) {
      tenantId = parseInt(req.query.tenantId);
    }

    // PRIORIDAD 3: header x-tenant-id (fallback)
    if (!tenantId && req.headers['x-tenant-id']) {
      tenantId = parseInt(req.headers['x-tenant-id']);
    }

    const filters = { q, status, company };
    if (tenantId) {
      filters.tenantId = tenantId;
    }

    const units = await getAllUnits(filters);

    // Logging en audit_logs
    const logMetadata = {
      endpoint: 'GET /api/units',
      tenantId: tenantId,
      tenantSource: req.tenantSource || 'query_param',
      result: units.length > 0 ? 'OK' : 'empty',
      units_count: units.length
    };

    if (tenantId) {
      await auditLogger.log({
        userId: req.user?.userId || null,
        tenantId,
        action: 'access_units',
        entity: 'unit',
        metadata: logMetadata,
        req
      });
    }

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

    await auditLogger.log({
      userId: null,
      action: 'create',
      entity: 'unit',
      entityId: unit.id,
      metadata: {
        economic_number,
        license_plate,
        type,
        brand,
        model,
        year
      },
      req
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

    await auditLogger.log({
      userId: null,
      action: 'update_status',
      entity: 'unit',
      entityId: id,
      metadata: { status },
      req
    });

    res.json({ ok: true, data: unit });
  } catch (error) {
    console.error(error);
    if (error.message === 'UNIT_NOT_FOUND') {
      return res.status(404).json({ error: 'Unit not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function getUpcomingExpirations(tenantId = null) {
  const mysql = await import('mysql2/promise');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fleet_db',
    ssl: (process.env.DB_HOST && process.env.DB_HOST !== 'localhost')
      ? { rejectUnauthorized: false }
      : false
  });

  let query = `
    SELECT
      'Renta' AS type,
      u.economic_number AS unitName,
      c.contract_number AS reference,
      DATEDIFF(c.end_date, CURDATE()) AS days_left
    FROM contracts c
    JOIN units u ON c.unit_id = u.id
    WHERE c.end_date >= CURDATE() AND c.is_active = 1
  `;

  const { query: finalQuery, params: finalParams } = applyTenantFilter(query, [], tenantId, 'c');
  const sortedQuery = `${finalQuery} ORDER BY c.end_date ASC LIMIT 10`;

  const [rows] = await conn.execute(sortedQuery, finalParams);
  await conn.end();
  return rows.map(r => ({
    type: r.type,
    unit: r.unitName,
    contract_number: r.reference,
    days_left: r.days_left
  }));
}

console.log('>> registrando GET /api/contracts');
app.get('/api/contracts', resolveTenant, requireAuth, requireRole('admin', 'user', 'viewer'), async (req, res) => {
  try {
    const { unit_id, company_id } = req.query;

    // PRIORIDAD 1: tenantId desde middleware resolveTenant (JWT)
    let tenantId = req.tenantId;

    // PRIORIDAD 2: query param tenantId (fallback)
    if (!tenantId && req.query.tenantId) {
      tenantId = parseInt(req.query.tenantId);
    }

    // PRIORIDAD 3: header x-tenant-id (fallback)
    if (!tenantId && req.headers['x-tenant-id']) {
      tenantId = parseInt(req.headers['x-tenant-id']);
    }

    const filters = { unit_id, company_id };
    if (tenantId) {
      filters.tenantId = tenantId;
    }

    const contracts = await getAllContracts(filters);

    // Logging en audit_logs
    const logMetadata = {
      endpoint: 'GET /api/contracts',
      tenantId: tenantId,
      tenantSource: req.tenantSource || 'query_param',
      result: contracts.length > 0 ? 'OK' : 'empty',
      contracts_count: contracts.length
    };

    if (tenantId) {
      await auditLogger.log({
        userId: req.user?.userId || null,
        tenantId,
        action: 'access_contracts',
        entity: 'contract',
        metadata: logMetadata,
        req
      });
    }

    res.json({ ok: true, data: contracts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando GET /api/payments/report');
app.get('/api/payments/report', resolveTenant, requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { from, to, company, provider_id } = req.query;
    const payments = await getPaymentsReport({
      from,
      to,
      company,
      provider_id: provider_id ? parseInt(provider_id) : undefined,
      tenantId
    });
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
app.post('/api/contracts', resolveTenant, requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId;
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
      monthly_rent,
      tenantId
    });

    await auditLogger.log({
      userId: req.user?.userId || null,
      tenantId,
      action: 'create',
      entity: 'contract',
      entityId: contract.id,
      metadata: {
        contract_number,
        provider_id,
        unit_id,
        contracting_company_id,
        start_date,
        end_date,
        term_months,
        monthly_rent
      },
      req
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

    await auditLogger.log({
      userId: null,
      action: 'create',
      entity: 'provider',
      entityId: provider.id,
      metadata: {
        name,
        type,
        rfc,
        contact_name
      },
      req
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

    await auditLogger.log({
      userId: null,
      action: 'update',
      entity: 'provider',
      entityId: providerId,
      metadata: {
        name,
        rfc,
        contact_name,
        contact_email,
        contact_phone
      },
      req
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

    await auditLogger.log({
      userId: null,
      action: 'update_status',
      entity: 'provider',
      entityId: id,
      metadata: { status },
      req
    });

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

    await auditLogger.log({
      userId: null,
      action: 'upload_pdf',
      entity: 'contract',
      entityId: id,
      metadata: { pdfPath },
      req
    });

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

    await auditLogger.log({
      userId: null,
      action: 'create',
      entity: 'payment',
      entityId: payment.id,
      metadata: {
        contract_id,
        amount,
        status,
        payment_date
      },
      req
    });

    res.status(201).json({ ok: true, data: payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando GET /api/payments');
app.get('/api/payments', resolveTenant, requireAuth, requireRole('admin', 'user', 'viewer'), async (req, res) => {
  try {
    const { contract_id, status } = req.query;

    // PRIORIDAD 1: tenantId desde middleware resolveTenant (JWT)
    let tenantId = req.tenantId;

    // PRIORIDAD 2: query param tenantId (fallback)
    if (!tenantId && req.query.tenantId) {
      tenantId = parseInt(req.query.tenantId);
    }

    // PRIORIDAD 3: header x-tenant-id (fallback)
    if (!tenantId && req.headers['x-tenant-id']) {
      tenantId = parseInt(req.headers['x-tenant-id']);
    }

    const filters = { contract_id, status };
    if (tenantId) {
      filters.tenantId = tenantId;
    }

    const payments = await getAllPayments(filters);

    // Logging en audit_logs
    const logMetadata = {
      endpoint: 'GET /api/payments',
      tenantId: tenantId,
      tenantSource: req.tenantSource || 'query_param',
      result: payments.length > 0 ? 'OK' : 'empty',
      payments_count: payments.length
    };

    if (tenantId) {
      await auditLogger.log({
        userId: req.user?.userId || null,
        tenantId,
        action: 'access_payments',
        entity: 'payment',
        metadata: logMetadata,
        req
      });
    }

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

    await auditLogger.log({
      userId: null,
      action: 'update_status',
      entity: 'payment',
      entityId: id,
      metadata: { status },
      req
    });

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

    await auditLogger.log({
      userId: null,
      action: 'upload_pdf',
      entity: 'payment',
      entityId: id,
      metadata: { pdfPath },
      req
    });

    res.json({ ok: true, data: result });
  } catch (error) {
    console.error(error);
    if (error.message === 'PAYMENT_NOT_FOUND') {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- COMPANIES ROUTES ---

console.log('>> registrando GET /api/companies');
app.get('/api/companies', async (req, res) => {
  try {
    const companies = await getCompanies();
    res.json({ ok: true, data: companies });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando POST /api/companies');
app.post('/api/companies', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const company = await createCompany(name);

    await auditLogger.log({
      userId: null,
      action: 'create',
      entity: 'company',
      entityId: company.id,
      metadata: { name },
      req
    });

    res.status(201).json({ ok: true, data: company });
  } catch (error) {
    console.error(error);
    if (error.message === 'DUPLICATE_COMPANY_NAME') {
      return res.status(409).json({
        error: 'EMPRESA_DUPLICADA',
        message: 'Ya existe una empresa con ese nombre'
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando PUT /api/companies/:id');
app.put('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const company = await updateCompany(id, name);

    await auditLogger.log({
      userId: null,
      action: 'update',
      entity: 'company',
      entityId: id,
      metadata: { name },
      req
    });

    res.json({ ok: true, data: company });
  } catch (error) {
    console.error(error);
    if (error.message === 'COMPANY_NOT_FOUND') return res.status(404).json({ error: 'Company not found' });
    if (error.message === 'DUPLICATE_COMPANY_NAME') {
      return res.status(409).json({
        error: 'EMPRESA_DUPLICADA',
        message: 'Ya existe una empresa con ese nombre'
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando PUT /api/companies/:id/status');
app.put('/api/companies/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    const company = await updateCompanyStatus(id, status);

    await auditLogger.log({
      userId: null,
      action: 'update_status',
      entity: 'company',
      entityId: id,
      metadata: { status },
      req
    });

    res.json({ ok: true, data: company });
  } catch (error) {
    console.error(error);
    if (error.message === 'COMPANY_NOT_FOUND') return res.status(404).json({ error: 'Company not found' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando DELETE /api/companies/:id');
app.delete('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteCompany(id);

    await auditLogger.log({
      userId: null,
      action: 'delete',
      entity: 'company',
      entityId: id,
      req
    });

    res.json({ ok: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error(error);
    if (error.message === 'COMPANY_HAS_UNITS') return res.status(400).json({ error: 'Cannot delete: Company has assigned units' });
    if (error.message === 'COMPANY_NOT_FOUND') return res.status(404).json({ error: 'Company not found' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint temporal para corregir la DB
app.get('/api/fix-db', async (req, res) => {
  try {
    const result = await fixCompaniesSchema();
    res.json({ ok: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fixing DB', details: error.message });
  }
});

// NUEVOS ENDPOINTS DE AUTH (INDEPENDIENTES, NO PROTEGEN NADA AÚN)

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // PRIORIDAD 1: Autenticar contra tabla users (REAL)
    let user = null;
    try {
      user = await getUserByEmail(email);
    } catch (error) {
      console.warn('Error fetching user from DB:', error.message);
    }

    // PRIORIDAD 2: Hardcode fallback (TEMPORAL)
    let authMethod = 'database';

    if (!user) {
      if (email === 'admin@pcas.com' && password === 'Admin123!') {
        user = {
          id: 1,
          email: 'admin@pcas.com',
          name: 'Admin User',
          role: 'admin',
          tenant_id: 1,
          status: 'active'
        };
        authMethod = 'hardcode_fallback';
        console.warn('Using hardcode fallback for admin login (TEMPORAL)');
      }
    }

    // Si no hay usuario (ni en BD ni hardcode), fallar
    if (!user) {
      await auditLogger.log({
        userId: null,
        tenantId: null,
        action: 'login_failed',
        entity: 'auth',
        metadata: { email, reason: 'user_not_found' },
        req
      });

      logger.warn({
        type: 'auth_login_failed',
        email,
        reason: 'user_not_found'
      });

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verificar si el usuario está activo
    if (user.status !== 'active') {
      await auditLogger.log({
        userId: user.id,
        tenantId: user.tenant_id,
        action: 'login_failed',
        entity: 'auth',
        metadata: { email, reason: 'user_not_active', status: user.status },
        req
      });

      logger.warn({
        type: 'auth_login_failed',
        email,
        reason: 'user_not_active',
        status: user.status
      });

      return res.status(403).json({ error: 'Account is not active' });
    }

    // Verificar password (si es usuario de BD)
    if (authMethod === 'database') {
      const isPasswordValid = await comparePasswords(password, user.password_hash);
      if (!isPasswordValid) {
        await auditLogger.log({
          userId: user.id,
          tenantId: user.tenant_id,
          action: 'login_failed',
          entity: 'auth',
          metadata: { email, reason: 'invalid_password' },
          req
        });

        logger.warn({
          type: 'auth_login_failed',
          email,
          reason: 'invalid_password'
        });

        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    // Generar token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id
    });

    // Actualizar last_login
    if (authMethod === 'database') {
      try {
        await updateLastLogin(user.id);
      } catch (error) {
        console.warn('Error updating last_login:', error.message);
      }
    }

    // Log de login exitoso
    await auditLogger.log({
      userId: user.id,
      tenantId: user.tenant_id,
      action: 'login',
      entity: 'auth',
      metadata: {
        email: user.email,
        role: user.role,
        auth_method: authMethod
      },
      req
    });

    logger.info({
      type: 'auth_login_success',
      userId: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      role: user.role,
      auth_method: authMethod
    });

    res.json({
      ok: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenant_id
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// --- TENANT ADMIN ENDPOINTS (Admin Only) ---

console.log('>> registrando GET /api/admin/tenants');
app.get('/api/admin/tenants', requireAdmin, async (req, res) => {
  try {
    const { status, slug } = req.query;
    const tenants = await getAllTenants({ status, slug });

    await auditLogger.log({
      userId: req.user.userId,
      tenantId: req.user.tenantId,
      action: 'list_tenants',
      entity: 'tenant',
      req
    });

    res.json({ ok: true, data: tenants });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando POST /api/admin/tenants');
app.post('/api/admin/tenants', requireAdmin, async (req, res) => {
  try {
    const { name, slug, settings } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    const tenant = await createTenant({ name, slug, settings });

    await auditLogger.log({
      userId: req.user.userId,
      tenantId: req.user.tenantId,
      action: 'create_tenant',
      entity: 'tenant',
      entityId: tenant.id,
      metadata: { name, slug },
      req
    });

    res.status(201).json({ ok: true, data: tenant });
  } catch (error) {
    console.error(error);
    if (error.message === 'DUPLICATE_SLUG') {
      return res.status(400).json({ error: 'Slug already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando GET /api/admin/tenants/:id/metrics');
app.get('/api/admin/tenants/:id/metrics', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const metrics = await getTenantMetrics(id);

    res.json({ ok: true, data: metrics });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando PATCH /api/admin/tenants/:id');
app.patch('/api/admin/tenants/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, status } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    let result;

    if (status) {
      if (!['active', 'suspended', 'deleted'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      result = await updateTenantStatus(id, status);

      await auditLogger.log({
        userId: req.user.userId,
        tenantId: req.user.tenantId,
        action: status === 'deleted' ? 'delete_tenant' : 'update_tenant_status',
        entity: 'tenant',
        entityId: id,
        metadata: { status },
        req
      });
    } else {
      result = await updateTenant(id, { name, slug, settings: req.body.settings });

      await auditLogger.log({
        userId: req.user.userId,
        tenantId: req.user.tenantId,
        action: 'update_tenant',
        entity: 'tenant',
        entityId: id,
        metadata: { name, slug },
        req
      });
    }

    res.json({ ok: true, data: result });
  } catch (error) {
    console.error(error);
    if (error.message === 'TENANT_NOT_FOUND') {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    if (error.message === 'DUPLICATE_SLUG') {
      return res.status(400).json({ error: 'Slug already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando GET /api/admin/users');
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { tenantId, status, role } = req.query;
    const filters = {};
    if (tenantId) filters.tenantId = parseInt(tenantId);
    if (status) filters.status = status;
    if (role) filters.role = role;
    const users = await getAllUsers(filters);

    await auditLogger.log({
      userId: req.user.userId,
      tenantId: req.user.tenantId,
      action: 'list_users',
      entity: 'user',
      req
    });

    res.json({ ok: true, data: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando POST /api/admin/users');
app.post('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role, tenant_id } = req.body;

    if (!email || !password || !name || !tenant_id) {
      return res.status(400).json({ error: 'Email, password, name, and tenant_id are required' });
    }

    const { hashPassword } = await import('./authService.js');
    const password_hash = await hashPassword(password);

    const user = await createUser({
      email,
      password_hash,
      name,
      role: role || 'user',
      tenant_id
    });

    await auditLogger.log({
      userId: req.user.userId,
      tenantId: req.user.tenantId,
      action: 'create_user',
      entity: 'user',
      entityId: user.id,
      metadata: { email, name, role: user.role, tenant_id },
      req
    });

    res.status(201).json({ ok: true, data: user });
  } catch (error) {
    console.error(error);
    if (error.message === 'DUPLICATE_EMAIL') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando PATCH /api/admin/users/:id');
app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, status, password } = req.body;

    let updateData = { name, role };

    if (status) {
      if (!['active', 'suspended', 'deleted'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      const result = await updateUserStatus(id, status);

      await auditLogger.log({
        userId: req.user.userId,
        tenantId: req.user.tenantId,
        action: status === 'deleted' ? 'delete_user' : 'update_user_status',
        entity: 'user',
        entityId: id,
        metadata: { status },
        req
      });

      return res.json({ ok: true, data: result });
    }

    if (password) {
      const { hashPassword } = await import('./authService.js');
      updateData.password_hash = await hashPassword(password);
    }

    const result = await updateUser(id, updateData);

    await auditLogger.log({
      userId: req.user.userId,
      tenantId: req.user.tenantId,
      action: 'update_user',
      entity: 'user',
      entityId: id,
      metadata: { name, role },
      req
    });

    res.json({ ok: true, data: result });
  } catch (error) {
    console.error(error);
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (error.message === 'DUPLICATE_EMAIL') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

console.log('>> registrando GET /api/audit-logs');
app.get('/api/audit-logs', resolveTenant, requireAuth, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { entity, action, limit, offset } = req.query;

    const logs = await auditLogger.getLogs({
      tenantId,
      entity,
      action,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });

    res.json({ ok: true, data: logs });
  } catch (error) {
    console.error('Error en /api/audit-logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use(errorHandler);

console.log('>> ejecutando app.listen');
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});