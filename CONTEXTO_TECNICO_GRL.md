# 📘 PCAS - Contexto Técnico General y Estado del Proyecto
**Fecha de Actualización:** 09/01/2026
**Versión:** 1.2.0 (Stable MVP)

---

## 1. 🏗️ Arquitectura del Sistema
El sistema **PCAS (Plataforma de Control Administrativo y Seguimiento)** opera bajo una arquitectura **Monolítica Desacoplada** orientada a servicios REST.

*   **Frontend (SPA):** React 18 + TypeScript + Vite. Alojado estáticamente en **Hostinger**.
*   **Backend (API):** Node.js + Express (Presumiblemente). Alojado en **Render** (`https://backend-fleet.onrender.com`).
*   **Base de Datos:** MySQL (TiDB Cloud). Relacional.
*   **Storage:** Sistema de archivos local/efímero en servidor (Render fs) o servicio de uploads (gestionado vía endpoints `/uploads`).

---

## 2. 🛠️ Tech Stack (Frontend)
El repositorio actual contiene el código fuente del Frontend.
*   **Core:** React 18, TypeScript.
*   **Build Tool:** Vite (rápido, HMR, bundles optimizados).
*   **Estilos:** Tailwind CSS (Utility-first).
*   **HTTP Client:** Fetch nativo (abstraído en `src/api.ts`).
*   **Routing:** React Router (inferido por `htaccess` SPA config).
*   **PWA:** `vite-plugin-pwa` (Manifest, workers básicos).

---

## 3. 🧩 Estado de Módulos y Funcionalidades
La plataforma cubre el ciclo de vida completo de activos de flota:

### A. Gestión de Unidades (`Units.tsx`)
*   **Estado:** Completo (CRUD).
*   **Datos:** Placas, VIN, Marca, Modelo, Asignación a Empresa.
*   **UX:** Modales para edición/alta. Vista de tarjetas.

### B. Contratos y Legal (`ContractsView.tsx`)
*   **Estado:** Completo. Lógica crítica de negocio.
*   **Lógica Clave:**
    *   Cálculo automático de `term_months` basado en fechas.
    *   Validación de fechas > 2000.
    *   Asociación Contrato <-> Unidad <-> Proveedor.
    *   Subida de PDFs (Contratos físicos).

### C. Pagos y Finanzas (`PaymentsView.tsx`)
*   **Estado:** Completo.
*   **Características:**
    *   Registro de pagos reales (Facturación).
    *   Manejo de estados: `Pendiente`, `Pagado`, `Vencido`.
    *   Visualización de comprobantes (PDF/Img) mediante **Descarga Forzada (Blob)** para evitar problemas de CORS/Auth en navegador.

### D. Reportes Inteligentes (`Reports.tsx`) - *Módulo Estrella*
Lógica compleja mayormente en el cliente (Frontend-side calculation):
1.  **Proyección de Costos:** Calcula la "renta teórica" multiplicando `monto_mensual * meses_vigencia` en un rango de fechas (ej. 2000-2026), independientemente de si se registraron pagos o no.
2.  **Tabla de Amortización:** Genera el calendario de pagos ideal y lo cruza (merge) con los pagos reales existentes en DB para mostrar un estado de cuenta híbrido (Proyectado vs Real).
3.  **Vencimientos:** Alertas visuales de contratos próximos a expirar.

---

## 4. 🔄 Flujos de Datos y Patrones
*   **API Layer (`src/api.ts`):** Centraliza todas las llamadas HTTP. Si se cambia el backend, solo se toca este archivo.
*   **Manejo de Fechas:** Se corrigió el uso de inputs `type="month"` agregando atributos `min="2000-01"` para permitir navegación histórica completa (bypass de bug visual en navegadores modernos).
*   **Descargas:** Se implementó un patrón `fetch -> blob -> objectURL -> a.download` para archivos seguros, evitando abrir pestañas a `localhost` o rutas rotas.

---

## 5. 🚀 Infraestructura y Despliegue
*   **Entorno Local:** `npm run dev` (Puerto 5173).
*   **Build:** `npm run build` genera carpeta `dist/`.
*   **Despliegue Producción (Manual):**
    1.  Generar build.
    2.  Comprimir contenido de `dist/`.
    3.  Subir a `public_html` en Hostinger.
    4.  **Importante:** Se incluye `.htaccess` en `public/` para manejar redirecciones SPA (React Router) y forzar HTTPS.
*   **Backend URL:** Configurada dinámicamente vía `import.meta.env.PROD`.

---

## 6. ⚠️ Deuda Técnica y Seguridad (SaaS Readiness)
*   **Tenant Isolation:** Lógico (Software level). Riesgo de cruce de datos si fallan las queries.
*   **Archivos:** Los uploads parecen estar sirviéndose estáticamente desde el backend. Si Render reinicia (ephemeral FS), se podrían perder archivos si no hay un S3/Cloudinary conectado (A verificar en backend).
*   **Hardening:** Faltan logs de auditoría (quién borró qué) y roles granulares (RBAC).

---

**Resumen:** La plataforma es un MVP robusto y funcional, con UX pulida y lógica financiera correcta. Está lista para operación controlada, pero requiere refactorización de seguridad (Identity/Tenancy) antes de escalar a modelo SaaS masivo multi-cliente.
