# Checklist de Despliegue en Producción - PCAS Fleet Management

Este documento valida que todos los pasos para el despliegue final en `fleet.mentoresestrategicos.com` se han ejecutado o están listos para ejecutarse.

## 1. Base de Datos (Hostinger)
- [ ] **Crear Base de Datos:** En el panel de Hostinger -> Bases de Datos MySQL, crear una nueva base de datos.
    - Nombre sugerido: `u123456789_fleet_prod`
- [ ] **Crear Usuario:** Crear un usuario asociado a esa base de datos.
    - Usuario: `u123456789_fleet_user`
    - Contraseña: (Generar una segura y guardarla).
- [ ] **Importar SQL:** Abrir phpMyAdmin y seleccionar la nueva base de datos.
    - Pestaña "Importar" -> Subir archivo `database_prod.sql` (ubicado en la raíz del proyecto).
    - Verificar que las tablas `users`, `companies`, `units`, `contracts`, `payments`, `providers`, `insurance_policies` existen.
- [ ] **Permisos Remotos:** En Hostinger, asegurarse de que la base de datos permita conexiones remotas (normalmente habilitado por defecto o se configura en "Remote MySQL"). **Anotar la IP o Host** que te da Hostinger (no uses `localhost`).

## 2. Backend (Render)
- [ ] **Código Actualizado:** Se ha modificado `server.js` para permitir CORS únicamente desde `https://fleet.mentoresestrategicos.com`.
- [ ] **Variables de Entorno:** En el Dashboard de Render, ir a "Environment" y configurar:
    - `DB_HOST`: (El host de Hostinger, ej: `sql123.main-hosting.eu` o una IP)
    - `DB_USER`: (El usuario creado en el paso 1)
    - `DB_PASSWORD`: (La contraseña del paso 1)
    - `DB_NAME`: (El nombre de la BD del paso 1)
    - `DB_PORT`: `3306`
    - `NODE_ENV`: `production`
- [ ] **Redeploy:** Hacer un "Manual Deploy" -> "Clear build cache & deploy" para asegurar que toma los cambios de código y variables.
- [ ] **Validación:** Verificar que el log de Render diga "Server running on port 10000" (o similar) y no muestre errores de conexión a MySQL.

## 3. Frontend (Hostinger Hosting)
- [ ] **Archivos Estáticos:**
    - Entrar al File Manager de Hostinger (`public_html`).
    - Borrar contenido anterior ( si aplica).
    - Subir **todo el contenido** de la carpeta local `dist/` (debe incluir `index.html`, `assets/`, etc.).
- [ ] **Configuración Web (.htaccess):**
    - Subir el archivo `HOSTINGER_htaccess` que generó el agente en la raíz del proyecto local.
    -  **Renombrarlo** en el servidor a `.htaccess`.
    - Esto asegura que si recargas la página en `/dashboard`, no de error 404, y fuerza HTTPS.

## 4. Verificación Final
- [ ] Entrar a `https://fleet.mentoresestrategicos.com`.
- [ ] Verificar que carga el Login.
- [ ] Loguearse (si hay usuario admin precargado, o registrar uno nuevo si está habilitado).
- [ ] Ir a Dashboard y ver Stats (deben venir de la BD vacía o con datos semilla).
- [ ] Cargar Reportes (Endpoints `/api/reports`) para verificar que no da error 500.

**Estado Actual:**
- `server.js`: **LISTO** (CORS restringido).
- `repository.js`: **LISTO** (SSL habilitado para producción).
- `database_prod.sql`: **LISTO** (Estructura correcta).
- `HOSTINGER_htaccess`: **LISTO** (Creado en raíz).
