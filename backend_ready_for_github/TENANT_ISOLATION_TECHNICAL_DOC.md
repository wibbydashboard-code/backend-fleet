# Tenant Isolation - Enfoque Técnico

## Resumen

Este documento describe el enfoque de tenant isolation para PCAS Fleet Management.

## Conceptos Clave

### Tenant
Un "tenant" representa una empresa cliente que usa PCAS. Cada tenant tiene:
- ID único (tenant_id)
- Nombre de empresa
- Slug único (para URLs personalizadas en el futuro)
- Status (active, suspended, trial)
- Settings (configuración específica)

### Tenant Isolation
Es la separación lógica de datos entre diferentes tenants para que:
- El Tenant A no pueda ver datos del Tenant B
- El Tenant B no pueda modificar datos del Tenant A
- Cada tenant tenga sus propios datos (unidades, contratos, pagos, etc.)

## Arquitectura Propuesta

### 1. Base de Datos (SQL)

#### Tabla de tenants
```sql
CREATE TABLE tenants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  status ENUM('active', 'suspended', 'trial') DEFAULT 'active',
  settings JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Tablas existentes con tenant_id
Todas las tablas principales tendrán una columna `tenant_id`:
- `companies.tenant_id`
- `units.tenant_id`
- `contracts.tenant_id`
- `providers.tenant_id`
- `payments.tenant_id`
- `insurance_policies.tenant_id`

### 2. Backend (Node.js + Express)

#### tenantHelper.js
Helpers utilitarios para trabajar con tenants:
- `getTenantIdFromContext(req)` - Obtiene tenant_id del request
- `isValidTenantId(tenantId)` - Valida si un tenant_id es válido
- `normalizeTenantId(tenantId)` - Normaliza tenant_id inválido a default
- `createTenantContext(tenantId)` - Crea contexto de tenant
- `addTenantFilter(query, tenantId)` - Prepara query con filtro de tenant
- `hasValidTenantContext(req)` - Valida contexto de tenant

#### tenantMiddleware.js
Middleware de Express para inyectar tenant_id:
- `requireTenant(req, res, next)` - Inyecta req.tenantId
- `validateTenant(req, res, next)` - Valida tenant válido
- `getTenantId(req)` - Obtiene tenant_id del request

### 3. Repositorios

#### Modificación de firmas
Los repositorios aceptarán `tenantId` como parámetro:

```javascript
// ANTES:
export async function getAllUnits(filters = {}) {
  const query = `SELECT * FROM units WHERE 1=1`;
  // ...
}

// DESPUÉS (Fase 3b):
export async function getAllUnits(tenantId, filters = {}) {
  const query = `SELECT * FROM units WHERE tenant_id = ?`;
  // ...
}
```

#### Filtro de tenant en queries
Cada query incluirá `WHERE tenant_id = ?`:
```javascript
const query = `
  SELECT * FROM units
  WHERE tenant_id = ?
  -- ... otros filtros
`;
```

### 4. Endpoints

#### Inyección de tenant
Los endpoints usarán `requireTenant` middleware:

```javascript
app.get('/api/units',
  authenticateToken,
  requireTenant,  <-- INYECTA req.tenantId
  async (req, res) => {
    const units = await getAllUnits(req.tenantId, req.query);
    res.json({ ok: true, data: units });
  }
);
```

## Implementación por Fases

### Fase 3a: Preparación (Actual) ✅
- Crear tabla de tenants
- Crear tenantHelper.js (helpers utilitarios)
- Crear tenantMiddleware.js (middleware, NO aplicado)
- Documentación técnica

### Fase 3b: Integración (Futura)
- Agregar tenant_id a todas las tablas (SQL)
- Modificar repositorios para aceptar tenantId
- Agregar filtro tenant_id en queries
- Aplicar requireTenant middleware a endpoints

### Fase 3c: Migración (Futura)
- Migrar datos existentes con tenant_id = 1
- Actualizar users table con tenant_id
- Actualizar login para incluir tenant_id en JWT

## Consideraciones Importantes

### Default Tenant
Mientras el sistema no sea multi-tenant, todos los datos usarán `tenant_id = 1` (tenant por defecto).

### Fase 3a vs Fase 3b
- **Fase 3a**: Preparar infraestructura, sin cambiar queries
- **Fase 3b**: Aplicar tenant filtering a queries

### Backward Compatibility
En Fase 3b, si tenantId no se proporciona, se usa DEFAULT_TENANT_ID:
```javascript
export async function getAllUnits(tenantId = 1, filters = {}) {
  // ...
}
```

### Security
El tenant_id siempre viene del JWT o del contexto de autenticación, nunca del frontend:
```javascript
// ❌ INCORRECTO (vulnerable a manipulación)
const tenantId = req.body.tenantId;

// ✅ CORRECTO (del contexto autenticado)
const tenantId = req.user.tenantId || req.tenantId;
```

## Testing

### Unit Tests
```javascript
describe('tenantHelper', () => {
  it('should validate tenant_id', () => {
    expect(isValidTenantId(1)).toBe(true);
    expect(isValidTenantId(0)).toBe(false);
    expect(isValidTenantId(-1)).toBe(false);
    expect(isValidTenantId('abc')).toBe(false);
  });

  it('should normalize invalid tenant_id', () => {
    expect(normalizeTenantId(0)).toBe(1);
    expect(normalizeTenantId(-1)).toBe(1);
    expect(normalizeTenantId('abc')).toBe(1);
  });
});
```

### Integration Tests
```javascript
describe('tenant isolation', () => {
  it('should not return units from other tenants', async () => {
    // Tenant 1 crea unidad
    const unit1 = await createUnit(1, { ... });

    // Tenant 2 crea unidad
    const unit2 = await createUnit(2, { ... });

    // Tenant 1 no debe ver unidad de Tenant 2
    const unitsTenant1 = await getAllUnits(1);
    expect(unitsTenant1).toHaveLength(1);
    expect(unitsTenant1[0].id).toBe(unit1.id);
  });
});
```

## Migración de Datos

### Estrategia
1. Crear tabla tenants
2. Insertar tenant por defecto (id=1, name="PCAS Default")
3. Agregar columna tenant_id a todas las tablas
4. Actualizar todos los registros existentes con tenant_id = 1
5. Verificar que no hay datos con tenant_id = NULL o 0

### SQL de Migración
```sql
-- 1. Crear tabla tenants
CREATE TABLE tenants (...);

-- 2. Insertar tenant por defecto
INSERT INTO tenants (name, slug, status)
VALUES ('PCAS Default', 'default', 'active');

-- 3. Agregar tenant_id a tablas
ALTER TABLE units ADD COLUMN tenant_id INT NOT NULL DEFAULT 1;
ALTER TABLE contracts ADD COLUMN tenant_id INT NOT NULL DEFAULT 1;
-- ... etc

-- 4. Verificar no hay NULLs
SELECT * FROM units WHERE tenant_id IS NULL;
```

## Checklist de Implementación

### Fase 3a (Actual)
- [x] Tabla tenants creada
- [x] tenantHelper.js creado
- [x] tenantMiddleware.js creado
- [x] Documentación técnica
- [ ] Ejecutar migrations en TiDB Cloud

### Fase 3b (Futura)
- [ ] Ejecutar migrations (agregar tenant_id)
- [ ] Modificar repositorios para aceptar tenantId
- [ ] Agregar filtro tenant_id en queries
- [ ] Aplicar requireTenant a endpoints
- [ ] Tests de tenant isolation

### Fase 3c (Futura)
- [ ] Migrar datos existentes
- [ ] Actualizar users con tenant_id
- [ ] Actualizar login JWT con tenant_id
- [ ] Deploy y monitoreo

## Referencias

- [Database Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Multi-tenancy patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/multi-tenancy)
- [Tenant isolation best practices](https://auth0.com/blog/multi-tenancy-saas-best-practices)
