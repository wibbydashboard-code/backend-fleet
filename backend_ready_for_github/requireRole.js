import { hasAnyRole } from './permissions.js';
import { auditLogger } from './auditLogger.js';

/**
 * Middleware para verificar roles específicos en endpoints
 *
 * Se aplica DESPUÉS de requireAuth (ya existe req.user)
 *
 * Comportamiento:
 * - Rol válido (admin/user/viewer) → next()
 * - Rol inválido → 403 Forbidden
 * - Sin token → Ya manejado por requireAuth (401)
 *
 * @param {Array<string>} allowedRoles - Lista de roles permitidos
 * @returns {Function} Middleware de Express
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      auditLogger.log({
        userId: req.user?.userId || null,
        tenantId: req.user?.tenantId || null,
        action: 'access_denied_no_role',
        entity: 'rbac',
        metadata: {
          reason: 'no_role_in_token',
          path: req.path,
          method: req.method,
          allowedRoles
        },
        req
      });

      return res.status(403).json({ error: 'Forbidden: Invalid role' });
    }

    if (!hasAnyRole(req.user.role, allowedRoles)) {
      auditLogger.log({
        userId: req.user.userId,
        tenantId: req.user.tenantId,
        action: 'access_denied_insufficient_role',
        entity: 'rbac',
        metadata: {
          reason: 'insufficient_role',
          path: req.path,
          method: req.method,
          userRole: req.user.role,
          allowedRoles
        },
        req
      });

      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
}

export default { requireRole };
