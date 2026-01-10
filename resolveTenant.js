import { auditLogger } from './auditLogger.js';

/**
 * Middleware para resolver tenant_id desde request
 *
 * Prioridad:
 * 1. JWT (payload.tenantId)
 * 2. Header x-tenant-id (fallback)
 * 3. Null (sin tenant)
 *
 * NO BLOQUEA: Solo prepara el tenant_id en req.tenantId
 * Para ser usado por middlewares posteriores (como tenant filtering)
 *
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Next middleware
 */
export function resolveTenant(req, res, next) {
  let tenantId = null;
  let tenantSource = null;

  // Prioridad 1: JWT (token en Authorization header)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      if (payload.tenantId) {
        tenantId = payload.tenantId;
        tenantSource = 'jwt';
      }
    } catch (error) {
      // JWT inválido, continuar al siguiente método
      console.warn('Invalid JWT token in resolveTenant:', error.message);
    }
  }

  // Prioridad 2: Header x-tenant-id (fallback)
  if (!tenantId && req.headers['x-tenant-id']) {
    try {
      tenantId = parseInt(req.headers['x-tenant-id']);
      if (isNaN(tenantId)) {
        tenantId = null;
      } else {
        tenantSource = 'header';
      }
    } catch (error) {
      console.warn('Invalid x-tenant-id header:', error.message);
    }
  }

  // Asignar tenant_id al request
  req.tenantId = tenantId;
  req.tenantSource = tenantSource;

  // Loggear tenant resolution (security pasiva)
  if (tenantId) {
    req.logMetadata = req.logMetadata || {};
    req.logMetadata.tenantId = tenantId;
    req.logMetadata.tenantSource = tenantSource;
  } else {
    // Warning: tenant missing (no bloqueo, solo log)
    console.warn('Tenant ID missing in request', {
      path: req.path,
      method: req.method,
      hasAuthHeader: !!authHeader,
      hasTenantHeader: !!req.headers['x-tenant-id']
    });
  }

  next();
}

export default { resolveTenant };
