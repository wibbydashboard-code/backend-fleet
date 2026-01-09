import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fleet_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000,
  ssl: (process.env.DB_HOST && process.env.DB_HOST !== 'localhost')
    ? { rejectUnauthorized: false }
    : false
};

const pool = mysql.createPool(dbConfig);

async function getConnection() {
  return pool;
}

export async function validateEntidad(entidad_tipo, entidad_id) {
  const conn = await getConnection();
  let query;
  let params = [entidad_id];

  switch (entidad_tipo) {
    case 'unidad':
      query = 'SELECT id FROM units WHERE id = ?';
      break;
    case 'empresa':
      query = 'SELECT id FROM companies WHERE id = ?';
      break;
    case 'proveedor':
      query = 'SELECT id FROM providers WHERE id = ?';
      break;
    default:
      throw new Error('INVALID_ENTITY_TYPE');
  }

  const [rows] = await conn.execute(query, params);
  if (rows.length === 0) {
    throw new Error('ENTITY_NOT_FOUND');
  }
  return true;
}

export async function getAbonos(entidad_tipo, entidad_id, periodo_inicio, periodo_fin) {
  const conn = await getConnection();
  let query = `
    SELECT
      p.id,
      p.contract_id,
      p.insurance_policy_id,
      p.payment_date AS fecha,
      CONCAT(c.contract_number, ' - ', p.period) AS referencia,
      CONCAT('Pago de ', COALESCE(p.type, 'rent'), ' ', p.period) AS descripcion,
      'Abono' AS tipo_movimiento,
      CAST(p.amount AS DECIMAL(10,2)) AS monto,
      p.status AS estatus,
      0 AS dias_atraso,
      p.due_date
    FROM payments p
    LEFT JOIN contracts c ON p.contract_id = c.id
    LEFT JOIN units u ON c.unit_id = u.id
    LEFT JOIN companies co ON u.assigned_company_id = co.id
    LEFT JOIN providers pr ON c.provider_id = pr.id
    WHERE p.payment_date BETWEEN ? AND ?
  `;
  let params = [periodo_inicio, periodo_fin];

  switch (entidad_tipo) {
    case 'unidad':
      query += ' AND u.id = ?';
      params.push(entidad_id);
      break;
    case 'empresa':
      query += ' AND co.id = ?';
      params.push(entidad_id);
      break;
    case 'proveedor':
      query += ' AND pr.id = ?';
      params.push(entidad_id);
      break;
  }

  query += ' ORDER BY p.payment_date ASC, p.id ASC';

  try {
    const [rows] = await conn.execute(query, params);
    return rows;
  } catch (error) {
    console.error('GET ABONOS ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function getAllUnits(filters = {}) {
  const conn = await getConnection();
  let query = `
    SELECT
      u.id,
      u.economic_number,
      u.license_plate,
      u.serial_number,
      u.type,
      u.brand,
      u.model,
      u.year,
      u.assigned_company_id,
      u.assigned_provider_id,
      u.status,
      co.name AS company_name
    FROM units u
    LEFT JOIN companies co ON u.assigned_company_id = co.id
    WHERE 1=1
  `;
  let params = [];

  if (filters.q) {
    query += ` AND (u.economic_number LIKE ? OR u.license_plate LIKE ? OR u.serial_number LIKE ?)`;
    const term = `%${filters.q}%`;
    params.push(term, term, term);
  }

  if (filters.status) {
    query += ` AND u.status = ?`;
    params.push(filters.status);
  }

  if (filters.company) {
    query += ` AND co.name = ?`;
    params.push(filters.company);
  }

  query += ` ORDER BY u.economic_number ASC`;

  try {
    const [rows] = await conn.execute(query, params);
    return rows;
  } catch (error) {
    console.error('GET ALL UNITS ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function createUnit(unitData) {
  const conn = await getConnection();
  const query = `
    INSERT INTO units (
      economic_number,
      license_plate,
      serial_number,
      type,
      brand,
      model,
      year,
      assigned_company_id,
      assigned_provider_id,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Activo')
  `;
  const params = [
    unitData.economic_number,
    unitData.license_plate,
    unitData.serial_number,
    unitData.type,
    unitData.brand,
    unitData.model,
    unitData.year,
    unitData.assigned_company_id,
    unitData.assigned_provider_id || null
  ];

  try {
    const [result] = await conn.execute(query, params);
    return { id: result.insertId, ...unitData, status: 'Activo' };
  } catch (error) {
    console.error('CREATE UNIT ERROR:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('economic_number')) {
        throw new Error('DUPLICATE_ECONOMIC_NUMBER');
      }
      if (error.message.includes('license_plate')) {
        throw new Error('DUPLICATE_LICENSE_PLATE');
      }
    }
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function getContratosPorEntidad(entidad_tipo, entidad_id) {
  const conn = await getConnection();
  let query = `
    SELECT id, contract_number, start_date, end_date, monthly_rent, provider_id, unit_id, contracting_company_id
    FROM contracts
  `;
  let params = [];

  switch (entidad_tipo) {
    case 'unidad':
      query += ` WHERE unit_id = ?`;
      params.push(entidad_id);
      break;
    case 'empresa':
      query += ` WHERE contracting_company_id = ?`;
      params.push(entidad_id);
      break;
    case 'proveedor':
      query += ` WHERE provider_id = ?`;
      params.push(entidad_id);
      break;
  }

  try {
    const [rows] = await conn.execute(query, params);
    return rows;
  } catch (error) {
    console.error('GET CONTRATOS POR ENTIDAD ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function getSegurosPorEntidad(entidad_tipo, entidad_id) {
  const conn = await getConnection();
  let query = `
    SELECT id, policy_number, start_date, end_date, premium_amount, provider_id, unit_id
    FROM insurance_policies
  `;
  let params = [];

  switch (entidad_tipo) {
    case 'unidad':
      query += ` WHERE unit_id = ?`;
      params.push(entidad_id);
      break;
    case 'empresa':
      query += ` WHERE unit_id IN (SELECT id FROM units WHERE assigned_company_id = ?)`;
      params.push(entidad_id);
      break;
    case 'proveedor':
      query += ` WHERE provider_id = ?`;
      params.push(entidad_id);
      break;
  }

  try {
    const [rows] = await conn.execute(query, params);
    return rows;
  } catch (error) {
    console.error('GET SEGUROS POR ENTIDAD ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function getAllContracts(filters = {}) {
  const conn = await getConnection();
  let query = `
    SELECT
      c.id,
      c.contract_number,
      c.provider_id,
      pr.name AS provider_name,
      c.unit_id,
      u.economic_number AS unit_economic_number,
      u.license_plate AS unit_license_plate,
      c.contracting_company_id,
      co.name AS company_name,
      c.start_date,
      c.end_date,
      c.term_months,
      c.monthly_rent
    FROM contracts c
    LEFT JOIN providers pr ON c.provider_id = pr.id
    LEFT JOIN units u ON c.unit_id = u.id
    LEFT JOIN companies co ON c.contracting_company_id = co.id
    WHERE 1=1
  `;
  let params = [];

  if (filters.unit_id) {
    query += ` AND c.unit_id = ?`;
    params.push(filters.unit_id);
  }

  if (filters.company_id) {
    query += ` AND c.contracting_company_id = ?`;
    params.push(filters.company_id);
  }

  query += ` ORDER BY c.start_date DESC`;

  try {
    const [rows] = await conn.execute(query, params);
    return rows;
  } catch (error) {
    console.error('GET ALL CONTRACTS ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function updateUnitStatus(unitId, newStatus) {
  const conn = await getConnection();
  const query = `
    UPDATE units
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  try {
    const [result] = await conn.execute(query, [newStatus, unitId]);
    if (result.affectedRows === 0) {
      throw new Error('UNIT_NOT_FOUND');
    }
    return { id: unitId, status: newStatus };
  } catch (error) {
    if (error.message === 'UNIT_NOT_FOUND') {
      throw error;
    }
    console.error('UPDATE UNIT STATUS ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function checkActiveContracts(unitId) {
  const conn = await getConnection();
  const query = `
    SELECT id, contract_number, end_date
    FROM contracts
    WHERE unit_id = ? AND end_date >= CURDATE() AND is_active = 1
  `;

  try {
    const [rows] = await conn.execute(query, [unitId]);
    return rows;
  } catch (error) {
    console.error('CHECK ACTIVE CONTRACTS ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function getStats() {
  const conn = await getConnection();
  try {
    const [unitsResult] = await conn.execute('SELECT COUNT(*) as total FROM units');
    const [activeContractsResult] = await conn.execute(`
      SELECT COUNT(*) as total
      FROM contracts
      WHERE end_date >= CURDATE() AND is_active = 1
    `);
    const [next30Result] = await conn.execute(`
      SELECT COUNT(*) as total
      FROM payments
      WHERE status = 'Pendiente' AND due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    `);
    const [overdueResult] = await conn.execute(`
      SELECT COUNT(*) as total
      FROM payments
      WHERE status = 'Pendiente' AND due_date < CURDATE()
    `);

    return {
      units: unitsResult[0].total,
      active: activeContractsResult[0].total,
      next30: next30Result[0].total,
      overdue: overdueResult[0].total
    };
  } catch (error) {
    console.error('GET STATS ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function getPaymentsReport(filters = {}) {
  const conn = await getConnection();
  let query = `
    SELECT
      p.id,
      p.contract_id,
      p.period,
      p.status,
      p.amount,
      p.payment_date,
      p.type,
      co.name AS company,
      u.economic_number AS unit,
      pr.id AS provider_id,
      pr.name AS provider_name
    FROM payments p
    LEFT JOIN contracts c ON p.contract_id = c.id
    LEFT JOIN units u ON c.unit_id = u.id
    LEFT JOIN companies co ON u.assigned_company_id = co.id
    LEFT JOIN providers pr ON c.provider_id = pr.id
    WHERE 1=1
  `;
  let params = [];

  if (filters.from) {
    query += ` AND p.payment_date >= ?`;
    params.push(filters.from);
  }

  if (filters.to) {
    query += ` AND p.payment_date <= ?`;
    params.push(filters.to);
  }

  if (filters.company) {
    query += ` AND co.name = ?`;
    params.push(filters.company);
  }

  if (filters.provider_id) {
    query += ` AND pr.id = ?`;
    params.push(filters.provider_id);
  }

  query += ` ORDER BY p.payment_date DESC, p.id DESC`;

  try {
    const [rows] = await conn.execute(query, params);
    return rows;
  } catch (error) {
    console.error('GET PAYMENTS REPORT ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function createContract(contractData) {
  const conn = await getConnection();

  const query = `
    INSERT INTO contracts (
      contract_number,
      provider_id,
      unit_id,
      contracting_company_id,
      start_date,
      end_date,
      term_months,
      monthly_rent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    contractData.contract_number,
    contractData.provider_id,
    contractData.unit_id,
    contractData.contracting_company_id,
    contractData.start_date,
    contractData.end_date,
    contractData.term_months,
    contractData.monthly_rent
  ];

  try {
    const [result] = await conn.execute(query, params);
    return { id: result.insertId, ...contractData };
  } catch (error) {
    console.error('CREATE CONTRACT ERROR:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('contract_number')) {
        throw new Error('DUPLICATE_CONTRACT_NUMBER');
      }
    }
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      throw new Error('INVALID_FOREIGN_KEY');
    }
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function getContractsWithData(filters = {}) {
  const conn = await getConnection();
  let query = `
    SELECT
      c.id,
      c.contract_number,
      c.provider_id,
      pr.name AS provider_name,
      c.unit_id,
      u.economic_number AS unit_economic_number,
      u.license_plate AS unit_license_plate,
      c.contracting_company_id,
      co.name AS company_name,
      c.start_date,
      c.end_date,
      c.term_months,
      c.monthly_rent,
      c.is_active,
      c.contract_pdf_path,
      CASE
        WHEN c.end_date < CURDATE() THEN 'Vencido'
        ELSE 'Activo'
      END AS status
    FROM contracts c
    LEFT JOIN providers pr ON c.provider_id = pr.id
    LEFT JOIN units u ON c.unit_id = u.id
    LEFT JOIN companies co ON c.contracting_company_id = co.id
    WHERE 1=1
  `;
  let params = [];

  if (filters.unit_id) {
    query += ` AND c.unit_id = ?`;
    params.push(filters.unit_id);
  }

  if (filters.company_id) {
    query += ` AND c.contracting_company_id = ?`;
    params.push(filters.company_id);
  }

  query += ` ORDER BY c.start_date DESC`;

  try {
    const [rows] = await conn.execute(query, params);
    return rows;
  } catch (error) {
    console.error('GET CONTRACTS WITH DATA ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function updateContractPDF(contractId, pdfPath) {
  const conn = await getConnection();
  const query = `
    UPDATE contracts
    SET contract_pdf_path = ?
    WHERE id = ?
  `;

  try {
    const [result] = await conn.execute(query, [pdfPath, contractId]);
    if (result.affectedRows === 0) {
      throw new Error('CONTRACT_NOT_FOUND');
    }
    return { id: contractId, contract_pdf_path: pdfPath };
  } catch (error) {
    console.error('UPDATE CONTRACT PDF ERROR:', error);
    if (error.message === 'CONTRACT_NOT_FOUND') {
      throw error;
    }
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function getProviders() {
  const conn = await getConnection();
  const query = `
    SELECT
      id,
      name,
      type,
      rfc,
      contact_name,
      contact_email,
      contact_phone,
      status
    FROM providers
    ORDER BY name ASC
  `;

  try {
    const [rows] = await conn.execute(query);
    return rows;
  } catch (error) {
    console.error('GET PROVIDERS ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function createProvider(providerData) {
  const conn = await getConnection();
  const query = `
    INSERT INTO providers (
      name,
      type,
      rfc,
      contact_name,
      contact_email,
      contact_phone,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, 'Activo')
  `;
  const params = [
    providerData.name,
    providerData.type,
    providerData.rfc || null,
    providerData.contact_name || null,
    providerData.contact_email || null,
    providerData.contact_phone || null
  ];

  try {
    const [result] = await conn.execute(query, params);
    return { id: result.insertId, ...providerData, status: 'Activo' };
  } catch (error) {
    console.error('CREATE PROVIDER ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function updateProvider(providerId, providerData) {
  const conn = await getConnection();
  const query = `
    UPDATE providers
    SET name = ?, rfc = ?, contact_name = ?, contact_email = ?, contact_phone = ?
    WHERE id = ?
  `;
  const params = [
    providerData.name,
    providerData.rfc || null,
    providerData.contact_name || null,
    providerData.contact_email || null,
    providerData.contact_phone || null,
    providerId
  ];

  try {
    await conn.execute(query, params);
    return { id: providerId, ...providerData };
  } catch (error) {
    console.error('UPDATE PROVIDER ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function updateProviderStatus(providerId, newStatus) {
  const conn = await getConnection();
  const query = `
    UPDATE providers
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  try {
    const [result] = await conn.execute(query, [newStatus, providerId]);
    if (result.affectedRows === 0) {
      throw new Error('PROVIDER_NOT_FOUND');
    }
    return { id: providerId, status: newStatus };
  } catch (error) {
    if (error.message === 'PROVIDER_NOT_FOUND') {
      throw error;
    }
    console.error('UPDATE PROVIDER STATUS ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function createPayment(paymentData) {
  const conn = await getConnection();
  const query = `
    INSERT INTO payments (
      contract_id,
      payment_date,
      due_date,
      amount,
      payment_method,
      status,
      period,
      type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    paymentData.contract_id,
    paymentData.payment_date,
    paymentData.due_date || null,
    paymentData.amount,
    paymentData.payment_method || null,
    paymentData.status || 'Pendiente',
    paymentData.period || 'Manual',
    paymentData.type || 'rent'
  ];

  try {
    const [result] = await conn.execute(query, params);
    return { id: result.insertId, ...paymentData };
  } catch (error) {
    console.error('CREATE PAYMENT ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function getPaymentsByContract(contractId) {
  const conn = await getConnection();
  const query = `
    SELECT
      p.id,
      p.contract_id,
      p.payment_date,
      p.due_date,
      p.amount,
      p.payment_method,
      p.status,
      p.payment_pdf_path,
      p.period,
      p.type,
      p.created_at,
      c.contract_number
    FROM payments p
    LEFT JOIN contracts c ON p.contract_id = c.id
    WHERE p.contract_id = ?
    ORDER BY p.created_at DESC
  `;

  try {
    const [rows] = await conn.execute(query, [contractId]);
    return rows;
  } catch (error) {
    console.error('GET PAYMENTS BY CONTRACT ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function updatePaymentStatus(paymentId, newStatus) {
  const conn = await getConnection();
  const query = `
    UPDATE payments
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  try {
    const [result] = await conn.execute(query, [newStatus, paymentId]);
    if (result.affectedRows === 0) {
      throw new Error('PAYMENT_NOT_FOUND');
    }
    return { id: paymentId, status: newStatus };
  } catch (error) {
    if (error.message === 'PAYMENT_NOT_FOUND') {
      throw error;
    }
    console.error('UPDATE PAYMENT STATUS ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function updatePaymentPDF(paymentId, pdfPath) {
  const conn = await getConnection();
  const query = `
    UPDATE payments
    SET payment_pdf_path = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  try {
    const [result] = await conn.execute(query, [pdfPath, paymentId]);
    if (result.affectedRows === 0) {
      throw new Error('PAYMENT_NOT_FOUND');
    }
    return { id: paymentId, payment_pdf_path: pdfPath };
  } catch (error) {
    if (error.message === 'PAYMENT_NOT_FOUND') {
      throw error;
    }
    console.error('UPDATE PAYMENT PDF ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function getAllPayments(filters = {}) {
  const conn = await getConnection();
  let query = `
    SELECT
      p.id,
      p.contract_id,
      p.payment_date,
      p.due_date,
      p.amount,
      p.payment_method,
      p.status,
      p.payment_pdf_path,
      p.period,
      p.type,
      p.created_at,
      c.contract_number,
      u.economic_number AS unit_economic_number,
      co.name AS company_name
    FROM payments p
    LEFT JOIN contracts c ON p.contract_id = c.id
    LEFT JOIN units u ON c.unit_id = u.id
    LEFT JOIN companies co ON u.assigned_company_id = co.id
    WHERE 1=1
  `;
  let params = [];

  if (filters.contract_id) {
    query += ` AND p.contract_id = ?`;
    params.push(filters.contract_id);
  }

  if (filters.status) {
    query += ` AND p.status = ?`;
    params.push(filters.status);
  }

  query += ` ORDER BY p.created_at DESC`;

  try {
    const [rows] = await conn.execute(query, params);
    return rows;
  } catch (error) {
    console.error('GET ALL PAYMENTS ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}

export async function getProviderStatement(providerId) {
  const conn = await getConnection();

  const providerQuery = `
    SELECT id, name, type, status
    FROM providers
    WHERE id = ?
  `;

  const paymentsQuery = `
    SELECT
      p.id,
      p.contract_id,
      c.contract_number AS contract_name,
      p.payment_date,
      p.due_date,
      p.amount,
      p.status,
      p.payment_method,
      p.payment_pdf_path AS pdf_path
    FROM payments p
    INNER JOIN contracts c ON p.contract_id = c.id
    WHERE c.provider_id = ?
    ORDER BY p.due_date DESC, p.payment_date DESC
  `;

  try {
    const [providers] = await conn.execute(providerQuery, [providerId]);
    if (!providers || providers.length === 0) {
      throw new Error('PROVIDER_NOT_FOUND');
    }

    const [payments] = await conn.execute(paymentsQuery, [providerId]);

    const totalPaid = payments
      .filter(p => p.status === 'Pagado')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalPending = payments
      .filter(p => p.status === 'Pendiente')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalOverdue = payments
      .filter(p => p.status === 'Vencido')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      provider: providers[0],
      summary: {
        total_paid: totalPaid,
        total_pending: totalPending,
        total_overdue: totalOverdue
      },
      payments: payments
    };
  } catch (error) {
    console.error('GET PROVIDER STATEMENT ERROR:', error);
    throw new Error('DB_INTEGRITY_ERROR');
  }
}
