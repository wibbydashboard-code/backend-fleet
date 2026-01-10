export const PERMISSIONS = {
  // Dashboard y Reportes
  VIEW_DASHBOARD: ['admin', 'user', 'viewer'],
  VIEW_REPORTS: ['admin', 'user', 'viewer'],

  // Unidades
  VIEW_UNITS: ['admin', 'user', 'viewer'],
  CREATE_UNITS: ['admin', 'user'],
  EDIT_UNITS: ['admin', 'user'],
  DELETE_UNITS: ['admin'],

  // Contratos
  VIEW_CONTRACTS: ['admin', 'user', 'viewer'],
  CREATE_CONTRACTS: ['admin', 'user'],
  EDIT_CONTRACTS: ['admin', 'user'],
  DELETE_CONTRACTS: ['admin'],
  UPLOAD_CONTRACT_PDF: ['admin', 'user'],

  // Pagos
  VIEW_PAYMENTS: ['admin', 'user', 'viewer'],
  CREATE_PAYMENTS: ['admin', 'user'],
  EDIT_PAYMENTS: ['admin'],
  DELETE_PAYMENTS: ['admin'],
  UPLOAD_PAYMENT_PDF: ['admin', 'user'],
  APPROVE_PAYMENTS: ['admin'],

  // Proveedores
  VIEW_PROVIDERS: ['admin', 'user', 'viewer'],
  CREATE_PROVIDERS: ['admin', 'user'],
  EDIT_PROVIDERS: ['admin', 'user'],
  DELETE_PROVIDERS: ['admin'],

  // Empresas
  VIEW_COMPANIES: ['admin', 'user', 'viewer'],
  CREATE_COMPANIES: ['admin', 'user'],
  EDIT_COMPANIES: ['admin', 'user'],
  DELETE_COMPANIES: ['admin'],

  // Admin only
  MANAGE_USERS: ['admin'],
  MANAGE_TENANTS: ['admin'],
  VIEW_AUDIT_LOGS: ['admin'],
  SYSTEM_SETTINGS: ['admin']
};

export function hasRole(userRole, requiredRole) {
  return userRole === requiredRole;
}

export function hasAnyRole(userRole, allowedRoles) {
  return allowedRoles.includes(userRole);
}

export function hasPermission(userRole, permission) {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) {
    return false;
  }
  return allowedRoles.includes(userRole);
}

export function canViewDashboard(userRole) {
  return hasPermission(userRole, PERMISSIONS.VIEW_DASHBOARD);
}

export function canManageUnits(userRole) {
  return hasPermission(userRole, PERMISSIONS.MANAGE_UNITS);
}

export function isAdmin(userRole) {
  return userRole === 'admin';
}
