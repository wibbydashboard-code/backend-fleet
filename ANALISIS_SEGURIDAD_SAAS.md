# Análisis de Seguridad y Madurez de Plataforma - PCAS
**Fecha:** 09/01/2026
**Rol:** Arquitecto Senior de Software y Seguridad SaaS
**Estado:** Análisis de Solo Lectura (Sin modificaciones de infraestructura)

---

## 1. 📊 Diagnóstico Actual (SaaS Maturity Level)

**Nivel Detectado: Nivel 1 - Ad Hoc / Custom App (MVP Avanzado)**
PCAS se encuentra actualmente en una etapa de transición entre una aplicación a medida y un SaaS incipiente. Aunque funcional y operativamente valiosa para gestión de flotas, carece de las capas de abstracción y seguridad automatizada que definen a un SaaS comercial robusto.

*   **Arquitectura:** Monolito lógico con frontend separado.
*   **Aislamiento:** Lógico (Software-Level). Se confía en la corrección de las consultas SQL (`WHERE company_id = X`) para separar datos.
*   **Identidad:** Autenticación básica (Login/Token). No se detecta un sistema robusto de Gestión de Identidad y Acceso (IAM) con roles granulares visibles en el código analizado.
*   **Seguridad:** Perimetral básica. Depende de la seguridad intrínseca de los proveedores (Render/Hostinger) y de la lógica de aplicación.

---

## 2. ⚠️ Riesgos Detectados (High Level)

Estos riesgos no implican que el sistema falle hoy, sino vulnerabilidades latentes ante un escalado comercial o ataques dirigidos.

### A. Riesgo de Fuga de Datos entre Inquilinos (Tenant Leakage)
*   **Riesgo:** Al depender puramente de lógica aplicativa para filtrar datos, un error humano en una consulta (olvidar un `WHERE`) podría exponer contratos o pagos de la Empresa A al usuario de la Empresa B.
*   **Impacto:** Crítico. Pérdida de confianza total y problemas legales.

### B. Enumeración de Recursos (IDOR)
*   **Riesgo:** El uso de IDs incrementales (ej. `contract_id=105`, `payment_id=500`) en las URLs y APIs permite a un usuario malintencionado "adivinar" e intentar acceder a recursos vecinos (`/payments/501`) cambiando el número.
*   **Impacto:** Alto. Robo de información financiera sensible.

### C. Auditoría Insuficiente
*   **Riesgo:** Si un pago cambia de estatus de "Vencido" a "Pagado", o si un contrato se elimina, no parece haber un rastro forense inmutable (quién, cuándo, desde qué IP, qué valor anterior tenía).
*   **Impacto:** Medio-Alto. Imposibilidad de resolver disputas internas o fraudes operativos.

### D. Gestión de Sesión y Autenticación
*   **Riesgo:** Ausencia de 2FA (Doble Factor) y políticas de contraseña no visibles. Si una credencial de administrador se compromete, el atacante tiene control total.
*   **Impacto:** Crítico. Secuestro de plataforma.

---

## 3. 🧱 Módulos Faltantes para SaaS Profesional

Para vender PCAS a corporativos, faltan estos componentes estructurales:

1.  **Módulo RBAC (Role-Based Access Control) Granular:**
    *   No solo "Admin" y "Usuario". Se necesitan permisos finos: `ver_contratos`, `editar_pagos`, `aprobar_gastos`, `solo_lectura_reportes`.
2.  **Módulo de "Audit Logs" (Bitácora de Seguridad):**
    *   Una vista donde el administrador de la empresa pueda ver: "Usuario X exportó el reporte de pagos el día Y".
3.  **Gestión de Tenants (Admin Console):**
    *   Interfaz para crear nuevas empresas, suspender acceso por falta de pago, configurar límites (ej. máx 50 unidades).
4.  **Centro de Notificaciones y Alertas:**
    *   Sistema proactivo que avise por email/SMS sobre vencimientos de seguros o pagos, no solo reportes pasivos.
5.  **API Gateway / Rate Limiting (Lógico):**
    *   Protección contra abuso de API (ej. un script que intente descargar todos los PDFs masivamente).

---

## 4. 🛡️ Controles Mínimos de Seguridad Recomendados

Estas son las "**Safety Nets**" que se deben implementar sin tocar la infraestructura física:

*   **Middleware de Aislamiento de Tenant (Contexto):** Asegurar que *cada* request inyecte el `company_id` del usuario en un contexto global y que *todas* las consultas a DB usen ese contexto obligatoriamente, evitando pasar `company_id` desde el frontend (que es manipulable).
*   **Obofuscación de IDs:** Usar UUIDs o Hashids para exponer recursos públicamente en lugar de IDs numéricos (ej. `x7k-9pm` en lugar de `105`).
*   **Sanitización de Archivos:** Validar estrictamente los PDFs/Imágenes subidos para evitar que se suban scripts ejecutables disfrazados (Malware upload).
*   **Headers de Seguridad HTTP:** Implementar HSTS, CSP (Content Security Policy) y X-Frame-Options para evitar ataques de clickjacking y XSS.

---

## 5. 🧭 Roadmap Sugerido (3 Fases)

### Fase 1: Hardening de MVP (Corto Plazo - 1 mes)
*Objetivo: Cerrar brechas de seguridad obvias sin detener la operación.*
1.  **Auditoría de Endpoints:** Revisar manualmente que *cada* ruta de la API valide que el recurso solicitado pertenece a la empresa del usuario.
2.  **Logs de Actividad Básicos:** Implementar un registro en DB (`activity_logs`) para acciones críticas (Create/Delete/Update de pagos y contratos).
3.  **Backup Strategy:** Asegurar que la DB en TiDB tenga snapshots diarios automáticos y probados.

### Fase 2: Profesionalización SaaS (Medio Plazo - 3-6 meses)
*Objetivo: Preparar la plataforma para escalar a múltiples clientes desconocidos.*
1.  **Implementar RBAC:** Crear roles personalizables por empresa.
2.  **Módulo de Seguridad para Clientes:** Darle al cliente la vista de "Quién entró a mi cuenta".
3.  **2FA (Autenticación de 2 Pasos):** Requerido para usuarios con permisos financieros.
4.  **Subdominios o Custom URLs:** (Opcional) `empresa1.pcas.com`, `empresa2.pcas.com` para mayor aislamiento de cookies/sesión.

### Fase 3: Enterprise & Compliance (Largo Plazo - 6-12 meses)
*Objetivo: Vender a grandes corporativos o gobierno.*
1.  **Certificación SOC2 / ISO 27001:** Requiere todo lo anterior más procesos documentados.
2.  **Encryption at Rest (Avanzado):** Cifrado de columnas sensibles en DB (montos, datos fiscales) con llaves rotativas.
3.  **API Pública Documentada:** Para que los clientes integren PCAS con sus propios ERPs (SAP, Oracle).

---

**Conclusión del Arquitecto:**
PCAS tiene una base funcional sólida para un producto interno o mono-cliente. Para transformarse en un negocio SaaS escalable, la prioridad absoluta debe alejarse de "nuevas funcionalidades" (features) y centrarse en la **gobernanza de datos, el aislamiento estricto y la auditoría**. Sin estos cimientos, el riesgo operativo es mayor que el beneficio comercial.
