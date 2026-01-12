import logger from './logger.js';

const DEFAULT_TENANT_ID = 1;

/**
 * Obtiene el tenant_id del contexto de la request
 * En Fase 3a, esto retorna siempre DEFAULT_TENANT_ID
 * En Fase 3b, esto vendrá del JWT o del request
 *
 * @param {Object} req - Request de Express
 * @returns {number} tenant_id
 */
export function getTenantIdFromContext(req) {
  // Fase 3a: Siempre retorna tenant por defecto
  // Fase 3b: Retorna req.user.tenantId || req.tenantId || DEFAULT_TENANT_ID
  return DEFAULT_TENANT_ID;
}

/**
 * Valida si un tenant_id es válido
 *
 * @param {number} tenantId - ID del tenant a validar
 * @returns {boolean} true si es válido, false si no
 */
export function isValidTenantId(tenantId) {
  if (!tenantId) return false;
  if (typeof tenantId !== 'number') return false;
  if (tenantId < 1) return false;
  return true;
}

/**
 * Normaliza un tenant_id para asegurar que es válido
 * Si es inválido, retorna el tenant por defecto
 *
 * @param {number} tenantId - ID del tenant a normalizar
 * @returns {number} tenant_id normalizado
 */
export function normalizeTenantId(tenantId) {
  if (!isValidTenantId(tenantId)) {
    logger.warn({
      type: 'tenant_normalization',
      invalid_tenant: tenantId,
      default_tenant: DEFAULT_TENANT_ID
    });
    return DEFAULT_TENANT_ID;
  }
  return tenantId;
}

/**
 * Crea un contexto de tenant para una request
 * Esto se usará en Fase 3b para inyectar tenant_id en el request
 *
 * @param {number} tenantId - ID del tenant
 * @returns {Object} contexto con tenant_id
 */
export function createTenantContext(tenantId) {
  return {
    tenantId: normalizeTenantId(tenantId),
    timestamp: Date.now()
  };
}

/**
 * Helper para agregar filtrado de tenant a una query SQL
 * NO FILTRA AÚN, solo prepara el string para Fase 3b
 *
 * @param {string} query - Query SQL original
 * @param {number} tenantId - ID del tenant
 * @returns {string} query con placeholder de tenant_id
 */
export function addTenantFilter(query, tenantId) {
  // Fase 3a: Solo retorna la query original
  // Fase 3b: Agregará "WHERE tenant_id = ?" a la query
  return query;
}

/**
 * Aplica filtro de tenant a una query SQL de forma segura
 * MODIFICA LA QUERY Y AGREGA PARAMETRO AL ARRAY DE PARÁMETROS
 *
 * @param {string} query - Query SQL original
 * @param {Array} params - Array de parámetros existente
 * @param {number} tenantId - ID del tenant (OPCIONAL)
 * @returns {Object} { query: string, params: Array }
 */
export function applyTenantFilter(query, params = [], tenantId = null, tableAlias = null) {
  // Si no hay tenantId, retorna query original sin cambios
  if (!isValidTenantId(tenantId)) {
    return { query, params };
  }

  // Determinar el nombre completo de la columna (con o sin alias)
  const tenantCondition = tableAlias ? `${tableAlias}.tenant_id = ?` : `tenant_id = ?`;

  // Busca ORDER BY para insertar antes
  const orderByIndex = query.search(/\bORDER BY\b/i);
  const whereIndex = query.search(/\bWHERE\b/i);

  let newQuery = query;
  let newParams = [...params];

  if (whereIndex === -1) {
    // No existe WHERE
    if (orderByIndex === -1) {
      // No existe WHERE ni ORDER BY, agregar al final
      newQuery = `${query} WHERE ${tenantCondition}`;
    } else {
      // Existe ORDER BY, insertar WHERE antes
      const beforeOrderBy = query.substring(0, orderByIndex).trim();
      const fromOrderBy = query.substring(orderByIndex);
      newQuery = `${beforeOrderBy} WHERE ${tenantCondition} ${fromOrderBy}`;
    }
  } else {
    // Existe WHERE
    if (orderByIndex === -1) {
      // No existe ORDER BY, agregar AND al final
      newQuery = `${query} AND ${tenantCondition}`;
    } else {
      // Existen WHERE y ORDER BY, insertar AND antes del ORDER BY
      const beforeOrderBy = query.substring(0, orderByIndex).trim();
      const fromOrderBy = query.substring(orderByIndex);
      newQuery = `${beforeOrderBy} AND ${tenantCondition} ${fromOrderBy}`;
    }
  }

  // Agregar tenantId al array de parámetros
  newParams.push(tenantId);

  return { query: newQuery, params: newParams };
}

/**
 * Valida si un request tiene contexto de tenant válido
 *
 * @param {Object} req - Request de Express
 * @returns {boolean} true si tiene contexto válido, false si no
 */
export function hasValidTenantContext(req) {
  const tenantId = getTenantIdFromContext(req);
  return isValidTenantId(tenantId);
}

export const TENANT_CONTEXT = {
  DEFAULT_TENANT_ID,
  getTenantIdFromContext,
  isValidTenantId,
  normalizeTenantId,
  createTenantContext,
  addTenantFilter,
  applyTenantFilter,
  hasValidTenantContext
};

/**
 * Valida si un tenant existe en la base de datos
 * Fase 3a: Siempre retorna true (default tenant)
 * Fase 3b: Consultará la tabla tenants
 *
 * @param {number} tenantId - ID del tenant a validar
 * @returns {Promise<boolean>} true si existe, false si no
 */
export async function validateTenantExists(tenantId) {
  // Fase 3a: Siempre retorna true (tenant por defecto existe)
  // Fase 3b: Consultará BD: SELECT id FROM tenants WHERE id = ? AND status = 'active'
  return new Promise((resolve) => {
    if (!isValidTenantId(tenantId)) {
      resolve(false);
      return;
    }
    // En Fase 3a, asumimos que siempre existe
    resolve(true);
  });
}

/**
 * Obtiene un tenant por su ID
 * Fase 3a: Retorna tenant por defecto hardcodeado
 * Fase 3b: Consultará la tabla tenants
 *
 * @param {number} tenantId - ID del tenant a obtener
 * @returns {Promise<Object>} objeto tenant o null si no existe
 */
export async function getTenantById(tenantId) {
  // Fase 3a: Retorna tenant por defecto hardcodeado
  // Fase 3b: Consultará BD: SELECT * FROM tenants WHERE id = ?
  return new Promise((resolve) => {
    if (!isValidTenantId(tenantId)) {
      resolve(null);
      return;
    }
    // En Fase 3a, siempre retorna el tenant por defecto
    resolve({
      id: DEFAULT_TENANT_ID,
      name: 'PCAS Default',
      slug: 'default',
      status: 'active',
      settings: null
    });
  });
}
