# 📊 Análisis de Seguridad y Madurez de Plataforma - PCAS Fleet Management (ACTUALIZADO)

**Fecha**: 09 de enero de 2026 (Actualizado)
**Versión**: v1.0.1
**Objetivo**: Evaluar estado actual de seguridad y preparación para modelo SaaS
**Alcance**: Solo lectura, sin modificaciones de código
**Cambios desde última revisión**: Implementación de CORS restrictivo y carga masiva

---

## 📊 DIAGNÓSTICO ACTUAL

### Nivel de Madurez: **Nivel 2 - Prototipo Funcional con Mejoras de Seguridad**

#### Dimensiones Evaluadas

| Dimensión | Estado Actual | Nivel (1-5) | Cambios Recientes | Observaciones |
|-----------|----------------|-------------|-------------------|---------------|
| **Autenticación** | Inexistente | 1/5 | Sin cambios | No hay login, no hay gestión de usuarios |
| **Autorización** | Inexistente | 1/5 | Sin cambios | No hay roles, no hay permisos |
| **Multi-tenancy** | No implementado | 1/5 | Sin cambios | Datos mezclados por `assigned_company_id` sin aislamiento real |
| **Auditoría** | Parcial | 2/5 | Sin cambios | Existen `created_at`/`updated_at` pero no logs de acciones |
| **Seguridad de Red** | Mejorado | 3/5 | ✅ CORS restrictivo | Ya NO usa `*`, restringido a dominio específico |
| **Validación de Inputs** | Básico | 2/5 | Sin cambios | Validaciones simples en server.js |
| **Gestión de Errores** | Básico | 2/5 | Sin cambios | Try-catch pero sin logs estructurados |
| **Escalabilidad** | Mejorado | 3/5 | ✅ Carga masiva | Nuevo endpoint de batch upload |
| **Documentación API** | Parcial | 2/5 | Sin cambios | Existe openapi_spec.yaml pero no está integrado |
| **Monitoreo** | Inexistente | 1/5 | Sin cambios | No hay métricas, alertas o dashboards |

### Estado General

**PCAS es una aplicación funcional con mejoras de seguridad perimetral pero NO está listo para:**
- ✅ Operar como producto SaaS comercial
- ✅ Manejar múltiples clientes empresariales simultáneamente
- ✅ Cumplir con estándares de seguridad empresarial (ISO 27001, SOC2)
- ✅ Proteger datos sensibles de clientes reales
- ✅ Escalar a cientos/miles de usuarios concurrentes

### Cambios Recientes Detectados (v1.0 → v1.0.1)

#### ✅ Mejoras Implementadas:

1. **CORS Restrictivo** (server.js:89-103)
   - **Antes**: `Access-Control-Allow-Origin: *` (CUALQUIER origen)
   - **Ahora**: Solo permite `https://fleet.mentoresestrategicos.com`
   - **Impacto**: Vulnerabilidad a CSRF mitigada parcialmente
   - **Estado**: ✅ Mejora de seguridad significativa

2. **Carga Masiva de Unidades** (bulkUploadService.js)
   - **Nueva feature**: Endpoint `/api/units/template` (descarga plantilla Excel)
   - **Nueva feature**: Endpoint `/api/units/batch-upload` (procesa Excel)
   - **Impacto**: Mejora UX para onboarding de clientes
   - **Estado**: ✅ Mejora funcional, pero sin seguridad

#### ❌ Mismos Riesgos Persistentes:

- **Sin autenticación**: Cualquiera puede acceder a la API
- **Sin autorización**: No hay roles ni permisos
- **Sin tenant isolation**: Posible fuga de datos entre empresas
- **Sin audit logs**: Imposible rastrear acciones
- **Sin rate limiting**: Vulnerable a DoS

---

## ⚠️ RIESGOS DETECTADOS (ACTUALIZADO)

### 🔴 Riesgos Críticos (Prioridad Alta)

#### 1. **Acceso No Autorizado Total** (SIN CAMBIOS)
- **Descripción**: Cualquier persona puede acceder a toda la API sin autenticación
- **Impacto**: Exposición completa de datos de todas las empresas
- **Evidencia**: No hay middleware de auth en server.js
- **Escenario**: Competidor podría ver todos los contratos, pagos y unidades
- **Estado**: ❌ SIN CORREGIR

#### 2. **Sin Aislamiento de Datos (Tenant Isolation)** (SIN CAMBIOS)
- **Descripción**: Filtrado por `assigned_company_id` en queries, sin enforcement
- **Impacto**: Un bug en query podría exponer datos de otras empresas
- **Evidencia**: repository.js usa WHERE clauses sin middleware de validación
- **Escenario**: Error en repository.js podría filtrar todas las unidades
- **Estado**: ❌ SIN CORREGIR

#### 3. **Sin Validación de Inputs en Frontend** (SIN CAMBIOS)
- **Descripción**: Frontend usa `import.meta.env.PROD` para cambiar API URL
- **Impacto**: Mal actor podría cambiar API_URL localmente
- **Evidencia**: src/api.ts:1-3
- **Escenario**: Usuario podría redirigir peticiones a su propio servidor
- **Estado**: ❌ SIN CORREGIR

#### 4. **Exposición de Errores Técnicos** (SIN CAMBIOS)
- **Descripción**: Errors se devuelven con detalles técnicos
- **Impacto**: Fuga de información interna (stack traces, rutas)
- **Evidencia**: server.js múltiples endpoints devuelven error.message
- **Escenario**: Atacante obtiene estructura interna del sistema
- **Estado**: ❌ SIN CORREGIR

#### 5. **Sin Rate Limiting** (SIN CAMBIOS)
- **Descripción**: API no limita peticiones por IP/usuario
- **Impacto**: DoS attacks, scraping masivo
- **Evidencia**: No existe middleware de rate limiting
- **Escenario**: Bots podrían hacer 10,000 peticiones/segundo y colapsar
- **Estado**: ❌ SIN CORREGIR

### 🟠 Riesgos Altos (Prioridad Media)

#### 6. **No Sanitización de Inputs** (SIN CAMBIOS)
- **Descripción**: Expresiones directas de req.body sin sanitización
- **Impacto**: SQL Injection potencial, XSS en reportes
- **Evidencia**: server.js múltiples endpoints usan req.body directamente
- **Escenario**: Input malicioso en `contract_number` podría inyectar SQL
- **Estado**: ❌ SIN CORREGIR

#### 7. **Upload de Archivos Sin Validación Completa** (SIN CAMBIOS)
- **Descripción**: Validación de MIME type pero no de contenido real
- **Impacto**: Subida de archivos maliciosos (PHP shells, etc.)
- **Evidencia**: server.js:55-65 solo valida mimetype
- **Escenario**: Mal actor renombra PHP shell como PDF y lo sube
- **Estado**: ❌ SIN CORREGIR

#### 8. **Sin Logging de Auditoría** (SIN CAMBIOS)
- **Descripción**: No hay registro de quién hizo qué y cuándo
- **Impacto**: Imposible investigar incidentes de seguridad
- **Evidencia**: No existen tablas de audit logs
- **Escenario**: Si alguien borra contratos, no hay forma de saber quién
- **Estado**: ❌ SIN CORREGIR

### 🟡 Riesgos Medios (Prioridad Baja)

#### 9. **Sin Validación de Fecha y Hora** (SIN CAMBIOS)
- **Descripción**: Dates aceptados sin validación de razonabilidad
- **Impacto**: Data corruption, reportes incorrectos
- **Evidencia**: server.js:330-338 valida fechas pero no límites lógicos
- **Escenario**: Contrato de 100 años en el futuro
- **Estado**: ❌ SIN CORREGIR

#### 10. **Sin Validación de Montos** (SIN CAMBIOS)
- **Descripción**: monthly_rent y amount aceptan valores negativos
- **Impacto**: Data corruption, reportes incorrectos
- **Evidencia**: server.js:345 valida monthly_rent > 0 pero no límites máximos
- **Escenario**: Contrato de $999,999,999.99
- **Estado**: ❌ SIN CORREGIR

#### 11. **Sin Manejo de Concurrencia** (SIN CAMBIOS)
- **Descripción**: Múltiples usuarios pueden modificar mismo recurso
- **Impacto**: Race conditions, pérdida de datos
- **Evidencia**: No hay versioning ni optimistic locking
- **Escenario**: Dos usuarios editan mismo contrato, último escritor gana
- **Estado**: ❌ SIN CORREGIR

#### 12. **Sin Paginación en Listados** (SIN CAMBIOS)
- **Descripción**: getAllUnits, getAllContracts no tienen paginación
- **Impacto**: Performance degradado, memory leaks
- **Evidencia**: repository.js funciones sin LIMIT/OFFSET
- **Escenario**: Cliente con 10,000 unidades colapsa la API
- **Estado**: ❌ SIN CORREGIR

### ✅ Riesgos Mitigados (Cambiado de Crítico a Resuelto)

#### ~~13. CORS Permisivo Sin Restricciones~~ ✅ **RESUELTO**
- **Antes**: `Access-Control-Allow-Origin: *`
- **Ahora**: Solo permite `https://fleet.mentoresestrategicos.com`
- **Impacto**: Vulnerabilidad a CSRF mitigada
- **Evidencia**: server.js:89-95
- **Estado**: ✅ **CORREGIDO**
- **Nota**: Mejora significativa, pero aún no es suficiente sin autenticación

### 🆕 Nuevos Riesgos por Funcionalidad de Carga Masiva

#### 14. **Inyección de Datos Maliciosos via Excel** (NUEVO)
- **Descripción**: Endpoint `/api/units/batch-upload` procesa Excel sin autenticación
- **Impacto**: Mal actor podría inyectar miles de unidades falsas
- **Evidencia**: server.js:137-142, bulkUploadService.js:100-168
- **Escenario**: Script automatizado llena la BD con datos basura
- **Estado**: ⚠️ **NUEVO RIESGO MEDIO**

#### 15. **DoS via Carga Masiva** (NUEVO)
- **Descripción**: Sin rate limiting en batch upload
- **Impacto**: Un usuario podría subir 1,000 archivos Excel de 10MB cada uno
- **Evidencia**: No hay límite de requests para `/api/units/batch-upload`
- **Escenario**: Atacante colapsa el servidor subiendo archivos masivos
- **Estado**: ⚠️ **NUEVO RIESGO MEDIO**

---

## 🧱 MÓDULOS FALTANTES (MANTENIDO)

### Para Modelo SaaS Profesional

#### 1. **Módulo de Autenticación y Gestión de Usuarios** (CRÍTICO)
- Registro de usuarios (sign up)
- Login (email/password, OAuth, SSO)
- Recuperación de contraseña
- Verificación de email
- Gestión de sesiones (JWT, refresh tokens)
- MFA (Multi-Factor Authentication)
- Password policies (complejidad, expiración)

#### 2. **Módulo de Autorización (RBAC)** (CRÍTICO)
- Definición de roles (Admin, User, Viewer, etc.)
- Definición de permisos granulares
- Asignación de roles a usuarios
- Validación de permisos por endpoint
- Roles por tenant (empresa)

#### 3. **Módulo de Multi-tenancy** (CRÍTICO)
- Gestión de tenants (empresas clientes)
- Aislamiento de datos por tenant (row-level security)
- Configuración por tenant (features, límites)
- Billing por tenant (planes, suscripciones)
- Onboarding de nuevos tenants

#### 4. **Módulo de Auditoría** (CRÍTICO)
- Logs de acciones (quién hizo qué, cuándo, desde dónde)
- Logs de cambios (before/after values)
- Logs de acceso (login/logout, failed attempts)
- Export de logs (CSV, JSON)
- Retención y archivado de logs

#### 5. **Módulo de Validación de Inputs** (ALTO)
- Schema validation (Joi, Zod, Yup)
- Sanitización de strings (XSS prevention)
- Validación de archivos (magic bytes, virus scanning)
- Validación de emails, URLs, fechas, montos
- Validación de business logic (reglas del dominio)

#### 6. **Módulo de Rate Limiting** (ALTO)
- Rate limiting por IP
- Rate limiting por usuario
- Rate limiting por endpoint
- Blacklist/Whitelist
- Protección contra DDoS

#### 7. **Módulo de Seguridad de Red** (MEDIO - CORS YA CORREGIDO)
- ~~CORS restrictivo~~ ✅ YA IMPLEMENTADO
- CSP (Content Security Policy)
- HSTS (HTTP Strict Transport Security)
- Helmet.js (security headers)
- CSRF protection

#### 8. **Módulo de Logging y Monitoreo** (ALTO)
- Logs estructurados (JSON format)
- Logging centralizado (Winston, Pino)
- Métricas de aplicación (Prometheus, Datadog)
- Alerts y notificaciones
- Dashboards de monitoreo

#### 9. **Módulo de Error Handling** (MEDIO)
- Error handling centralizado
- Clases de error personalizadas
- Error codes y mensajes estandarizados
- Error reporting (Sentry, Rollbar)
- Error tracking y análisis

#### 10. **Módulo de API Documentation** (MEDIO)
- OpenAPI/Swagger completo
- Autenticación en Swagger UI
- Ejemplos de requests/responses
- Versionamiento de API
- Deprecation policy

#### 11. **Módulo de Testing** (MEDIO)
- Unit tests (Jest)
- Integration tests
- E2E tests (Playwright/Cypress)
- Performance tests (k6, Artillery)
- Security tests (OWASP ZAP)

#### 12. **Módulo de CI/CD** (BAJO)
- GitHub Actions / GitLab CI
- Automated testing
- Automated deployment
- Blue-green deployments
- Rollback automático

#### 13. **Módulo de Backup y Disaster Recovery** (BAJO)
- Backups automáticos de BD
- Backups de archivos (uploads)
- Retención de backups (7, 30, 90 días)
- Plan de recuperación de desastres
- RTO/RPO definidos

#### 14. **Módulo de Billing y Pagos (SaaS)** (BAJO)
- Planes y precios
- Facturación mensual/anual
- Integración con pasarelas de pago (Stripe)
- Pruebas gratis (free trials)
- Cancelación y suspensiones

#### 15. **Módulo de Onboarding** (BAJO)
- Guías de configuración inicial
- Templates de datos
- Importación masiva de datos ✅ PARCIALMENTE IMPLEMENTADO (Excel)
- Asistentes paso a paso
- Soporte al cliente (chat, tickets)

---

## 🛡️ CONTROLES MÍNIMOS DE SEGURIDAD RECOMENDADOS

### Control 1: Autenticación Básica (CRÍTICO)
- Implementar JWT-based authentication
- Endpoint de login
- Middleware de verificación de token
- Refresh tokens
- Password hashing (bcrypt/argon2)

### Control 2: Autorización por Roles (CRÍTICO)
- Roles mínimos: Admin, User, Viewer
- Permiso: `read_units`, `write_units`, `delete_units`
- Permiso: `read_contracts`, `write_contracts`, `delete_contracts`
- Middleware de validación de roles
- Asignación de roles a usuarios

### Control 3: Aislamiento de Datos (Tenant Isolation) (CRÍTICO)
- Agregar `tenant_id` a todas las tablas principales
- Middleware que inyecta `tenant_id` en todas las queries
- Validación de `tenant_id` en cada request
- Sin posibilidad de ver datos de otros tenants

### Control 4: Auditoría Básica (CRÍTICO)
- Tabla `audit_logs`: (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at)
- Logs automáticos en cada CREATE, UPDATE, DELETE
- Logs manuales para acciones críticas

### Control 5: Rate Limiting Básico (ALTO)
- 100 requests/minute por IP
- 1000 requests/minute por usuario autenticado
- Bloqueo temporal de IPs abusivas
- Headers de rate limit en responses
- **Especialmente importante para endpoint `/api/units/batch-upload`**

### Control 6: CORS Restrictivo ✅ **YA IMPLEMENTADO**
- ~~Access-Control-Allow-Origin: https://fleet.mentoresestrategicos.com~~ ✅ HECHO
- No usar `*` en producción ✅ HECHO
- Preflight OPTIONS responses ✅ HECHO
- Credentials support

### Control 7: Validación de Inputs (ALTO)
- Schema validation en todos los endpoints
- Sanitización de strings
- Validación de archivos (tipo, tamaño, contenido)
- Validación de business logic

### Control 8: Manejo de Errores Seguro (MEDIO)
- No exponer stack traces en producción
- Error codes genéricos (CLIENT_ERROR, SERVER_ERROR)
- Logging detallado internamente
- Respuestas genéricas al cliente

### Control 9: Logging Básico (ALTO)
- Logs estructurados (timestamp, level, message, context)
- Logs de requests (method, path, ip, user_id, status_code, duration)
- Logs de errores completos
- Logs de seguridad (auth failures, suspicious activity)

### Control 10: Security Headers (MEDIO)
- Helmet.js para headers de seguridad
- HSTS (HTTP Strict Transport Security)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Content-Security-Policy

---

## 🧭 ROADMAP SUGERIDO EN 3 FASES (ACTUALIZADO)

### 🎯 Fase 1: Corto Plazo (1-2 meses)
**Objetivo**: Seguridad mínima para evitar exposición de datos

#### Semana 1-2: Autenticación Básica
- [ ] Implementar JWT authentication
- [ ] Crear endpoint POST /api/auth/login
- [ ] Crear endpoint POST /api/auth/register
- [ ] Crear middleware `authenticateToken`
- [ ] Agregar `user_id` a todas las tablas
- [ ] Crear tabla `users` (id, email, password_hash, tenant_id, role, created_at)
- [ ] Password hashing con bcrypt

#### Semana 3-4: Autorización por Roles
- [ ] Definir roles: Admin, User, Viewer
- [ ] Definir permisos básicos
- [ ] Crear tabla `roles` y `permissions`
- [ ] Crear middleware `requirePermission`
- [ ] Agregar verificación de permisos en cada endpoint
- [ ] Asignar roles por defecto a nuevos usuarios

#### Semana 5-6: Aislamiento de Datos
- [ ] Agregar `tenant_id` a todas las tablas (companies, units, contracts, payments, etc.)
- [ ] Crear middleware `requireTenant`
- [ ] Modificar todas las queries para filtrar por `tenant_id`
- [ ] Validar `tenant_id` en cada request
- [ ] Tests de aislamiento (tenant A no ve datos de tenant B)

#### Semana 7-8: Auditoría Básica
- [ ] Crear tabla `audit_logs`
- [ ] Implementar logging automático de CRUD operations
- [ ] Implementar logging manual de acciones críticas
- [ ] Crear endpoint GET /api/audit-logs
- [ ] Paginación de audit logs

**Resultados Esperados Fase 1**:
- ✅ Sistema autenticado y autorizado
- ✅ Datos aislados por tenant
- ✅ Trazabilidad de acciones
- ✅ Eliminación de acceso no autorizado

---

### 🎯 Fase 2: Mediano Plazo (3-4 meses)
**Objetivo**: Fortalecer seguridad y preparación para escala

#### Mes 3: Seguridad de Red y Validación
- [ ] ~~CORS restrictivo~~ ✅ **YA IMPLEMENTADO**
- [ ] Implementar rate limiting (express-rate-limit) - **PRIORIDAD ALTA por batch upload**
- [ ] Implementar Helmet.js para security headers
- [ ] Schema validation con Joi/Zod en todos los endpoints
- [ ] Sanitización de inputs (express-validator, DOMPurify)
- [ ] Validación mejorada de uploads (file-type, magic bytes)

#### Mes 4: Logging y Monitoreo
- [ ] Implementar logging estructurado con Winston
- [ ] Centralizar logs (Papertrail, Loggly, o similar)
- [ ] Implementar métricas básicas (request count, response time, error rate)
- [ ] Configurar alertas básicas (error rate spikes, downtime)
- [ ] Dashboard de monitoreo básico
- [ ] Logs de performance

#### Mes 5: Testing y CI/CD
- [ ] Implementar unit tests con Jest (cobertura > 70%)
- [ ] Implementar integration tests
- [ ] Configurar GitHub Actions para CI/CD
- [ ] Automated testing en cada PR
- [ ] Automated deployment a staging
- [ ] Blue-green deployments

#### Mes 6: Error Handling y API Documentation
- [ ] Error handling centralizado
- [ ] Clases de error personalizadas
- [ ] Error codes y mensajes estandarizados
- [ ] Error reporting con Sentry
- [ ] Documentación completa de API con Swagger/OpenAPI
- [ ] Versionamiento de API (/api/v1, /api/v2)

**Resultados Esperados Fase 2**:
- ✅ API robusta y confiable
- ✅ Monitoreo en tiempo real
- ✅ Testing automatizado
- ✅ Documentación completa

---

### 🎯 Fase 3: Largo Plazo (6-12 meses)
**Objetivo: Modelo SaaS completo y escalable**

#### Mes 7-8: Multi-tenancy Avanzado
- [ ] Gestión de tenants (CRUD de empresas)
- [ ] Configuración por tenant (features, límites)
- [ ] Onboarding automático de nuevos tenants
- [ ] Data isolation por tenant (row-level security)
- [ ] Tenant-specific configurations

#### Mes 9-10: Billing y Pagos
- [ ] Definición de planes y precios
- [ ] Integración con Stripe
- [ ] Facturación mensual/anual
- [ ] Pruebas gratis (free trials)
- [ ] Gestión de suscripciones
- [ ] Cancelación y suspensiones

#### Mes 11: Backup y Disaster Recovery
- [ ] Backups automáticos de BD (diarios, semanales, mensuales)
- [ ] Backups de archivos (uploads)
- [ ] Retención de backups (7, 30, 90 días)
- [ ] Plan de recuperación de desastres documentado
- [ ] RTO (Recovery Time Objective): < 1 hora
- [ ] RPO (Recovery Point Objective): < 15 minutos

#### Mes 12: Escalabilidad y Optimización
- [ ] Caching (Redis)
- [ ] CDN para assets (uploads)
- [ ] Database query optimization
- [ ] Database indexing
- [ ] Horizontal scaling (load balancer, multiple instances)
- [ ] Database read replicas

**Resultados Esperados Fase 3**:
- ✅ Producto SaaS completo
- ✅ Escalable a cientos de clientes
- ✅ Revenuable y profesional
- ✅ Listo para mercado

---

## 📋 RESUMEN EJECUTIVO (ACTUALIZADO)

### Estado Actual
PCAS es una **aplicación funcional con mejoras de seguridad perimetral pero no segura** para uso empresarial real.

**Progreso Reciente (v1.0 → v1.0.1)**:
- ✅ CORS restringido (de `*` a dominio específico)
- ✅ Carga masiva de unidades implementada (Excel)
- ❌ Sigue sin autenticación, autorización, aislamiento de datos, auditoría

### Riesgos Principales (Ordenados por Prioridad)
1. **Acceso no autorizado total**: Exposición completa de datos (SIN CAMBIOS)
2. **Sin aislamiento de datos**: Posible exposición entre empresas (SIN CAMBIOS)
3. **Sin rate limiting**: Vulnerabilidad a DoS (MÁS CRÍTICO por batch upload)
4. **Sin auditoría**: Imposible investigar incidentes (SIN CAMBIOS)

### Riesgos Nuevos (Por funcionalidad de carga masiva)
1. **Inyección de datos maliciosos via Excel**: Medio
2. **DoS via carga masiva**: Medio

### Recomendación Prioritaria
Implementar **Fase 1** inmediatamente (autenticación, autorización, aislamiento, auditoría) antes de permitir acceso a cualquier cliente real.

**Adicionalmente**: Agregar rate limiting específico para `/api/units/batch-upload` dado que es un nuevo vector de ataque.

### Inversión Estimada
- **Fase 1**: 2 meses, 1 desarrollador full-stack senior
- **Fase 2**: 3 meses, 1 desarrollador full-stack senior
- **Fase 3**: 6 meses, 1 desarrollador full-stack senior + 1 DevOps

### Retorno de Inversión
- **Seguridad**: Transformación de "vulnerable" a "empresarial"
- **Confianza**: Cumplimiento con estándares básicos de seguridad
- **Escalabilidad**: Preparado para crecer de 1 a 100+ clientes
- **Revenuable**: Listo para monetizar como SaaS

---

## 🚨 CONCLUSIÓN

PCAS tiene una **base técnica sólida** (React, Node, Express, MySQL/TiDB) y ha hecho **mejoras de seguridad perimetral** (CORS restrictivo), pero **carece de las capas de seguridad y gestión** necesarias para ser un producto SaaS profesional.

**NO es recomendable** desplegar este sistema a clientes reales sin implementar al menos:
1. Autenticación
2. Autorización
3. Aislamiento de datos
4. Auditoría básica
5. Rate limiting (especialmente para batch upload)

Con estos controles mínimos, PCAS podría ser un **producto competitivo** en el mercado de Fleet Management.

**Nota Importante**: La funcionalidad de carga masiva es útil pero incrementa el riesgo sin controles de seguridad. Se recomienda agregar rate limiting inmediato en `/api/units/batch-upload`.

---

**Documento actualizado el**: 09 de enero de 2026
**Analista**: Arquitecto Senior Full-Stack
**Versión**: v1.0.1 (Actualizado con cambios recientes)
**Estado**: Ready for Implementation
