# 🚀 Plan de Acción - Evolución Controlada de PCAS

**Versión**: v2.0 - Plan de Implementación
**Fecha**: 09 de enero de 2026
**Objetivo**: Evolucionar PCAS a nivel de seguridad empresarial SIN romper funcionalidad existente
**Enfoque**: Pasos pequeños, validados, con rollback en cada fase
**Estimado**: 4-6 semanas (progresivo, sin parar operación)

---

## 🎯 PRINCIPIOS DE IMPLEMENTACIÓN

### Regla #1: NO ROMPER NADA DE LO QUE YA FUNCIONA
- Cada cambio es reversible
- Cada paso debe ser validado antes del siguiente
- Si algo falla, rollback inmediato
- Siempre mantén una versión funcionando

### Regla #2: PASOS PEQUEÑOS Y VALIDADOS
- Cambios de máximo 1 día de trabajo
- Testing automático después de cada cambio
- Deploy solo después de pasar tests
- Monitoreo durante 24h post-deploy

### Regla #3: COMUNICACIÓN CLARA
- Documentar cada cambio
- Loguear cada acción
- Mantener checklist actualizado
- Poder explicar qué hizo y por qué

---

## 📋 ROADMAP DE IMPLEMENTACIÓN (4 Fases)

```
Fase 1: Preparación y Seguridad Básica (1 semana)
   ↓
Fase 2: Autenticación y Autorización (2 semanas)
   ↓
Fase 3: Aislamiento de Datos y Auditoría (1.5 semanas)
   ↓
Fase 4: Hardening y Monitoreo (1.5 semanas)
   ↓
PLATAFORMA SEGURA Y ESCALABLE
```

---

## 🔰 FASE 1: PREPARACIÓN Y SEGURIDAD BÁSICA (1 semana)

**Objetivo**: Preparar terreno sin tocar funcionalidad existente

### Día 1: Setup de Desarrollo Seguro

#### Paso 1.1: Crear branch de desarrollo
```bash
cd C:\Users\desib\Desktop\app_pcas
git checkout -b feature/security-phase1
git status
```

#### Paso 1.2: Backup de base de datos actual
```bash
# Conectar a TiDB Cloud y hacer backup manual
# Documentar fecha y hora del backup
# Guardar backup en ubicación segura
```

#### Paso 1.3: Crear archivo de tracking
**Crear**: `PROGRESS_TRACKING.md`

```markdown
# 📊 Progreso de Implementación de Seguridad

## Fase 1: Preparación
- [x] Branch creado
- [ ] Backup de BD
- [ ] Variables de entorno seguras
- [ ] Testing setup

## Fase 2: Autenticación
- [ ] JWT implementado
- [ ] Login funcional
- [ ] Roles creados

## Fase 3: Aislamiento
- [ ] tenant_id en tablas
- [ ] Middleware de tenant

## Fase 4: Hardening
- [ ] Rate limiting
- [ ] Audit logs
```

---

### Día 2: Variables de Entorno y Configuración

#### Paso 2.1: Crear .env.example (solo variables, sin valores reales)

**Crear archivo**: `.env.example`

```env
# Database (TiDB Cloud)
DB_HOST=tidb-cloud-host
DB_PORT=4000
DB_USER=your-tidb-user
DB_PASSWORD=your-tidb-password
DB_NAME=fleet_db

# JWT Security
JWT_SECRET=generate-strong-random-string-min-32-chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=production
RENDER=true

# Security
ALLOWED_ORIGINS=https://fleet.mentoresestrategicos.com,http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Paso 2.2: Validar que .env exista y tenga valores correctos

**Comando para verificar**:
```bash
node -e "console.log('DB_HOST:', process.env.DB_HOST)"
# Debe mostrar valor o undefined si no existe
```

#### Paso 2.3: Test que todo sigue funcionando

```bash
# Iniciar servidor
npm start

# Test endpoints existentes
curl https://fleet.mentoresestrategicos.com/api/stats
curl https://fleet.mentoresestrategicos.com/api/units
```

**VALIDACIÓN**: ✅ Si todos los endpoints retornan 200 OK, continuar

---

### Día 3: Rate Limiting (PRIMERA CAPA DE SEGURIDAD)

#### Paso 3.1: Instalar dependencias

```bash
cd C:\Users\desib\Desktop\app_pcas
npm install express-rate-limit helmet
npm install --save-dev @types/express-rate-limit
```

#### Paso 3.2: Crear middleware de rate limiting

**Crear archivo**: `rateLimiter.js`

```javascript
import rateLimit from 'express-rate-limit';

// Rate limiting general (por IP)
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting estricto para batch upload
export const batchUploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // máximo 5 uploads por hora
  message: {
    error: 'Too many bulk uploads. Please wait 1 hour before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

#### Paso 3.3: Agregar Helmet.js (security headers)

**Modificar archivo**: `server.js` (agregar al inicio, después de imports)

```javascript
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
// ... otros imports

const app = express();

// 🔒 Security Headers (PRIMERO, antes de todo)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(express.json());
// ... resto del código
```

#### Paso 3.4: Agregar rate limiting a endpoints críticos

**Modificar archivo**: `server.js`

```javascript
import { generalRateLimit, batchUploadRateLimit } from './rateLimiter.js';

// Aplicar rate limiting general a toda la API
app.use('/api', generalRateLimit);

// Aplicar rate limit estricto a batch upload
app.post('/api/units/batch-upload',
  batchUploadRateLimit,
  uploadExcel.single('file'),
  async (req, res) => {
    // ... código existente
  }
);
```

#### Paso 3.5: Test de rate limiting

```bash
# Test que funcionan normalmente (primeras 100 requests)
for i in {1..10}; do
  curl https://fleet.mentoresestrategicos.com/api/stats
done

# Deberían funcionar todas
```

**VALIDACIÓN**: ✅ Si primeras requests funcionan y luego bloquea, continuar

---

### Día 4: Logging Básico

#### Paso 4.1: Instalar Winston (logger estructurado)

```bash
npm install winston
npm install --save-dev @types/winston
```

#### Paso 4.2: Crear configuración de logger

**Crear archivo**: `logger.js`

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'pcas-backend' },
  transports: [
    // Escribir todos los logs con nivel 'error' y menos en error.log
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Escribir todos los logs en combined.log
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// En desarrollo, también loguear a console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export default logger;
```

#### Paso 4.3: Crear middleware de logging

**Crear archivo**: `requestLogger.js`

```javascript
import logger from './logger.js';

export function requestLogger(req, res, next) {
  const start = Date.now();

  // Log al inicio del request
  logger.info({
    type: 'request_start',
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Override res.json para loguear respuesta
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;

    logger.info({
      type: 'request_end',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: duration,
      ip: req.ip
    });

    return originalJson.call(this, data);
  };

  next();
}
```

#### Paso 4.4: Integrar logger en server.js

**Modificar archivo**: `server.js`

```javascript
import logger from './logger.js';
import { requestLogger } from './requestLogger.js';

// Reemplazar console.log con logger
logger.info('🚀 Iniciando servidor...');
logger.info('📡 DB HOST:', process.env.DB_HOST || 'localhost (por defecto)');
logger.info('🗄️  DB NAME:', process.env.DB_NAME || 'fleet_db');

// Agregar middleware de logging (después de helmet, antes de express.json)
app.use(requestLogger);

// Reemplazar console.error con logger.error en try-catch blocks
// Ejemplo:
try {
  // ... código
} catch (error) {
  logger.error('Error en /api/units:', error);
  res.status(500).json({ error: 'Internal server error' });
}
```

**VALIDACIÓN**: ✅ Si logs se generan en `logs/combined.log`, continuar

---

### Día 5: Error Handling Centralizado

#### Paso 5.1: Crear clases de error personalizadas

**Crear archivo**: `errors.js`

```javascript
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}
```

#### Paso 5.2: Crear middleware de error handling

**Crear archivo**: `errorHandler.js`

```javascript
import logger from './logger.js';

export function errorHandler(err, req, res, next) {
  // Log error completo
  logger.error({
    type: 'error',
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip
  });

  // Error operacional (esperado) vs error de programación
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  // Error no esperado
  res.status(500).json({
    error: 'Internal server error'
  });
}
```

#### Paso 5.3: Integrar en server.js

**Modificar archivo**: `server.js` (al final, antes de app.listen)

```javascript
import { errorHandler } from './errorHandler.js';

// ... todos los endpoints

// Error handler DEBE ser el último middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
});
```

**VALIDACIÓN**: ✅ Si errores se manejan correctamente, continuar

---

### Día 6: Testing y Validación de Fase 1

#### Paso 6.1: Crear test suite básico

**Crear archivo**: `tests/basic.test.js`

```javascript
import { describe, it, expect } from '@jest/globals';

describe('API Basic Functionality', () => {
  it('GET /api/stats should return 200', async () => {
    const res = await fetch('http://localhost:3000/api/stats');
    expect(res.status).toBe(200);
  });

  it('GET /api/units should return 200', async () => {
    const res = await fetch('http://localhost:3000/api/units');
    expect(res.status).toBe(200);
  });

  it('Rate limiting should block after 100 requests', async () => {
    // Test aquí
  });
});
```

#### Paso 6.2: Ejecutar tests

```bash
npm test
```

#### Paso 6.3: Manual testing checklist

- [ ] `/api/stats` retorna 200 OK
- [ ] `/api/units` retorna 200 OK
- [ ] `/api/contracts` retorna 200 OK
- [ ] `/api/providers` retorna 200 OK
- [ ] Rate limiting funciona
- [ ] Logs se generan en `logs/combined.log`
- [ ] Errors se manejan sin exponer stack traces
- [ ] Helmet headers están presentes

**VALIDACIÓN**: ✅ Si todo pasa, commit y merge

---

### Día 7: Deploy a Staging y Monitoreo

#### Paso 7.1: Commit de Fase 1

```bash
git add .
git commit -m "feat: Phase 1 - Basic security hardening

- Add rate limiting (express-rate-limit)
- Add security headers (helmet.js)
- Add structured logging (winston)
- Add centralized error handling
- Add request logging middleware
- Add test suite basic"
git push origin feature/security-phase1
```

#### Paso 7.2: Deploy a Render (staging si existe, sino production con cuidado)

#### Paso 7.3: Monitorear durante 24 horas

- [ ] Logs en Render
- [ ] Rate limiting logs
- [ ] Error logs
- [ ] Performance degradation?
- [ ] Users complaining?

**ROLLBACK**: Si algo falla, revertir commit inmediatamente

---

## 🔐 FASE 2: AUTENTICACIÓN Y AUTORIZACIÓN (2 semanas)

**Objetivo**: Implementar auth sin breaking changes

### Semana 2: Autenticación Básica

#### Día 8: Instalar dependencias de auth

```bash
npm install bcryptjs jsonwebtoken
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
```

#### Día 9: Crear tablas de usuarios en BD

**Ejecutar SQL en TiDB Cloud**:

```sql
-- Tabla de usuarios
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

-- Crear usuario admin inicial (password: Admin123!)
INSERT INTO `users` (`email`, `password_hash`, `role`, `status`)
VALUES (
  'admin@pcas.com',
  '$2a$10$rXq9nXy8aY9aZ7b8c9d0e', -- Reemplazar con hash real
  'admin',
  'active'
);
```

#### Día 10: Crear authService.js

**Crear archivo**: `authService.js`

```javascript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import logger from './logger.js';
import { UnauthorizedError, ValidationError } from './errors.js';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePasswords(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.error('Token verification failed:', error);
    throw new UnauthorizedError('Invalid or expired token');
  }
}
```

#### Día 11: Crear endpoints de auth

**Modificar archivo**: `server.js` (agregar antes de otros endpoints)

```javascript
import { hashPassword, comparePasswords, generateToken } from './authService.js';

// Registro (OPCIONAL - puede ser manual al inicio)
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { email, password, role = 'user' } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const passwordHash = await hashPassword(password);

    // Insertar en BD (implementar en repository.js)
    // const userId = await createUser({ email, password_hash: passwordHash, role });

    const token = generateToken({ userId: 1, email, role });

    res.status(201).json({
      ok: true,
      data: {
        token,
        user: { id: 1, email, role }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Buscar usuario en BD (implementar en repository.js)
    // const user = await getUserByEmail(email);

    // Temporal: hardcode para testing
    const user = {
      id: 1,
      email: 'admin@pcas.com',
      password_hash: '$2a$10$rXq9nXy8aY9aZ7b8c9d0e', // Hash de 'Admin123!'
      role: 'admin'
    };

    const passwordMatch = await comparePasswords(password, user.password_hash);

    if (!passwordMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    logger.info({
      type: 'auth_login',
      userId: user.id,
      email: user.email
    });

    res.json({
      ok: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
});
```

#### Día 12: Crear middleware de autenticación

**Crear archivo**: `authMiddleware.js`

```javascript
import { verifyToken } from './authService.js';
import { UnauthorizedError } from './errors.js';
import logger from './logger.js';

export function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authorization token required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // Agregar usuario al request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}
```

#### Día 13: Agregar auth a endpoints EXISTENTES (GRADUAL)

**IMPORTANTE**: NO agregar auth a TODOS los endpoints de golpe

**Modificar archivo**: `server.js` (agregar middleware a endpoints críticos primero)

```javascript
import { authenticateToken, requireRole } from './authMiddleware.js';

// ENDPOINTS PÚBLICOS (sin auth por ahora)
app.get('/api/stats', ...); // Mantener público por ahora
app.get('/api/units', ...); // Mantener público por ahora

// ENDPOINTS ESCRITURA (con auth obligatorio)
app.post('/api/units',
  authenticateToken, // <-- AGREGAR SOLO ESTO
  requireRole('admin', 'user'), // <-- AGREGAR SOLO ESTO
  async (req, res, next) => {
    // Código existente
    // Ahora puede acceder req.user.id
    next();
  }
);

app.post('/api/contracts',
  authenticateToken,
  requireRole('admin', 'user'),
  async (req, res, next) => {
    // Código existente
    next();
  }
);
```

#### Día 14: Test de autenticación

```bash
# Test login
curl -X POST https://fleet.mentoresestrategicos.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pcas.com","password":"Admin123!"}'

# Guardar token
TOKEN="token-desde-respuesta-anterior"

# Test endpoint protegido con token
curl https://fleet.mentoresestrategicos.com/api/units \
  -H "Authorization: Bearer $TOKEN"
```

**VALIDACIÓN**: ✅ Si login funciona y token protege endpoints, continuar

---

### Semana 3: Completar Autorización

#### Día 15: Agregar auth a más endpoints (gradual)

- [ ] `POST /api/contracts` - auth obligatorio
- [ ] `PUT /api/contracts/:id` - auth obligatorio
- [ ] `DELETE /api/contracts/:id` - auth obligatorio (solo admin)
- [ ] `POST /api/providers` - auth obligatorio
- [ ] `PUT /api/providers/:id` - auth obligatorio

**IMPORTANTE**: Mantener endpoints GET públicos por ahora

#### Día 16: Frontend - Crear Login Page

**Crear archivo**: `src/components/Login.tsx`

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${import.meta.env.PROD ? 'https://fleet.mentoresestrategicos.com' : 'http://localhost:3000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.ok) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        navigate('/');
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

#### Día 17: Frontend - Modificar api.ts para incluir auth

**Modificar archivo**: `src/api.ts`

```typescript
// Agregar al inicio
const getAuthToken = () => localStorage.getItem('token') || '';

export async function getStats(): Promise<StatsResponse> {
  const res = await fetch(`${API_BASE}/stats`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
  });
  // ... resto del código
}

export async function createUnit(data: CreateUnitRequest): Promise<UnitRow> {
  const res = await fetch(`${API_BASE}/units`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data)
  });
  // ... resto del código
}

// Aplicar a todos los endpoints de escritura
```

#### Día 18: Frontend - Agregar Logout

**Crear hook**: `src/useAuth.ts`

```typescript
import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return { user, token, logout };
}
```

#### Día 19: Testing completo de auth

- [ ] Login funciona
- [ ] Token se guarda en localStorage
- [ ] Token se envía en requests
- [ ] Logout funciona
- [ ] Endpoints protegidos requieren token
- [ ] Endpoints públicos siguen funcionando

#### Día 20-21: Deploy de Fase 2 y monitoreo

```bash
git add .
git commit -m "feat: Phase 2 - Authentication and Authorization

- Add JWT authentication
- Add user login endpoint
- Add auth middleware
- Add role-based authorization
- Add login page in frontend
- Add auth headers to API calls"
git push origin feature/security-phase2
```

**MONITOREO**: 48 horas continuas

---

## 🏢 FASE 3: AISLAMIENTO DE DATOS Y AUDITORÍA (1.5 semanas)

### Día 22: Agregar tenant_id a tablas

**Ejecutar SQL en TiDB Cloud**:

```sql
-- Crear tabla de tenants
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL UNIQUE,
  `status` enum('active', 'suspended', 'trial') DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar tenant por defecto
INSERT INTO `tenants` (`name`, `slug`, `status`)
VALUES ('PCAS Default', 'default', 'active');

-- Agregar tenant_id a tablas existentes
ALTER TABLE `companies` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;
ALTER TABLE `units` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;
ALTER TABLE `contracts` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;
ALTER TABLE `providers` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;
ALTER TABLE `payments` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;
ALTER TABLE `insurance_policies` ADD COLUMN `tenant_id` int(11) NOT NULL DEFAULT 1;

-- Crear índices
CREATE INDEX `idx_companies_tenant` ON `companies`(`tenant_id`);
CREATE INDEX `idx_units_tenant` ON `units`(`tenant_id`);
CREATE INDEX `idx_contracts_tenant` ON `contracts`(`tenant_id`);
CREATE INDEX `idx_providers_tenant` ON `providers`(`tenant_id`);
CREATE INDEX `idx_payments_tenant` ON `payments`(`tenant_id`);
```

### Día 23: Crear middleware de tenant isolation

**Crear archivo**: `tenantMiddleware.js`

```javascript
import logger from './logger.js';
import { ForbiddenError } from './errors.js';

export function requireTenant(req, res, next) {
  // Por ahora, usar tenant_id del usuario (cuando exista)
  // Temporal: usar tenant por defecto
  req.tenantId = 1;

  logger.debug({
    type: 'tenant_isolation',
    tenantId: req.tenantId,
    userId: req.user?.id,
    path: req.path
  });

  next();
}

export function filterByTenant(query, tenantId) {
  // Este helper se usará en repository.js
  // para agregar WHERE tenant_id = ?
  return query + ' AND tenant_id = ?';
}
```

### Día 24: Modificar repository.js para tenant isolation

**Modificar funciones en repository.js**:

```javascript
// Ejemplo: getAllUnits
export async function getAllUnits(tenantId, filters = {}) {
  const conn = await getConnection();

  let query = `
    SELECT u.*, c.name as company_name, p.name as provider_name
    FROM units u
    LEFT JOIN companies c ON u.assigned_company_id = c.id
    LEFT JOIN providers p ON u.assigned_provider_id = p.id
    WHERE u.tenant_id = ?  <-- AGREGAR ESTO
  `;

  let params = [tenantId];  <-- AGREGAR ESTO

  // ... resto del código
}
```

### Día 25: Crear tabla de audit logs

**Ejecutar SQL**:

```sql
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `user_id` int(11) NULL,
  `action` varchar(50) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int(11) NULL,
  `old_value` text NULL,
  `new_value` text NULL,
  `ip_address` varchar(45) NULL,
  `user_agent` varchar(255) NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_tenant_created` (`tenant_id`, `created_at`),
  INDEX `idx_user_action` (`user_id`, `action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Día 26: Crear middleware de auditoría

**Crear archivo**: `auditMiddleware.js`

```javascript
import logger from './logger.js';

export function auditLog(action, entityType) {
  return async (req, res, next) => {
    // Capturar respuesta antes de enviarla
    const originalSend = res.send;
    let responseBody;

    res.send = function(data) {
      responseBody = data;
      originalSend.call(this, data);
    };

    // Log en la respuesta
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logger.info({
          type: 'audit_log',
          tenantId: req.tenantId,
          userId: req.user?.id,
          action,
          entityType,
          entityId: req.params.id || req.body.id,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          method: req.method,
          path: req.path,
          statusCode: res.statusCode
        });
      }
    });

    next();
  };
}
```

### Día 27-28: Integrar auditoría en endpoints

**Modificar archivo**: `server.js`

```javascript
import { auditLog } from './auditMiddleware.js';

app.post('/api/units',
  authenticateToken,
  requireTenant,
  auditLog('create', 'unit'),
  async (req, res, next) => {
    // ... código existente
  }
);

app.put('/api/units/:id',
  authenticateToken,
  requireTenant,
  auditLog('update', 'unit'),
  async (req, res, next) => {
    // ... código existente
  }
);
```

### Día 29: Testing de tenant isolation

- [ ] Tenant 1 no puede ver datos de Tenant 2
- [ ] Audit logs se generan para cada acción
- [ ] Audit logs tienen userId y tenantId correctos

### Día 30: Deploy de Fase 3

```bash
git add .
git commit -m "feat: Phase 3 - Tenant Isolation and Auditing

- Add tenants table
- Add tenant_id to all tables
- Add tenant isolation middleware
- Add audit logs table
- Add audit logging middleware
- Add tenant filtering in all queries"
git push origin feature/security-phase3
```

---

## 🛡️ FASE 4: HARDENING Y MONITOREO (1.5 semanas)

### Día 31-33: Validación mejorada

**Instalar Joi**:

```bash
npm install joi
```

**Crear archivo**: `validators.js`

```javascript
import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

export const createUnitSchema = Joi.object({
  economic_number: Joi.string().required(),
  license_plate: Joi.string().required(),
  serial_number: Joi.string().required(),
  type: Joi.string().valid('Tractocamión', 'Remolque', 'Dolly', 'Vehículo Ligero', 'Maquinaria', 'Otro').required(),
  brand: Joi.string().required(),
  model: Joi.string().required(),
  year: Joi.number().integer().min(2000).max(new Date().getFullYear() + 1).required(),
  assigned_company_id: Joi.number().integer().required()
});

export const createContractSchema = Joi.object({
  contract_number: Joi.string().required(),
  provider_id: Joi.number().integer().required(),
  unit_id: Joi.number().integer().required(),
  contracting_company_id: Joi.number().integer().required(),
  start_date: Joi.date().required(),
  end_date: Joi.date().greater(Joi.ref('start_date')).required(),
  term_months: Joi.number().integer().min(1).required(),
  monthly_rent: Joi.number().positive().max(1000000).required()
});
```

### Día 34-36: Integrar validación

**Crear middleware**: `validationMiddleware.js`

```javascript
import { ValidationError } from './errors.js';

export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const messages = error.details.map(detail => detail.message);
      return next(new ValidationError(messages.join(', ')));
    }

    req.body = value;
    next();
  };
}
```

**Usar en endpoints**:

```javascript
import { validate } from './validationMiddleware.js';
import { loginSchema, createUnitSchema } from './validators.js';

app.post('/api/auth/login',
  validate(loginSchema),
  async (req, res, next) => {
    // req.body ya está validado
  }
);

app.post('/api/units',
  authenticateToken,
  validate(createUnitSchema),
  async (req, res, next) => {
    // req.body ya está validado
  }
);
```

### Día 37: Paginación en endpoints

**Modificar repository.js**:

```javascript
export async function getAllUnits(tenantId, filters = {}) {
  const {
    page = 1,
    limit = 50,
    q,
    status,
    company
  } = filters;

  const offset = (page - 1) * limit;

  let query = `
    SELECT u.*, c.name as company_name, p.name as provider_name
    FROM units u
    LEFT JOIN companies c ON u.assigned_company_id = c.id
    LEFT JOIN providers p ON u.assigned_provider_id = p.id
    WHERE u.tenant_id = ?
    ${q ? 'AND (u.economic_number LIKE ? OR u.license_plate LIKE ?)' : ''}
    ${status ? 'AND u.status = ?' : ''}
    ${company ? 'AND u.assigned_company_id = ?' : ''}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `;

  let params = [tenantId];

  if (q) {
    const searchTerm = `%${q}%`;
    params.push(searchTerm, searchTerm);
  }
  if (status) params.push(status);
  if (company) params.push(company);

  params.push(limit, offset);

  // ... ejecutar query

  // Retornar también metadata de paginación
  return {
    data: rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count, // Implementar COUNT query separado
      totalPages: Math.ceil(count / limit)
    }
  };
}
```

### Día 38-40: Testing final y deploy

**Checklist final**:

- [ ] Autenticación funciona
- [ ] Autorización por roles funciona
- [ ] Tenant isolation funciona
- [ ] Audit logs se generan
- [ ] Rate limiting funciona
- [ ] Validación de inputs funciona
- [ ] Logging estructurado funciona
- [ ] Error handling funciona
- [ ] Todos los endpoints existentes siguen funcionando
- [ ] Endpoints nuevos de auth funcionan
- [ ] Login page en frontend funciona
- [ ] Logout funciona

**Deploy final**:

```bash
git checkout main
git merge feature/security-phase4
git push origin main
```

---

## 📊 CHECKLIST FINAL DE VALIDACIÓN

### Antes de abrir a usuarios externos

#### Seguridad
- [ ] Autenticación implementada y funcional
- [ ] Tokens JWT generados correctamente
- [ ] Passwords hasheados con bcrypt
- [ ] Roles (admin, user, viewer) definidos
- [ ] Middleware de autenticación en endpoints críticos
- [ ] Middleware de autorización en endpoints críticos
- [ ] Tenant isolation implementado en todas las queries
- [ ] CORS restringido a dominios específicos ✅
- [ ] Rate limiting activo
- [ ] Helmet.js implementado ✅

#### Auditoría
- [ ] Tabla de audit_logs creada
- [ ] Audit logging activo en endpoints de modificación
- [ ] Logs estructurados implementados ✅
- [ ] Logs de requests funcionan ✅
- [ ] Logs de errores funcionan ✅

#### Validación
- [ ] Schema validation con Joi en todos los endpoints
- [ ] Validación de business logic
- [ ] Sanitización de inputs

#### Backend
- [ ] /api/auth/login funcional
- [ ] Todos los endpoints GET públicos (por ahora)
- [ ] Todos los endpoints POST/PUT/DELETE protegidos
- [ ] Error handling centralizado ✅

#### Frontend
- [ ] Login page implementada
- [ ] Logout funcional
- [ ] Auth headers en llamadas a API
- [ ] Manejo de 401/403 errors

#### Testing
- [ ] Tests manuales completos
- [ ] Tests de tenant isolation
- [ ] Tests de rate limiting
- [ ] Tests de validación

#### Documentación
- [ ] Progreso documentado en PROGRESS_TRACKING.md
- [ ] Todos los commits tienen mensajes claros
- [ ] README actualizado con instrucciones de login

---

## 🚨 ROLLBACK PLAN

### Si algo falla en cualquier fase:

#### Opción 1: Revertir último commit
```bash
git revert HEAD
git push origin feature/security-phasex
```

#### Opción 2: Volver al último commit funcional
```bash
git log --oneline
# Identificar último commit funcional
git reset --hard <commit-hash>
git push origin feature/security-phasex --force
```

#### Opción 3: Restaurar backup de BD
- Usar backup del Día 1
- Restaurar en TiDB Cloud
- Verificar funcionalidad

---

## 📈 MÉTRICAS DE ÉXITO

### Fase 1: Preparación
- ✅ Rate limiting reduce requests excesivos
- ✅ Logs se generan sin errores
- ✅ Error handling funciona sin exponer stack traces

### Fase 2: Autenticación
- ✅ Login funciona correctamente
- ✅ Token protege endpoints críticos
- ✅ Endpoints públicos siguen accesibles
- ✅ No hay breaking changes

### Fase 3: Aislamiento
- ✅ Tenant isolation funciona correctamente
- ✅ Audit logs se generan para cada acción
- ✅ No hay data leaks entre tenants

### Fase 4: Hardening
- ✅ Validación de inputs funciona
- ✅ Rate limiting funciona para todos los endpoints
- ✅ Paginación mejora performance

---

## 🎯 RESUMEN DEL PLAN

### Cronograma Total: 4-6 semanas

- **Fase 1**: 1 semana - Preparación y seguridad básica
- **Fase 2**: 2 semanas - Autenticación y autorización
- **Fase 3**: 1.5 semanas - Aislamiento de datos y auditoría
- **Fase 4**: 1.5 semanas - Hardening y monitoreo

### Resultado Final

PCAS transformado de "prototipo funcional" a "plataforma SaaS segura" sin romper funcionalidad existente.

### Enfoque

- **PASOS PEQUEÑOS**: Cada día cambios validados
- **NO BREAKING CHANGES**: Todo lo que funciona sigue funcionando
- **ROLLBACK PLAN**: Siempre se puede volver atrás
- **TESTING CONTINUO**: Validar en cada paso

---

**Documento creado**: 09 de enero de 2026
**Arquitecto**: Senior SaaS Architect
**Versión**: v2.0 - Plan de Implementación Controlada
**Estado**: Ready for Execution
**Próxima acción**: Día 1 - Crear branch de desarrollo
