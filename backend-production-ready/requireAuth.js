import { verifyToken } from './authService.js';
import { auditLogger } from './auditLogger.js';

/**
 * Middleware de autenticación obligatoria (NO RBAC)
 *
 * Comportamiento:
 * - Request sin token → 401
 * - Token válido → comportamiento actual
 * - Login sigue funcionando igual
 * - Tenant fallback NO se rompe
 *
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Next middleware
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  // Si no hay token, rechazar con 401
  if (!authHeader) {
    auditLogger.log({
      userId: null,
      tenantId: null,
      action: 'auth_attempt_failed',
      entity: 'auth',
      metadata: {
        reason: 'no_token',
        path: req.path,
        method: req.method
      },
      req
    });

    return res.status(401).json({ error: 'Authorization required' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    // Asignar usuario al request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId
    };

    // Loggear acceso autorizado
    auditLogger.log({
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      action: 'access_authorized',
      entity: 'auth',
      metadata: {
        path: req.path,
        method: req.method,
        role: decoded.role,
        hasTenantId: !!decoded.tenantId
      },
      req
    });

    next();
  } catch (error) {
    // Loggear intento fallido
    auditLogger.log({
      userId: null,
      tenantId: null,
      action: 'auth_attempt_failed',
      entity: 'auth',
      metadata: {
        reason: 'invalid_token',
        path: req.path,
        method: req.method
      },
      req
    });

    return res.status(401).json({ error: 'Invalid token' });
  }
}

export default { requireAuth };
