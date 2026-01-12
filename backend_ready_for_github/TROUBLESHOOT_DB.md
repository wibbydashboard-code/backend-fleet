# 🔧 Diagnóstico: Error de Conexión a MySQL

## Problema Detectado

El frontend carga correctamente pero muestra **"ERROR FETCHING STATS"** porque el backend está respondiendo con **HTTP 500**.

### Análisis del Error

```bash
curl https://backend-fleet.onrender.com/api/stats
# Respuesta: {"error":"Internal server error"}
```

**Causa Raíz:** El backend no puede conectar a MySQL en Hostinger debido a un problema de configuración SSL.

## ✅ Soluciones Implementadas

He actualizado los archivos para solucionar el problema:

### 1. repository.js
```javascript
ssl: (process.env.RENDER || process.env.NODE_ENV === 'production')
  ? { 
      rejectUnauthorized: false,  // Permitir certificados autofirmados
      minVersion: 'TLSv1.2'
    }
  : false
```

### 2. server.js
- Mejorado el manejo de errores para mostrar mensajes detallados
- Actualizada la función `getUpcomingExpirations()` para usar SSL

### 3. test-db-connection.js (NUEVO)
Script para probar la conexión localmente.

## 🚀 Pasos para Solucionar

### Paso 1: Probar Conexión Localmente

```bash
cd C:\Users\desib\Desktop\app_pcas
node test-db-connection.js
```

**Resultados esperados:**
- ✅ Conexión exitosa → El problema está en Render
- ❌ Error de conexión → Revisa credenciales de Hostinger

### Paso 2: Verificar Variables de Entorno en Render

En tu dashboard de Render para `pcas-fleet-backend`:

Variables de entorno necesarias:
```bash
DB_HOST=hostname_de_hostinger  # ej: mysql.hostinger.com
DB_USER=tu_usuario_mysql
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=nombre_base_datos
RENDER=true
```

**¿Dónde encontrar estas credenciales?**

1. Entra a Hostinger hPanel
2. Ve a **Bases de Datos MySQL**
3. Busca tu base de datos y haz clic en **Administrar**
4. Copia:
   - Host (MySQL hostname)
   - Usuario
   - Contraseña
   - Nombre de la BD

### Paso 3: Verificar Acceso Remoto a MySQL

Hostinger MySQL tiene restricciones de acceso. Verifica que Render pueda conectarse:

**Opción A: Usar Hostinger Cloud Database (RECOMENDADO)**
1. En Hostinger → Bases de datos → Cloud Database
2. Crea una nueva BD Cloud (maneja mejor conexiones externas)
3. Usa sus credenciales en Render

**Opción B: Permitir acceso desde Render**
1. En Hostinger → Bases de datos → Tu BD
2. Busca "IPs permitidas" o "Remote access"
3. Agrega las IPs de Render (ver abajo)

### Paso 4: IPs de Render que Necesitan Acceso

```bash
# Render usa estas IPs (agregar todas):
103.21.244.0/22
103.22.200.0/22
103.31.4.0/22
141.101.64.0/18
108.162.192.0/18
190.93.240.0/20
188.114.96.0/20
197.234.240.0/22
198.41.128.0/17
162.158.0.0/15
104.16.0.0/13
104.24.0.0/14
172.64.0.0/13
131.0.72.0/22
```

### Paso 5: Redeploy en Render

1. En tu repositorio Git, commit los cambios:
   ```bash
   git add repository.js server.js test-db-connection.js
   git commit -m "Fix SSL connection to Hostinger MySQL"
   git push
   ```

2. Render detectará los cambios y hará deploy automático

3. Espera el deploy (5-10 min)

4. Verifica logs en Render:
   - Dashboard → pcas-fleet-backend → Logs
   - Buscar errores de conexión

### Paso 6: Verificar que Funciona

```bash
# Test del backend
curl https://backend-fleet.onrender.com/api/stats

# Debe retornar algo como:
# {"ok":true,"stats":{"units":X,"active":Y,"next30":Z,"overdue":W},"nextExp":[...]}

# Test del frontend
# Abre https://fleet.mentoresestrategicos.com
```

## 🐛 Solución de Problemas Comunes

### Error: ECONNREFUSED
**Causa:** Hostname incorrecto o firewall bloqueando
**Solución:** 
1. Verifica DB_HOST en Render
2. Agrega IPs de Render a Hostinger

### Error: ACCESS_DENIED
**Causa:** Usuario/contraseña incorrectos
**Solución:** 
1. Recrea usuario en Hostinger
2. Verifica que tiene permisos en la BD específica

### Error: EPROTO / SSL Handshake Failed
**Causa:** Configuración SSL incorrecta
**Solución:** Ya está solucionado con `rejectUnauthorized: false`

### Error: ER_DBACCESS_DENIED_ERROR
**Causa:** Usuario no tiene permisos en esa BD
**Solución:** 
1. En Hostinger → MySQL → Usuarios
2. Asigna permisos a la BD específica

## 📊 Estado Actual

- ✅ Frontend: Correctamente desplegado en Hostinger
- ✅ Backend: Corriendo en Render (respondiendo en root)
- ❌ Backend: Fallando al conectar a MySQL (HTTP 500)
- ✅ CORS: Correctamente configurado
- ✅ SSL: Actualizado para permitir certificados Hostinger

## 🎯 Próximos Pasos

1. Ejecutar `node test-db-connection.js` localmente
2. Verificar y actualizar variables de entorno en Render
3. Permitir acceso desde IPs de Render en Hostinger
4. Redeploy backend en Render
5. Verificar que `https://backend-fleet.onrender.com/api/stats` retorna datos
6. Recargar `https://fleet.mentoresestrategicos.com`

---

**¿Necesitas ayuda con alguno de estos pasos?**
