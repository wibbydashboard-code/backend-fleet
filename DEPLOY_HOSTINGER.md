# Guía de Despliegue en Hostinger (Node.js + MySQL)

Este documento detalla cómo subir la aplicación PCAS Fleet Management a Hostinger o un entorno de producción similar, usando una estrategia de "Despliegue Paralelo" para evitar riesgos.

## 1. Base de Datos (MySQL)

Como la estructura de la base de datos ha cambiado, **NO uses la base de datos existente** sin respaldo.

**Pasos en Hostinger (hPanel):**
1. Ve a la sección **Bases de Datos MySQL**.
2. Crea una **NUEVA BASE DE DATOS** (Ejemplo: `u12345_fleet_v2`).
   * Crea también un usuario nuevo y *guarda la contraseña*.
3. Entra a **phpMyAdmin** de esa nueva base de datos.
4. Ve a la pestaña **Importar**.
5. Selecciona el archivo `database_prod.sql` que está en la raíz de tu proyecto local.
6. Ejecuta la importación.

¡Listo! Ahora tienes una BD limpia con la estructura correcta.

## 2. Preparar los Archivos (Build)

Necesitamos generar la versión optimizada del Frontend y preparar el Backend.

**En tu terminal local:**
1. Detén los servidores (`Ctrl + C`).
2. Genera el frontend:
   ```bash
   npm run build
   ```
   *Esto creará una carpeta `dist/` con tu sitio web.*

## 3. Configuración en Hostinger (Node.js)

Si tu plan de Hostinger soporta Node.js (sección "Aplicaciones Node.js" en el panel):

1. **Crear Aplicación Node.js**:
   * Versión Node: 18 o superior.
   * Application Mode: Production.
   * Application Root: `/domains/tudominio.com/public_html/app` (o la carpeta que desees).
   * Application Startup File: `server.js`

2. **Subir Archivos (File Manager o FTP)**:
   Sube los siguientes archivos/carpetas a la carpeta raíz de tu aplicación:
   * `package.json`
   * `server.js`
   * `repository.js`
   * `financialService.js`
   * `excelGenerator.js`
   * Carpeta `dist/` (Sube todo su contenido dentro de una carpeta llamada `dist` o `public` según prefieras, pero asegúrate que `server.js` apunte bien a los estáticos).
     * *Nota:* En `server.js` actual, servimos estáticos desde `uploads`. Para producción, deberías agregar:
       ```javascript
       app.use(express.static('dist'));
       app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
       ```
       *(Te puedo ayudar a editar `server.js` para que sirva el frontend automáticamnete)*.

3. **Instalar Dependencias**:
   * En el panel de Node.js de Hostinger, botón "NPM Install".

4. **Variables de Entorno (.env)**:
   * En Hostinger, crea un archivo `.env` en la raíz de la app con los datos DE HOSTINGER:
     ```env
     DB_HOST=localhost
     DB_USER=u12345_fleetuser
     DB_PASSWORD=tu_contraseña_segura
     DB_NAME=u12345_fleet_v2
     PORT=3000
     ```

## 4. Estrategia de Migración de Datos (Opcional)

Si necesitas los datos viejos (contratos viejos, etc.) en la nueva plataforma:
1. Exporta la data de la tabla vieja en CSV/SQL.
2. Manually ajusta las columnas en Excel para que coincidan con el nuevo formato.
3. Importa en la nueva BD via phpMyAdmin.

---
**Consejo de Seguridad:**
Prueba todo en un subdominio primero (ej: `app-beta.tudominio.com`) antes de reemplazar tu sitio principal.
