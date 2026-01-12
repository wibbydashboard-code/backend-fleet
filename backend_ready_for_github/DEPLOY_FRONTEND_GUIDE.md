# Guía de Despliegue Frontend en Hostinger
## fleet.mentoresestrategicos.com

## Arquitectura Final

```
fleet.mentoresestrategicos.com (Hostinger)
  ↓ Frontend estático (React build)
backend-fleet.onrender.com (Render)
  ↓ API REST
Hostinger MySQL (SSL obligatorio)
```

## Paso 1: Archivos Listos ✅

El build ya está generado en la carpeta `dist/`:
- `dist/index.html` - Entry point
- `dist/assets/index-BjFtFth2.js` - Bundle completo (590KB)
- `dist/.htaccess` - Configuración Apache para SPA

## Paso 2: Subir a Hostinger

### Opción A: Usar File Manager en hPanel

1. **Ingresar a Hostinger hPanel**
   - Ve a "File Manager"
   - Navega a `domains/fleet.mentoresestrategicos.com/public_html`

2. **Subir archivos**
   - Arrastra o sube el contenido de `dist/` (NO la carpeta dist, su contenido)
   - Debe aparecer:
     - `index.html`
     - `assets/` (con el JS)
     - `.htaccess`

### Opción B: Usar FTP

1. **Conectar via FTP**
   - Host: `ftp.fleet.mentoresestrategicos.com` (o credenciales de Hostinger)
   - Usar FileZilla o similar
   - Subir contenido de `dist/` a `public_html/`

## Paso 3: Verificar Configuración de Dominio

### Asegurar que el dominio apunta a Hostinger

1. **Verificar DNS**
   - En hPanel → Domains → fleet.mentoresestrategicos.com
   - Asegurarse que los registros A apuntan a IPs de Hostinger

2. **Verificar Web Hosting**
   - El dominio debe estar asignado al paquete de hosting
   - `public_html` debe ser la raíz del dominio

## Paso 4: Verificar Funcionamiento

### Test local del build

```bash
# En tu máquina local
cd C:\Users\desib\Desktop\app_pcas\dist
python -m http.server 8080
# Visitar http://localhost:8080
```

### Test en Hostinger

1. **Visitar el dominio**
   - https://fleet.mentoresestrategicos.com

2. **Verificar en Developer Console (F12)**
   - Network tab: Revisar que carga `/assets/index-BjFtFth2.js`
   - Console: No debe haber errores
   - Application: Debe cargar React app

3. **Verificar API calls**
   - Network tab → XHR/Fetch
   - Buscar peticiones a `https://backend-fleet.onrender.com/api/*`
   - Verificar que no haya errores CORS

## Paso 5: Solución de Problemas Comunes

### Problema: Página en blanco
- **Causa**: React no carga
- **Solución**: Verificar Network tab, buscar errores 404 en assets

### Problema: Error 404 en assets
- **Causa**: Rutas incorrectas
- **Solución**: Verificar que `index.html` tiene `/assets/` (no `./assets/`)

### Problema: Errores CORS al llamar API
- **Causa**: Backend no permite CORS desde tu dominio
- **Solución**: Verificar que backend tiene `Access-Control-Allow-Origin: *`

### Problema: API timeout
- **Causa**: Render está en cold start
- **Solución**: Esperar 30-60 segundos, hacer una primera petición para warm-up

## Paso 6: Configuración SSL

### Activar HTTPS gratis (Let's Encrypt)

1. **En hPanel**
   - SSL → Let's Encrypt
   - Activar para fleet.mentoresestrategicos.com

2. **Forzar HTTPS**
   - Agregar a `.htaccess`:
   ```apache
   RewriteCond %{HTTPS} off
   RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   ```

## Paso 7: Verificar Backend en Render

### Verificar variables de entorno

En Render Dashboard → pcas-fleet-backend:
- `DB_HOST`: Hostinger MySQL host
- `DB_USER`: Hostinger MySQL user
- `DB_PASSWORD`: Hostinger MySQL password
- `DB_NAME`: Nombre de la BD en Hostinger
- `RENDER`: true (para SSL)

### Test directo del backend

Visitar: `https://backend-fleet.onrender.com/`
- Debe mostrar: "🚀 Fleet Management Backend API is running!"

Visitar: `https://backend-fleet.onrender.com/api/stats`
- Debe retornar JSON con stats

## Paso 8: Checklist Final

- [ ] Frontend subido a `public_html/`
- [ ] `.htaccess` presente y configurado
- [ ] Dominio apunta a Hostinger
- [ ] SSL activado en Hostinger
- [ ] Backend corriendo en Render
- [ ] Backend conectado a MySQL con SSL
- [ ] CORS habilitado en backend
- [ ] App carga en fleet.mentoresestrategicos.com
- [ ] No errores en console
- [ ] API calls funcionan

## Paso 9: Verificación Final

### Comandos útiles

```bash
# Verificar respuesta del backend
curl https://backend-fleet.onrender.com/api/stats

# Verificar headers CORS
curl -I https://backend-fleet.onrender.com/api/units
```

### Monitoreo

- Render Dashboard: Ver logs del backend
- Hostinger Analytics: Ver tráfico del frontend
- Browser DevTools: Ver errores en tiempo real

## Archivos Modificados

1. **vite.config.ts** - Configurado para producción en root
2. **dist/index.html** - Optimizado, sin importmap innecesario
3. **dist/.htaccess** - Configuración Apache para SPA

## Siguientes Pasos (Opcional)

1. **Optimizar bundle** (actualmente 590KB, puede reducirse con code splitting)
2. **Agregar service worker** para PWA
3. **Configurar CI/CD** para deploy automático
4. **Agregar analytics** (Google Analytics, etc.)
5. **Implementar rate limiting** en backend

---

**¡Felicidades!** 🎉

Tu app PCAS Fleet Management está lista para producción en fleet.mentoresestrategicos.com con arquitectura moderna y correcta.
