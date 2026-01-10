import { getTenantIdFromContext, normalizeTenantId, hasValidTenantContext } from './tenantHelper.js';
import logger from './logger.js';

/**
 * Middleware para inyectar tenant_id en la request
 * Fase 3a: Siempre retorna DEFAULT_TENANT_ID
 * Fase 3b: Retornará del JWT o del request
 *
 * USO FUTURO (Fase 3b):
 * app.use('/api', requireTenant);
 */
export function requireTenant(req, res, next) {
  try {
    // Fase 3a: Obtener tenant del contexto (siempre DEFAULT)
    // Fase 3b: Obtener tenant del JWT (req.user.tenantId)
    const tenantId = getTenantIdFromContext(req);

    // Validar tenant_id
    const normalizedTenantId = normalizeTenantId(tenantId);

    // Inyectar en request para uso posterior
    req.tenantId = normalizedTenantId;

    // Log del tenant (sin datos sensibles)
    logger.debug({
      type: 'tenant_context',
      tenantId: normalizedTenantId
    });

    next();
  } catch (error) {
    logger.error('Tenant middleware error:', error);
    // En caso de error, usar tenant por defecto
    req.tenantId = 1;
    next();
  }
}

/**
 * Middleware para validar que una request tiene tenant válido
 * Se usará en Fase 3b para proteger endpoints
 */
export function validateTenant(req, res, next) {
  if (!hasValidTenantContext(req)) {
    return res.status(400).json({ error: 'Invalid tenant context' });
  }
  next();
}

/**
 * Helper para obtener tenant_id de una request
 * Se usará en Fase 3b en los repositorios
 */
export function getTenantId(req) {
  return req.tenantId || 1;
}
