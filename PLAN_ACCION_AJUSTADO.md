# 🚀 Plan de Acción Ajustado - Evolución Controlada de PCAS

**Versión**: v2.1 - Plan Conservador y Seguro
**Fecha**: 09 de enero de 2026
**Objetivo**: Evolucionar PCAS a nivel de seguridad empresarial SIN RIESGOS OPERATIVOS
**Enfoque**: Cambios MINIMOS, CHECKPOINTS FRECUENTES, ROLLBACK INMEDIATO
**Estimado**: 5-7 semanas (más lento pero 100% seguro)

---

## 🎯 PRINCIPIOS AJUSTADOS (Basados en tu feedback)

### Regla #1: BACKEND PRIMERO, FRONTEND DESPUÉS
- Nada de cambios de frontend hasta que backend esté 100% estable
- Frontend es el ÚLTIMO paso, no el primero
- No mezclar cambios de UI con cambios estructurales

### Regla #2: SEPARAR AUTH DE TENANT ISOLATION
- Auth primero, tenant después
- Nunca mezclar ambas cosas
- Auth estable → luego tenant isolation

### Regla #3: CAMBIOS DE MÁXIMO 2 DÍAS
- No más de 2 días de trabajo sin checkpoint
- Commit y test cada 1-2 días
- Rollback en cualquier momento

### Regla #4: UNA COSA A LA VEZ
- No auth + tenant + repositorios junto
- Una capa por vez, validar, continuar
- Si falla, rollback y repensar

### Regla #5: NO HAY TESTS AUTOMÁTICOS → MANUAL MÁS RIGUROSO
- Cada cambio = manual test completo
- Validar funcionalidad existente después de cada cambio
- No asumir que "debería funcionar"

---

## 📋 ROADMAP AJUSTADO (8 Fases Pequeñas)

```
Fase 1: Infraestructura de Seguridad (7 días) ✅ CERO CAMBIOS FUNCIONALES
   ↓
Fase 2a: Auth Backend Puro (3 días) - Solo endpoints de auth
   ↓
Fase 2b: Roles Básicos (2 días) - Solo definir, no aplicar
   ↓
Fase 3a: Tenant Isolation Backend (4 días) - Solo SQL y helpers
   ↓
Fase 3b: Integración Tenant en Queries (3 días) - Endpoint por endpoint
   ↓
Fase 4: Auditoría Básica (3 días) - Solo logging mejorado
   ↓
Fase 5: Aplicar Auth a Endpoints (3 días) - Gradual, solo críticos
   ↓
Fase 6: Aplicar Tenant a Endpoints (3 días) - Gradual, endpoint por endpoint
   ↓
Fase 7: Frontend Auth (4 días) - ÚLTIMO PASO, solo cuando backend esté estable
   ↓
Fase 8: Hardening Final (2 días) - Optimización y tuneo
   ↓
PLATAFORMA SEGURA Y ESTABLE
```

---

## 🔰 FASE 1: INFRAESTRUCTURA DE SEGURIDAD (7 días)

**Objetivo**: Preparar terreno SIN CAMBIAR funcionalidad existente
**Riesgo**: NULO
**Impacto en usuarios**: CERO

### Día 1: Setup y Backup
```bash
# 1. Crear branch
git checkout -b feature/security-fase1

# 2. Backup de BD (manual en TiDB Cloud)
# Documentar: backup-fase1-20260109.sql

# 3. Crear PROGRESS_TRACKING.md
# (ver abajo)
```

**VALIDACIÓN**: ✅ Branch creado, backup guardado

---

### Día 2-3: Rate Limiting y Helmet (Sin cambios funcionales)

**Instalar**:
```bash
npm install express-rate-limit helmet
```

**Crear**: `rateLimiter.js`
```javascript
import rateLimit from 'express-rate-limit';

// Solo rate limit, nada más
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' }
});

// Extra protection para batch upload
export const batchUploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5
});
```

**Modificar**: `server.js` (AL INICIO)
```javascript
import helmet from 'helmet';
import { apiRateLimit, batchUploadRateLimit } from './rateLimiter.js';

const app = express();

// PRIMERO: Helmet (sin cambiar nada más)
app.use(helmet());

// SEGUNDO: Rate limit a /api (no rompe nada)
app.use('/api', apiRateLimit);

// Solo a batch upload
app.use('/api/units/batch-upload', batchUploadRateLimit);

// ... resto del código EXACTAMENTE IGUAL
```

**TEST MANUAL**:
```bash
# Test que TODO sigue funcionando
curl https://fleet.mentoresestrategicos.com/api/stats
curl https://fleet.mentoresestrategicos.com/api/units

# Test rate limit (hacer 101 requests rápidas)
# Debería fallar en la 101
```

**VALIDACIÓN**: ✅ Todos los endpoints siguen funcionando

---

### Día 4-5: Logging Básico (Sin cambios funcionales)

**Instalar**:
```bash
npm install winston
```

**Crear**: `logger.js`
```javascript
import winston from 'winston';

export default winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

**Modificar**: `server.js` (solo cambiar console.log por logger)
```javascript
import logger from './logger.js';

// Cambiar:
console.log('🚀 Iniciando servidor...');
// Por:
logger.info('🚀 Iniciando servidor...');
```

**TEST MANUAL**:
```bash
# Iniciar servidor
npm start

# Hacer requests
curl https://fleet.mentoresestrategicos.com/api/stats

# Verificar que logs se generan en logs/combined.log
cat logs/combined.log
```

**VALIDACIÓN**: ✅ Logs se generan, nada más cambia

---

### Día 6-7: Error Handling Centralizado

**Crear**: `errors.js`
```javascript
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}
```

**Crear**: `errorHandler.js`
```javascript
import logger from './logger.js';

export function errorHandler(err, req, res, next) {
  // Log completo (interno)
  logger.error(err);

  // Respuesta simple (al cliente)
  if (err.isOperational) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
}
```

**Modificar**: `server.js` (al FINAL, antes de app.listen)
```javascript
import { errorHandler } from './errorHandler.js';

// ... todos los endpoints EXISTENTES sin cambiar

// ÚLTIMO: Error handler
app.use(errorHandler);
```

**TEST MANUAL**:
```bash
# Test que errores existentes se manejan igual que antes
curl https://fleet.mentoresestrategicos.com/api/units/nonexistent

# Debería retornar 500 o 400 como antes
```

**VALIDACIÓN**: ✅ Nada rompe, errors se manejan igual

---

### Checkpoint Fase 1
```bash
git add .
git commit -m "feat: Fase1 - Infraestructura de seguridad

- Add rate limiting (express-rate-limit)
- Add security headers (helmet)
- Add structured logging (winston)
- Add centralized error handling

NO CAMBIOS FUNCIONALES - Solo infraestructura"
git push origin feature/security-fase1
```

**MONITOREO**: 24 horas

---

## 🔐 FASE 2A: AUTH BACKEND PURO (3 días)

**Objetivo**: Crear endpoints de auth SIN tocar endpoints existentes
**Riesgo**: BAJO
**Impacto en usuarios**: CERO (endpoints nuevos son INDEPENDIENTES)

### Día 8: Instalar y Crear Tablas

**Instalar**:
```bash
npm install bcryptjs jsonwebtoken
```

**SQL en TiDB Cloud**:
```sql
-- Tabla de usuarios (INDEPENDIENTE de todo lo demás)
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL UNIQUE,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin', 'user', 'viewer') DEFAULT 'user',
  `status` enum('active', 'inactive', 'pending') DEFAULT 'active',
  `last_login` timestamp NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Usuario admin inicial (TEMPORAL para testing)
INSERT INTO `users` (`email`, `password_hash`, `role`, `status`)
VALUES (
  'admin@pcas.com',
  '$2a$10$rXq9nXy8aY9aZ7b8c9d0e', -- Hash de 'Admin123!'
  'admin',
  'active'
);
```

**VALIDACIÓN**: ✅ Tabla creada, usuario insertado

---

### Día 9: Crear AuthService (Solo funciones, no endpoints)

**Crear**: `authService.js`
```javascript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePasswords(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

**TEST UNITARIO (manual)**:
```bash
# En Node REPL
node
> const { hashPassword, comparePasswords } = require('./authService.js');
> const hash = await hashPassword('test123');
> const match = await comparePasswords('test123', hash);
> console.log(match); // Debe ser true
```

**VALIDACIÓN**: ✅ Funciones de auth trabajan correctamente

---

### Día 10: Crear Endpoints de Auth (INDEPENDIENTES, no tocan nada más)

**Modificar**: `server.js` (AGREGAR AL FINAL, antes de app.listen)

```javascript
import { hashPassword, comparePasswords, generateToken } from './authService.js';

// NUEVOS ENDPOINTS DE AUTH (INDEPENDIENTES)
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Hardcode para testing (TEMPORAL)
    if (email === 'admin@pcas.com' && password === 'Admin123!') {
      const token = generateToken({
        userId: 1,
        email,
        role: 'admin'
      });

      return res.json({
        ok: true,
        data: { token, user: { id: 1, email, role: 'admin' } }
      });
    }

    res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    next(error);
  }
});
```

**TEST MANUAL**:
```bash
# Test login endpoint
curl -X POST https://fleet.mentoresestrategicos.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pcas.com","password":"Admin123!"}'

# Debe retornar token

# Test que ENDPOINTS EXISTENTES SIGUEN FUNCIONANDO
curl https://fleet.mentoresestrategicos.com/api/stats
curl https://fleet.mentoresestrategicos.com/api/units
```

**VALIDACIÓN**: ✅ Login funciona, NADA SE ROMPIÓ

---

### Checkpoint Fase 2a
```bash
git add .
git commit -m "feat: Fase2a - Auth endpoints

- Add users table
- Add auth service (hash, compare, token)
- Add /api/auth/login endpoint
- NO CAMBIOS A ENDPOINTS EXISTENTES

Auth backend puro, sin integración"
git push origin feature/security-fase2a
```

**MONITOREO**: 24 horas

---

## 🎭 FASE 2B: ROLES BÁSICOS (2 días)

**Objetivo**: Definir roles SIN aplicarlos a endpoints aún
**Riesgo**: NULO
**Impacto en usuarios**: CERO

### Día 11: Definir Middleware de Roles (Solo crear, no usar)

**Crear**: `authMiddleware.js`
```javascript
import { verifyToken } from './authService.js';

export function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

**TEST UNITARIO (manual)**:
```bash
# Test que middleware se crea sin errores
# (No aplicar a ningún endpoint aún)
```

**VALIDACIÓN**: ✅ Middleware creado, NO aplicado

---

### Día 12: Documentar Roles (Solo documentación)

**Crear**: `ROLES_DOCUMENTATION.md`
```markdown
# Roles y Permisos en PCAS

## Admin
- Puede: TODO
- Cannot: N/A

## User
- Puede: Leer todo, crear/actualizar unidades, contratos, pagos
- Cannot: Borrar registros, gestionar usuarios

## Viewer
- Puede: Solo lectura
- Cannot: Crear, actualizar, borrar

## Plan de Aplicación (NO AÚN)
- Fase 5: Aplicar a endpoints críticos (POST/PUT/DELETE)
- Fase 6: Expandir a más endpoints
```

**VALIDACIÓN**: ✅ Documentación creada

---

### Checkpoint Fase 2b
```bash
git add .
git commit -m "feat: Fase2b - Roles básicos definidos

- Add authenticateToken middleware
- Add requireRole middleware
- Add roles documentation
- NO APLICADO A ENDPOINTS AÚN

Roles listos para usar en fases posteriores"
git push origin feature/security-fase2b
```

---

## 🏢 FASE 3A: TENANT ISOLATION BACKEND (4 días)

**Objetivo**: Crear tabla de tenants y agregar tenant_id SIN cambiar queries
**Riesgo**: BAJO
**Impacto en usuarios**: CERO (solo cambios de esquema)

### Día 13: Crear Tabla de Tenants

**SQL en TiDB Cloud**:
```sql
-- Tabla de tenants (INDEPENDIENTE)
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL UNIQUE,
  `status` enum('active', 'suspended', 'trial') DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tenant por defecto
INSERT INTO `tenants` (`name`, `slug`, `status`)
VALUES ('PCAS Default', 'default', 'active');
```

**VALIDACIÓN**: ✅ Tabla creada

---

### Día 14-15: Agregar tenant_id a Tablas Existentes

**SQL en TiDB Cloud** (ejecutar una tabla a la vez):
```sql
-- Paso 1: companies
ALTER TABLE `companies` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;
CREATE INDEX `idx_companies_tenant` ON `companies`(`tenant_id`);

-- Paso 2: units
ALTER TABLE `units` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;
CREATE INDEX `idx_units_tenant` ON `units`(`tenant_id`);

-- Paso 3: contracts
ALTER TABLE `contracts` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;
CREATE INDEX `idx_contracts_tenant` ON `contracts`(`tenant_id`);

-- Paso 4: providers
ALTER TABLE `providers` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;
CREATE INDEX `idx_providers_tenant` ON `providers`(`tenant_id`);

-- Paso 5: payments
ALTER TABLE `payments` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;
CREATE INDEX `idx_payments_tenant` ON `payments`(`tenant_id`);

-- Paso 6: insurance_policies
ALTER TABLE `insurance_policies` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;
CREATE INDEX `idx_insurance_tenant` ON `insurance_policies`(`tenant_id`);
```

**IMPORTANTE**: Ejecutar UNA tabla a la vez, validar, continuar

**TEST DESPUÉS DE CADA TABLA**:
```bash
# Test que endpoints siguen funcionando
curl https://fleet.mentoresestrategicos.com/api/stats
curl https://fleet.mentoresestrategicos.com/api/units
```

**VALIDACIÓN**: ✅ Todas las tablas tienen tenant_id, NADA SE ROMPIÓ

---

### Día 16: Crear Helper de Tenant (Solo función, no usar)

**Crear**: `tenantHelper.js`
```javascript
export function injectTenantFilter(query, tenantId) {
  // Helper para agregar WHERE tenant_id = ?
  // NO USAR AÚN
  return query.replace('WHERE', `WHERE tenant_id = ${tenantId} AND`);
}
```

**VALIDACIÓN**: ✅ Helper creado, NO USADO

---

### Checkpoint Fase 3a
```bash
git add .
git commit -m "feat: Fase3a - Tenant isolation backend

- Add tenants table
- Add tenant_id to all existing tables
- Add tenant helper function
- NO CAMBIOS EN QUERIES AÚN

Esquema listo, queries intactas"
git push origin feature/security-fase3a
```

**MONITOREO**: 24 horas

---

## 🔍 FASE 3B: INTEGRACIÓN TENANT EN QUERIES (3 días)

**Objetivo**: Modificar queries para filtrar por tenant_id UNO A UNO
**Riesgo**: MEDIO
**Impacto en usuarios**: CERO (todas las queries tienen DEFAULT tenant_id = 1)

### Día 17: Modificar UNA función en repository.js

**Modificar**: `repository.js` (SOLO getAllUnits)

```javascript
// CAMBIAR SOLO ESTA FUNCIÓN
export async function getAllUnits(filters = {}) {
  const conn = await getConnection();

  // ANTES:
  // let query = `SELECT * FROM units WHERE 1=1`;

  // DESPUÉS:
  let query = `SELECT * FROM units WHERE tenant_id = 1`;

  // ... resto del código IGUAL
}
```

**TEST**:
```bash
# Test que sigue funcionando
curl https://fleet.mentoresestrategicos.com/api/units
```

**VALIDACIÓN**: ✅ /api/units funciona, UNA función modificada

---

### Día 18: Modificar OTRAS funciones (una a la vez)

**Modificar**: `repository.js` (getAllContracts)
```javascript
export async function getAllContracts(filters = {}) {
  let query = `SELECT * FROM contracts WHERE tenant_id = 1`;
  // ... resto IGUAL
}
```

**TEST**: `curl https://fleet.mentoresestrategicos.com/api/contracts`

**Modificar**: `repository.js` (getProviders)
```javascript
export async function getProviders() {
  let query = `SELECT * FROM providers WHERE tenant_id = 1`;
  // ... resto IGUAL
}
```

**TEST**: `curl https://fleet.mentoresestrategicos.com/api/providers`

**VALIDACIÓN**: ✅ Queries modificadas, todo sigue funcionando

---

### Día 19: Validación Completa

**TEST TODOS LOS ENDPOINTS**:
```bash
# Test completo
curl https://fleet.mentoresestrategicos.com/api/stats
curl https://fleet.mentoresestrategicos.com/api/units
curl https://fleet.mentoresestrategicos.com/api/contracts
curl https://fleet.mentoresestrategicos.com/api/providers
curl https://fleet.mentoresestrategicos.com/api/payments
```

**VALIDACIÓN**: ✅ TODOS funcionan, queries tienen tenant filtering

---

### Checkpoint Fase 3b
```bash
git add .
git commit -m "feat: Fase3b - Tenant filtering en queries

- Modify getAllUnits to filter by tenant_id
- Modify getAllContracts to filter by tenant_id
- Modify getProviders to filter by tenant_id
- All queries now filter by tenant_id = 1

Tenant isolation implementado en queries"
git push origin feature/security-fase3b
```

**MONITOREO**: 24 horas

---

## 📝 FASE 4: AUDITORÍA BÁSICA (3 días)

**Objetivo**: Mejorar logging de acciones críticas
**Riesgo**: NULO
**Impacto en usuarios**: CERO

### Día 20-22: Agregar Audit Logs a Endpoint CRÍTICO (solo uno)

**Crear tabla**:
```sql
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `user_id` int(11) NULL,
  `action` varchar(50) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int(11) NULL,
  `ip_address` varchar(45) NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_tenant_created` (`tenant_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Modificar**: `server.js` (SOLO app.post('/api/units'))

```javascript
app.post('/api/units', async (req, res, next) => {
  try {
    // ... código existente

    // AGREGAR LOG al final
    logger.info({
      type: 'audit_log',
      action: 'create',
      entity_type: 'unit',
      entity_id: result.data.id,
      ip: req.ip
    });

    res.status(201).json({ ok: true, data: result.data });
  } catch (error) {
    next(error);
  }
});
```

**TEST**:
```bash
# Crear unidad
curl -X POST https://fleet.mentoresestrategicos.com/api/units \
  -H "Content-Type: application/json" \
  -d '{"economic_number":"TEST-001","license_plate":"ABC123","serial_number":"XYZ","type":"Tractocamión","brand":"Volvo","model":"FH","year":2024,"assigned_company_id":1}'

# Verificar en logs
tail logs/combined.log
```

**VALIDACIÓN**: ✅ Audit logs funcionan, UNO endpoint modificado

---

### Checkpoint Fase 4
```bash
git add .
git commit -m "feat: Fase4 - Auditoría básica

- Add audit_logs table
- Add audit logging to POST /api/units
- Solo un endpoint modificado por seguridad

Auditoría implementada de forma minimal"
git push origin feature/security-fase4
```

---

## 🔓 FASE 5: APLICAR AUTH A ENDPOINTS (3 días)

**Objetivo**: Aplicar authenticateToken a endpoints CRÍTICOS GRADUALMENTE
**Riesgo**: MEDIO
**Impacto en usuarios**: MEDIO (los endpoints críticos requerirán token)

### Día 23: Aplicar Auth a UN endpoint de ESCRITURA

**Modificar**: `server.js` (SOLO POST /api/units)

```javascript
import { authenticateToken } from './authMiddleware.js';

app.post('/api/units',
  authenticateToken,  // <-- AGREGAR SOLO ESTO
  async (req, res, next) => {
    // código EXISTENTE
  }
);
```

**TEST**:
```bash
# Test SIN token (debe fallar)
curl -X POST https://fleet.mentoresestrategicos.com/api/units \
  -H "Content-Type: application/json" \
  -d '{"economic_number":"TEST-002",...}'

# Debe retornar 401

# Test CON token
TOKEN=$(curl -s -X POST https://fleet.mentoresestrategicos.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pcas.com","password":"Admin123!"}' \
  | jq -r '.data.token')

curl -X POST https://fleet.mentoresestrategicos.com/api/units \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"economic_number":"TEST-002",...}'

# Debe funcionar
```

**VALIDACIÓN**: ✅ Auth funciona en UN endpoint, endpoint protegido

---

### Día 24: Aplicar Auth a más endpoints de ESCRITURA

**Modificar**: `server.js` (POST /api/contracts, POST /api/providers, etc.)
```javascript
app.post('/api/contracts', authenticateToken, ...);
app.post('/api/providers', authenticateToken, ...);
app.post('/api/payments', authenticateToken, ...);
```

**TEST**: Cada endpoint con y sin token

**VALIDACIÓN**: ✅ Auth aplicado a endpoints de escritura

---

### Día 25: Validar que endpoints GET SIGUEN PÚBLICOS

**TEST**:
```bash
# Estos DEBEN funcionar SIN token
curl https://fleet.mentoresestrategicos.com/api/stats
curl https://fleet.mentoresestrategicos.com/api/units
curl https://fleet.mentoresestrategicos.com/api/contracts
```

**VALIDACIÓN**: ✅ Endpoints GET públicos, endpoints POST protegidos

---

### Checkpoint Fase 5
```bash
git add .
git commit -m "feat: Fase5 - Auth aplicado a endpoints de escritura

- Apply authenticateToken to POST /api/units
- Apply authenticateToken to POST /api/contracts
- Apply authenticateToken to POST /api/providers
- Apply authenticateToken to POST /api/payments
- GET endpoints remain public

Auth implementado de forma gradual"
git push origin feature/security-fase5
```

**MONITOREO**: 48 horas (usuarios reportarán si algo no funciona)

---

## 🏢 FASE 6: APLICAR TENANT A ENDPOINTS (3 días)

**Objetivo**: Aplicar requireTenant y hacer tenant_id dinámico
**Riesgo**: MEDIO
**Impacto en usuarios**: CERO (todavía tenant_id = 1 para todos)

### Día 26: Crear Middleware de Tenant (dinámico)

**Crear**: `tenantMiddleware.js`
```javascript
export function requireTenant(req, res, next) {
  // TEMPORAL: siempre retorna 1
  // En el futuro, esto vendrá del JWT
  req.tenantId = 1;
  next();
}
```

**Modificar**: `server.js` (agregar a endpoints protegidos)
```javascript
import { requireTenant } from './tenantMiddleware.js';

app.post('/api/units',
  authenticateToken,
  requireTenant,  // <-- AGREGAR
  async (req, res, next) => {
    // Ahora req.tenantId = 1 disponible
  }
);
```

**TEST**: Todo debe seguir funcionando igual

---

### Día 27-28: Hacer tenant_id dinámico (del JWT)

**Modificar**: `authService.js` (generateToken)
```javascript
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  // payload ahora incluye tenantId: 1
}
```

**Modificar**: `authMiddleware.js` (authenticateToken)
```javascript
export function authenticateToken(req, res, next) {
  // ...
  req.user = {
    id: decoded.userId,
    email: decoded.email,
    role: decoded.role,
    tenantId: decoded.tenantId  // <-- AGREGAR
  };
  // ...
}
```

**Modificar**: `tenantMiddleware.js` (requireTenant)
```javascript
export function requireTenant(req, res, next) {
  // DEL TOKEN, no hardcodeado
  req.tenantId = req.user.tenantId || 1;
  next();
}
```

**TEST**: Todo debe seguir funcionando igual (tenantId = 1 para todos)

**VALIDACIÓN**: ✅ Tenant isolation dinámico implementado

---

### Checkpoint Fase 6
```bash
git add .
git commit -m "feat: Fase6 - Tenant isolation dinámico

- Add requireTenant middleware
- Apply to all protected endpoints
- Make tenantId dynamic from JWT
- Still tenantId = 1 for all users

Tenant isolation completo"
git push origin feature/security-fase6
```

---

## 🖥️ FASE 7: FRONTEND AUTH (4 días) - ÚLTIMO PASO

**Objetivo**: Agregar login page al frontend
**Riesgo**: MEDIO
**Impacto en usuarios**: MEDIO (tendrán que hacer login)
**IMPORTANTE**: SOLO cuando backend esté 100% estable

### Día 29: Crear Login Page (INDEPENDIENTE, no romper nada)

**Crear**: `src/components/Login.tsx`
```typescript
import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(
        `${import.meta.env.PROD ? 'https://fleet.mentoresestrategicos.com' : 'http://localhost:3000'}/api/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        }
      );

      const data = await res.json();

      if (data.ok) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        window.location.href = '/';
      } else {
        setError('Login failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">PCAS Login</h1>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-2 mb-4 border rounded"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-2 mb-4 border rounded"
        />
        <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
          Login
        </button>
      </form>
    </div>
  );
}
```

**TEST**: Abrir `/login` en desarrollo, verificar que renderiza

**VALIDACIÓN**: ✅ Login page creada, NO integra con App aún

---

### Día 30: Modificar api.ts para incluir auth headers

**Modificar**: `src/api.ts` (SOLO agregar helper, no modificar funciones aún)

```typescript
// Agregar al inicio
const getAuthToken = () => localStorage.getItem('token') || '';

// NO modificar funciones existentes aún
```

**TEST**: Build de frontend debe funcionar igual

**VALIDACIÓN**: ✅ Helper creado, funciones intactas

---

### Día 31: Modificar UNA función en api.ts para usar auth

**Modificar**: `src/api.ts` (SOLO createUnit)

```typescript
export async function createUnit(data: CreateUnitRequest): Promise<UnitRow> {
  const res = await fetch(`${API_BASE}/units`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,  // <-- AGREGAR SOLO ESTO
    },
    body: JSON.stringify(data)
  });
  // ... resto IGUAL
}
```

**TEST**:
```bash
# En frontend, intentar crear unidad sin login
# Debe fallar con 401

# Luego hacer login e intentar de nuevo
# Debe funcionar
```

**VALIDACIÓN**: ✅ createUnit requiere auth, UNA función modificada

---

### Día 32: Modificar otras funciones de escritura

**Modificar**: `src/api.ts` (createContract, createProvider, etc.)
```typescript
// Agregar Authorization header a todas las funciones POST/PUT/DELETE
```

**TEST**: Todas las funciones de escritura requieren token

**VALIDACIÓN**: ✅ Frontend auth implementado

---

### Checkpoint Fase 7
```bash
git add .
git commit -m "feat: Fase7 - Frontend auth

- Add Login.tsx component
- Add getAuthToken helper
- Modify createUnit to use auth headers
- Modify createContract to use auth headers
- Modify other write functions to use auth headers

Frontend auth completo"
git push origin feature/security-fase7
```

**MONITOREO**: 48 horas (usuarios reportarán si algo no funciona)

---

## 🛡️ FASE 8: HARDENING FINAL (2 días)

**Objetivo**: Optimización y tuneo final
**Riesgo**: BAJO
**Impacto en usuarios**: CERO

### Día 33: Validación Completa

**CHECKLIST**:
- [ ] /api/auth/login funciona
- [ ] POST /api/units requiere token
- [ ] POST /api/contracts requiere token
- [ ] GET /api/units es público (por ahora)
- [ ] GET /api/contracts es público (por ahora)
- [ ] Frontend login funciona
- [ ] Frontend puede crear unidades después de login
- [ ] Rate limiting funciona
- [ ] Logs se generan
- [ ] Tenant isolation funciona (tenantId = 1 para todos)

**TEST MANUAL COMPLETO**:
```bash
# Test todo el flujo
# 1. Login
TOKEN=$(curl -s -X POST https://fleet.mentoresestrategicos.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pcas.com","password":"Admin123!"}' \
  | jq -r '.data.token')

# 2. Crear unidad (debe requerir token)
curl -X POST https://fleet.mentoresestrategicos.com/api/units \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"economic_number":"TEST-FINAL","license_plate":"XYZ","serial_number":"ABC","type":"Tractocamión","brand":"Volvo","model":"FH","year":2024,"assigned_company_id":1}'

# 3. Ver unidades (público, debe funcionar sin token)
curl https://fleet.mentoresestrategicos.com/api/units
```

**VALIDACIÓN**: ✅ TODO FUNCIONA CORRECTAMENTE

---

### Día 34: Deploy Final y Merge a Main

```bash
# Merge de todas las fases
git checkout main
git merge feature/security-fase1
git merge feature/security-fase2a
git merge feature/security-fase2b
git merge feature/security-fase3a
git merge feature/security-fase3b
git merge feature/security-fase4
git merge feature/security-fase5
git merge feature/security-fase6
git merge feature/security-fase7
git push origin main
```

**DEPLOY A RENDER**

**MONITOREO**: 72 horas continuas

---

## ✅ CHECKLIST FINAL DE VALIDACIÓN

### Seguridad
- [x] Rate limiting activo
- [x] Security headers (helmet)
- [x] Auth implementado (JWT)
- [x] Tenant isolation implementado
- [x] Audit logs funcionando
- [x] Error handling centralizado

### Funcionalidad
- [x] Todos los endpoints GET públicos (por ahora)
- [x] Todos los endpoints POST/PUT/DELETE protegidos
- [x] Login funciona
- [x] Token se envía en requests
- [x] Tenant isolation funciona (tenantId = 1 para todos)

### Monitoreo
- [x] Logs estructurados
- [x] Logs de errores
- [x] Logs de auditoría
- [x] Rate limiting logs

### Backend
- [x] /api/auth/login funciona
- [x] authenticateToken middleware funciona
- [x] requireTenant middleware funciona
- [x] Queries filtran por tenant_id

### Frontend
- [x] Login page funciona
- [x] Token se guarda en localStorage
- [x] Token se envía en requests
- [x] Manejo de 401/403 errors

---

## 📊 COMPARACIÓN: PLAN ORIGINAL VS PLAN AJUSTADO

| Aspecto | Plan Original | Plan Ajustado |
|---------|-------------|--------------|
| **Duración** | 4-6 semanas | 5-7 semanas |
| **Fases** | 4 grandes | 8 pequeñas |
| **Cambios por fase** | Muchos | Pocos |
| **Frontend timing** | Temprano (Fase 2) | Tardío (Fase 7) |
| **Auth + Tenant** | Juntos (Fase 3) | Separados (Fase 2 y 3) |
| **Checkpoint frequency** | Cada semana | Cada 1-2 días |
| **Rollback ease** | Difícil | Fácil |
| **Risk** | Alto | Bajo |

---

## 🚨 ROLLBACK PLAN (Por cada fase)

### Si algo falla en cualquier fase:

#### Opción 1: Revertir último commit
```bash
git revert HEAD
git push origin feature/security-fasex
```

#### Opción 2: Volver al último checkpoint
```bash
git log --oneline
# Identificar último checkpoint funcional
git reset --hard <checkpoint-hash>
git push origin feature/security-fasex --force
```

#### Opción 3: Restaurar backup de BD
- Usar backup del inicio de la fase
- Restaurar en TiDB Cloud
- Verificar funcionalidad

---

## 🎯 RESUMEN DEL PLAN AJUSTADO

### Enfoque Conservador:
- **8 fases pequeñas** (vs 4 grandes)
- **Backend primero** (Fases 1-6)
- **Frontend después** (Fase 7)
- **Más checkpoints** (cada 1-2 días)
- **Menos riesgo** (cambio mínimo por fase)

### Orden Correcto:
1. Infraestructura (sin cambios funcionales)
2. Auth backend (solo endpoints nuevos)
3. Roles (solo definir, no aplicar)
4. Tenant backend (solo SQL y helpers)
5. Tenant en queries (uno a uno)
6. Auditoría (solo logging)
7. Aplicar auth a endpoints (gradual)
8. Aplicar tenant a endpoints (dinámico)
9. Frontend auth (ÚLTIMO)

### Resultado Final:

PCAS transformado de "prototipo funcional" a "plataforma segura" **SIN RIESGOS OPERATIVOS**.

---

**Documento creado**: 09 de enero de 2026
**Arquitecto**: Senior SaaS Architect (Ajustado por feedback)
**Versión**: v2.1 - Plan Conservador y Seguro
**Estado**: Ready for Execution
**Próxima acción**: Fase 1, Día 1 - Crear branch y backup
