# PCAS Fleet Management Backend

Backend API para Fleet Management con soporte multi-tenant y autenticación RBAC.

## Tecnologías

- Node.js 20.x
- Express.js 4.18.2
- MySQL2 (TiDB Cloud)
- JWT Authentication
- Winston (Logging)

## Variables de Entorno (Render)

Estas variables deben configurarse en el panel de Render:

```env
DB_HOST=tidb-cloud-host
DB_PORT=4000
DB_USER=your-tidb-user
DB_PASSWORD=your-tidb-password
DB_NAME=fleet_db
JWT_SECRET=generate-strong-random-string-min-32-chars
JWT_EXPIRES_IN=24h
PORT=3000
NODE_ENV=production
```

## Instalación y Despliegue

### Local
```bash
npm install
node server.js
```

### Render (Automático)
El despliegue es automático desde GitHub. Render leerá:
- `package.json` → ejecuta `npm install`
- `render.yaml` → configura el servicio
- `node server.js` → inicia el servidor

## Archivos Incluidos

- **server.js**: Servidor Express principal
- **repository.js**: Capa de acceso a datos (TiDB Cloud)
- **authService.js**: JWT y autenticación
- **requireAuth.js**: Middleware de autenticación
- **requireRole.js**: Middleware RBAC
- **resolveTenant.js**: Middleware de tenant isolation
- **permissions.js**: Sistema de permisos
- **roleUtils.js**: Helper de roles
- **auditLogger.js**: Logging de auditoría
- **tenantHelper.js**: Helper de tenants
- **tenantMiddleware.js**: Middleware de tenants
- **bulkUploadService.js**: Carga masiva de unidades
- **excelGenerator.js**: Generación de reportes Excel
- **financialService.js**: Cálculos financieros
- **errorHandler.js**: Manejo centralizado de errores
- **errors.js**: Definición de errores
- **logger.js**: Winston logger
- **rateLimiter.js**: Rate limiting
- **helmet**: Security headers (configurado en server.js)
- **render.yaml**: Configuración de despliegue en Render
- **.env.example**: Ejemplo de variables de entorno
- **package.json**: Dependencias y scripts
- **package-lock.json**: Versiones de dependencias

## Endpoints

### Autenticación
- `POST /api/auth/login` - Inicio de sesión

### Unidades
- `GET /api/units` - Listar unidades (requiere auth + role)
- `POST /api/units` - Crear unidad
- `PUT /api/units/:id/status` - Actualizar estatus
- `GET /api/units/template` - Descargar plantilla Excel
- `POST /api/units/batch-upload` - Carga masiva

### Contratos
- `GET /api/contracts` - Listar contratos (requiere auth + role)
- `POST /api/contracts` - Crear contrato
- `GET /api/contracts/complete` - Listar con datos completos
- `POST /api/contracts/:id/upload` - Subir PDF

### Pagos
- `GET /api/payments` - Listar pagos (requiere auth + role)
- `POST /api/payments` - Crear pago
- `PUT /api/payments/:id/status` - Actualizar estatus
- `POST /api/payments/:id/upload` - Subir PDF
- `GET /api/payments/report` - Reporte de pagos

### Proveedores
- `GET /api/providers` - Listar proveedores
- `POST /api/providers` - Crear proveedor
- `PUT /api/providers/:id` - Actualizar proveedor
- `PUT /api/providers/:id/status` - Actualizar estatus
- `GET /api/providers/:id/statement` - Estado de cuenta

### Empresas
- `GET /api/companies` - Listar empresas
- `POST /api/companies` - Crear empresa
- `PUT /api/companies/:id` - Actualizar empresa
- `PUT /api/companies/:id/status` - Actualizar estatus
- `DELETE /api/companies/:id` - Eliminar empresa

### Admin (Solo admin)
- `GET /api/admin/tenants` - Listar tenants
- `POST /api/admin/tenants` - Crear tenant
- `GET /api/admin/tenants/:id/metrics` - Métricas de tenant
- `PATCH /api/admin/tenants/:id` - Actualizar tenant
- `GET /api/admin/users` - Listar usuarios
- `POST /api/admin/users` - Crear usuario
- `PATCH /api/admin/users/:id` - Actualizar usuario

## Seguridad

- **Autenticación**: JWT (jsonwebtoken)
- **RBAC**: Roles (admin, user, viewer) con permisos
- **Tenant Isolation**: Filtrado por tenant_id
- **Rate Limiting**: Express-rate-limit
- **Security Headers**: Helmet
- **Audit Logs**: Todos los accesos registrados

## Multi-Tenancy

El sistema soporta múltiples tenants con:
- Aislamiento de datos por tenant_id
- Middleware de resolución de tenant (JWT → header → null)
- Fallback automático para compatibilidad
- Métricas por tenant

## Logs

- **Winston**: Logging estructurado en consola y archivo
- **Audit Logs**: Tabla `audit_logs` en TiDB Cloud
- **Error Handling**: Centralizado en `errorHandler.js`

## Build Status

Render ejecutará automáticamente:
```bash
npm install
node server.js
```

El servidor escuchará en el puerto especificado por `process.env.PORT` (default: 3000).

## Versión

- Backend: v1.0.0
- Node.js: 20.x
- Fecha: 2026-01-10
