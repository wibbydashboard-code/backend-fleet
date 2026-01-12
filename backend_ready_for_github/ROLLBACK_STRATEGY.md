# ROLLBACK STRATEGY - TENANT ISOLATION

## CÓMO DESACTIVAR TENANT ISOLATION

### OPCIÓN 1: DESACTIVACIÓN COMPLETA (MÁS RÁPIDO)

Si hay problemas graves y necesitas desactivar tenant isolation inmediatamente:

#### 1.1 Comentar import en repository.js
```javascript
// import { applyTenantFilter } from './tenantHelper.js';
```

#### 1.2 Eliminar llamadas a applyTenantFilter en repository.js

En cada función que usa `applyTenantFilter`, reemplazar:

```javascript
// ANTES
const tenantId = filters.tenantId || null;
const { query: finalQuery, params: finalParams } = applyTenantFilter(query, params, tenantId);

const [rows] = await conn.execute(finalQuery, finalParams);
```

POR:

```javascript
// DESPUÉS
const [rows] = await conn.execute(query, params);
```

Funciones afectadas:
- `getAllUnits()` - Línea ~140
- `getAllContracts()` - Línea ~300
- `getContractsWithData()` - Línea ~540
- `getAllPayments()` - Línea ~835
- `getPaymentsByContract()` - Línea ~740

#### 1.3 Eliminar tenant_id en INSERTs

En funciones de creación, eliminar tenantId del INSERT:

```javascript
// ANTES
const tenantId = unitData.tenantId || 1;
const query = `INSERT INTO units (...) VALUES (..., ?)`;
const params = [..., tenantId];

// DESPUÉS
const query = `INSERT INTO units (...) VALUES (...)`;
const params = [...];
```

Funciones afectadas:
- `createUnit()` - Línea ~155
- `createContract()` - Línea ~460
- `createPayment()` - Línea ~690

#### 1.4 Verificar que el servidor inicia
```bash
cd C:\Users\desib\Desktop\app_pcas
node server.js
```

### OPCIÓN 2: ROLLBACK PARCIAL (MÁS SEGURO)

Si solo quieres desactivar el enforcement pero mantener las columnas:

#### 2.1 Modificar applyTenantFilter en tenantHelper.js

En `tenantHelper.js`, línea ~88, modificar para que siempre retorne la query original:

```javascript
// ANTES
export function applyTenantFilter(query, params = [], tenantId = null, tableAlias = null) {
  // Si no hay tenantId, retorna query original sin cambios
  if (!isValidTenantId(tenantId)) {
    return { query, params };
  }
  // ... resto del código
}

// DESPUÉS
export function applyTenantFilter(query, params = [], tenantId = null, tableAlias = null) {
  // RETORNAR SIEMPRE QUERY ORIGINAL (ROLLBACK)
  return { query, params };
}
```

#### 2.2 Verificar que el servidor inicia
```bash
cd C:\Users\desib\Desktop\app_pcas
node server.js
```

### OPCIÓN 3: ROLLBACK DESDE BACKUP

Si necesitas volver al estado anterior completamente:

#### 3.1 Restaurar archivos desde backup
```bash
cp -f "C:\Users\desib\Desktop\app_pcas_backup\server.js" "C:\Users\desib\Desktop\app_pcas\server.js"
cp -f "C:\Users\desib\Desktop\app_pcas_backup\repository.js" "C:\Users\desib\Desktop\app_pcas\repository.js"
cp -f "C:\Users\desib\Desktop\app_pcas_backup\tenantHelper.js" "C:\Users\desib\Desktop\app_pcas\tenantHelper.js"
```

#### 3.2 Verificar que el servidor inicia
```bash
cd C:\Users\desib\Desktop\app_pcas
node server.js
```

## QUÉ NO TOCAR DEL BACKUP

⚠️ **NUNCA TOCAR ESTOS ARCHIVOS EN EL BACKUP:**
- `server.js` - Contiene el código original antes de tenant isolation
- `repository.js` - Contiene las funciones de repositorio originales
- `permissions.js` - Permisos originales
- `roleUtils.js` - Utilidades de roles originales

## ROLLBACK DE BASE DE DATOS

Si necesitas remover tenant_id de las tablas:

### ADVERTENCIA: NO RECOMENDADO

Esto puede causar pérdida de datos. Solo hacerlo si es absolutamente necesario.

### Rollback SQL
```sql
-- REMOVER tenant_id DE LA TABLA units
ALTER TABLE units DROP COLUMN tenant_id;
ALTER TABLE units DROP INDEX idx_tenant_id;

-- REMOVER tenant_id DE LA TABLA contracts
ALTER TABLE contracts DROP COLUMN tenant_id;
ALTER TABLE contracts DROP INDEX idx_tenant_id;

-- REMOVER tenant_id DE LA TABLA payments
ALTER TABLE payments DROP COLUMN tenant_id;
ALTER TABLE payments DROP INDEX idx_tenant_id;
```

## TEST DESPUÉS DE ROLLBACK

Después de cualquier rollback, ejecutar estos tests:

```bash
# Test 1: Verificar que el servidor inicia
cd C:\Users\desib\Desktop\app_pcas
timeout 3 node server.js

# Test 2: Verificar /api/stats funciona
curl http://localhost:3000/api/stats

# Test 3: Verificar /api/units funciona
curl http://localhost:3000/api/units
```

## DOCUMENTACIÓN DE CAMBIOS REALIZADOS

### Migraciones de Base de Datos
- ✅ Agregado tenant_id a tabla units (INT, NOT NULL, DEFAULT 1)
- ✅ Agregado tenant_id a tabla contracts (INT, NOT NULL, DEFAULT 1)
- ✅ Agregado tenant_id a tabla payments (INT, NOT NULL, DEFAULT 1)
- ✅ Agregado índice idx_tenant_id en las tres tablas
- ✅ Backfill: Todos los registros existentes asignados a tenant_id = 1

### Cambios en Backend (repository.js)
- ✅ Import de applyTenantFilter desde tenantHelper.js
- ✅ Activación de applyTenantFilter en getAllUnits()
- ✅ Activación de applyTenantFilter en getAllContracts()
- ✅ Activación de applyTenantFilter en getContractsWithData()
- ✅ Activación de applyTenantFilter en getAllPayments()
- ✅ Activación de applyTenantFilter en getPaymentsByContract()
- ✅ Asignación de tenantId en createUnit()
- ✅ Asignación de tenantId en createContract()
- ✅ Asignación de tenantId en createPayment()

### Cambios en Backend (tenantHelper.js)
- ✅ Mejora de applyTenantFilter para manejar ORDER BY
- ✅ Agregado parámetro opcional tableAlias para evitar ambigüedad en JOINs

### Cambios en Backend (server.js)
- ✅ Agregado tenantId en JWT payload
- ✅ Agregado tenantId en respuesta de login
- ✅ Agregado tenantId en audit log

## COMPORTAMIENTO ESPERADO

### Sin tenantId (comportamiento actual)
- Retorna todos los datos
- Compatible con endpoints existentes
- No rompe el sistema

### Con tenantId (aislamiento activo)
- Filtra datos por tenant
- Retorna vacío si no hay datos para ese tenant
- No retorna error si el tenant no existe

## COMUNICACIÓN DE ROLLBACK

Si se produce un rollback:

1. **Notificar al equipo** sobre el cambio
2. **Documentar el motivo** del rollback
3. **Crear issue** para investigar el problema
4. **Planear corrección** para futura implementación

## CONTACTO

Para cualquier pregunta o problema con el rollback:
- Revisar este documento primero
- Verificar logs del servidor
- Revisar logs de audit log para identificar el problema
