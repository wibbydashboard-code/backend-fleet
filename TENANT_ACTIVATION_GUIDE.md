# Tenant Activation - Guía Futura

## Estado Actual (Fase 3b Congelada)

La arquitectura multi-tenant está **PREPARADA PERO NO ACTIVADA**.

### Qué Existe:
- ✅ Tabla `tenants` en migrations (SQL creado, NO ejecutado)
- ✅ Helpers de tenant en `tenantHelper.js` (7 funciones + TENANT_CONTEXT)
- ✅ Middleware de tenant en `tenantMiddleware.js` (3 funciones, NO aplicados)
- ✅ Función `applyTenantFilter` en `tenantHelper.js` (creada, NO usada)
- ✅ Documentación técnica completa

### Qué NO Existe:
- ❌ Columna `tenant_id` en tablas existentes
- ❌ Migración de datos ejecutada
- ❌ Middleware aplicado a rutas
- ❌ Queries filtrando por tenant_id
- ❌ Tenant enforcement activo

### Guard Clauses:
- Si llega `tenantId` por query/JWT → ignorar silenciosamente
- Si se intenta filtrar por tenant → log warning, sin error
- Sistema funciona **EXACTAMENTE IGUAL** que antes de Fase 3a

---

## Cómo Activar Tenant en el Futuro

### Paso 1: Pre-requisitos
- [ ] Tener backup de BD reciente
- [ ] TiDB Cloud accesible
- [ ] Usuarios listos para migrar

### Paso 2: Ejecutar Migración de Tablas

**Archivo:** `migrations/002_create_tenants_table.sql`

```bash
# 1. Crear tabla tenants
mysql -h <host> -u <user> -p <database> < migrations/002_create_tenants_table.sql

# 2. Verificar tabla creada
mysql -h <host> -u <user> -p <database> -e "DESCRIBE tenants;"
```

### Paso 3: Agregar tenant_id a Tablas Existentes

```sql
-- Copiar y ejecutar en TiDB Cloud

-- 1. Agregar tenant_id a companies
ALTER TABLE `companies` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;
CREATE INDEX `idx_companies_tenant` ON `companies`(`tenant_id`);

-- 2. Agregar tenant_id a units
ALTER TABLE `units` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;
CREATE INDEX `idx_units_tenant` ON `units`(`tenant_id`);

-- 3. Agregar tenant_id a contracts
ALTER TABLE `contracts` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;
CREATE INDEX `idx_contracts_tenant` ON `contracts`(`tenant_id`);

-- 4. Agregar tenant_id a providers
ALTER TABLE `providers` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;
CREATE INDEX `idx_providers_tenant` ON `providers`(`tenant_id`);

-- 5. Agregar tenant_id a payments
ALTER TABLE `payments` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;
CREATE INDEX `idx_payments_tenant` ON `payments`(`tenant_id`);

-- 6. Agregar tenant_id a insurance_policies
ALTER TABLE `insurance_policies` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;
CREATE INDEX `idx_insurance_tenant` ON `insurance_policies`(`tenant_id`);
```

### Paso 4: Migrar Datos Existentes

```sql
-- Verificar que todos los registros tienen tenant_id
SELECT 'units' as table_name, COUNT(*) as total, SUM(CASE WHEN tenant_id = 1 THEN 1 ELSE 0 END) as tenant_1 FROM units
UNION ALL
SELECT 'contracts', COUNT(*), SUM(CASE WHEN tenant_id = 1 THEN 1 ELSE 0 END) FROM contracts
UNION ALL
SELECT 'providers', COUNT(*), SUM(CASE WHEN tenant_id = 1 THEN 1 ELSE 0 END) FROM providers
UNION ALL
SELECT 'payments', COUNT(*), SUM(CASE WHEN tenant_id = 1 THEN 1 ELSE 0 END) FROM payments;
```

**Resultado esperado:** Todas las tablas deben tener `total` = `tenant_1`

### Paso 5: Habilitar Tenant en Backend

**Archivo:** `repository.js`

```javascript
// Modificar getStats para usar applyTenantFilter
export async function getStats(tenantId = 1) {
  // ... código existente
  const { query: unitsQueryFinal, params: unitsParams } = applyTenantFilter(unitsQuery, [], tenantId);
  // ...
}

// Repetir patrón para otras funciones de repositorio
```

**Archivo:** `server.js`

```javascript
// Descomentar y ajustar requireTenant
// import { requireTenant } from './tenantMiddleware.js';

app.get('/api/stats',
  // authenticateToken,      // Activar en Fase 5
  // requireTenant,          // ACTIVAR AQUÍ en Fase 5
  async (req, res) => {
    const stats = await getStats(req.tenantId);
    res.json({ ok: true, stats });
  }
);
```

### Paso 6: Incluir tenantId en JWT

**Archivo:** `authService.js`

```javascript
// Modificar createUserPayload
export function createUserPayload(user) {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenant_id,  // AGREGAR ESTO
    iat: Math.floor(Date.now() / 1000)
  };
}
```

### Paso 7: Actualizar Users con tenantId

```sql
-- Agregar columna tenant_id a users
ALTER TABLE `users` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;
CREATE INDEX `idx_users_tenant` ON `users`(`tenant_id`);

-- Actualizar usuario admin
UPDATE `users` SET `tenant_id` = 1 WHERE `id` = 1;
```

### Paso 8: Validación de Tenant Isolation

```bash
# 1. Verificar que tenant_id está en JWT
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pcas.com","password":"Admin123!"}' \
  | jq -r '.data.token')

echo $TOKEN | jq .

# Debe mostrar: { "userId":1, "email":"...", "role":"admin", "tenantId":1 }

# 2. Verificar filtering por tenant
curl "http://localhost:3000/api/stats?tenantId=1"

# Debe retornar solo datos del tenant 1
```

### Paso 9: Rollback Plan

Si algo falla:

```sql
-- Revertir tablas a estado anterior
-- Esto eliminará la columna tenant_id
ALTER TABLE `users` DROP COLUMN `tenant_id`;
ALTER TABLE `payments` DROP COLUMN `tenant_id`;
ALTER TABLE `insurance_policies` DROP COLUMN `tenant_id`;
ALTER TABLE `providers` DROP COLUMN `tenant_id`;
ALTER TABLE `contracts` DROP COLUMN `tenant_id`;
ALTER TABLE `units` DROP COLUMN `tenant_id`;
ALTER TABLE `companies` DROP COLUMN `tenant_id`;

-- Eliminar tabla tenants
DROP TABLE IF EXISTS `tenants`;
```

---

## Consideraciones Importantes

### Backward Compatibility
Mientras `tenantId` sea opcional y tenga valor por defecto (1), el sistema funciona igual que antes.

### Default Tenant
Todos los datos existentes se migran con `tenant_id = 1` (tenant por defecto).

### Tenant Enforcement
El tenant enforcement NO se activa hasta que se aplique `requireTenant` middleware a endpoints.

### Frontend
El frontend NO necesita cambios hasta que el backend active tenant enforcement.

---

## Checkpoint Pre-Activación

Antes de activar tenant, verificar:

- [ ] Backup de BD reciente
- [ ] Tablas tienen tenant_id
- [ ] Todos los datos tienen tenant_id = 1
- [ ] JWT incluye tenantId
- [ ] `applyTenantFilter` funciona correctamente
- [ ] Endpoints NO públicos tienen `requireTenant`
- [ ] Tests manuales pasan
- [ ] Plan de rollback documentado

---

## Comandos Útiles

### Verificar tablas con tenant_id
```sql
SELECT TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND COLUMN_NAME = 'tenant_id';
```

### Verificar datos con tenant_id = 1
```sql
SELECT
  'units' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN tenant_id = 1 THEN 1 END) as tenant_1,
  COUNT(CASE WHEN tenant_id != 1 THEN 1 END) as other_tenants
FROM units
UNION ALL
SELECT 'contracts', COUNT(*), COUNT(CASE WHEN tenant_id = 1 THEN 1 END), COUNT(CASE WHEN tenant_id != 1 THEN 1 END) FROM contracts
UNION ALL
SELECT 'providers', COUNT(*), COUNT(CASE WHEN tenant_id = 1 THEN 1 END), COUNT(CASE WHEN tenant_id != 1 THEN 1 END) FROM providers;
```

### Verificar tenant en JWT
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@pcas.com","password":"Admin123!"}' | jq -r '.data.token')
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq .
```

---

## Fases de Implementación

### Fase 3a: Preparación (COMPLETADA ✅)
- Tabla tenants (SQL creado)
- Helpers creados
- Middleware creado
- Documentación técnica

### Fase 3b: Congelada (ESTADO ACTUAL ❄️)
- applyTenantFilter creado pero NO usado
- getStats modificado pero REVERTIDO
- Tenant enforcement DESACTIVADO
- Sistema funciona EXACTAMENTE IGUAL que antes

### Fase 3c: Activación (FUTURA ⏳)
- Ejecutar migraciones de tablas
- Agregar applyTenantFilter a repositorios
- Aplicar requireTenant a endpoints
- Incluir tenantId en JWT
- Tests de tenant isolation

---

**Última actualización:** 2026-01-10 (Fase 3b Congelada)
**Estado:** Infraestructura preparada, NO activa
**Impacto funcional:** CERO
