import { hasRole, hasAnyRole, hasPermission, isAdmin } from './permissions.js';

export class RoleUtils {
  /**
   * Verifica si un usuario tiene un rol específico
   */
  static hasRole(user, role) {
    if (!user || !user.role) return false;
    return hasRole(user.role, role);
  }

  /**
   * Verifica si un usuario tiene alguno de los roles permitidos
   */
  static hasAnyRole(user, roles) {
    if (!user || !user.role) return false;
    return hasAnyRole(user.role, roles);
  }

  /**
   * Verifica si un usuario tiene un permiso específico
   */
  static hasPermission(user, permission) {
    if (!user || !user.role) return false;
    return hasPermission(user.role, permission);
  }

  /**
   * Verifica si un usuario es administrador
   */
  static isAdmin(user) {
    if (!user || !user.role) return false;
    return isAdmin(user.role);
  }

  /**
   * Verifica si un usuario puede ver el dashboard
   */
  static canViewDashboard(user) {
    if (!user || !user.role) return false;
    return this.hasPermission(user, 'VIEW_DASHBOARD');
  }

  /**
   * Verifica si un usuario puede gestionar unidades
   */
  static canManageUnits(user) {
    if (!user || !user.role) return false;
    return this.hasPermission(user, 'MANAGE_UNITS');
  }

  /**
   * Verifica si un usuario puede gestionar contratos
   */
  static canManageContracts(user) {
    if (!user || !user.role) return false;
    return this.hasPermission(user, 'CREATE_CONTRACTS') ||
           this.hasPermission(user, 'EDIT_CONTRACTS');
  }

  /**
   * Verifica si un usuario puede gestionar pagos
   */
  static canManagePayments(user) {
    if (!user || !user.role) return false;
    return this.hasPermission(user, 'CREATE_PAYMENTS') ||
           this.hasPermission(user, 'EDIT_PAYMENTS');
  }

  /**
   * Verifica si un usuario puede gestionar proveedores
   */
  static canManageProviders(user) {
    if (!user || !user.role) return false;
    return this.hasPermission(user, 'CREATE_PROVIDERS') ||
           this.hasPermission(user, 'EDIT_PROVIDERS');
  }

  /**
   * Verifica si un usuario puede gestionar empresas
   */
  static canManageCompanies(user) {
    if (!user || !user.role) return false;
    return this.hasPermission(user, 'CREATE_COMPANIES') ||
           this.hasPermission(user, 'EDIT_COMPANIES');
  }

  /**
   * Verifica si un usuario puede gestionar usuarios
   */
  static canManageUsers(user) {
    return this.isAdmin(user);
  }

  /**
   * Verifica si un usuario puede ver audit logs
   */
  static canViewAuditLogs(user) {
    return this.isAdmin(user);
  }
}
