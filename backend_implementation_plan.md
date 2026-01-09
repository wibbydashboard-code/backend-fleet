# Plan de Implementación Backend para Estado de Cuenta v1.0

Este plan define la implementación del endpoint POST /api/reports/estado-cuenta para generar el Estado de Cuenta Excel v1.0, basado en artefactos congelados (Excel, contrato lógico, pseudocódigo, checklist financiero aprobado, OpenAPI). El plan asegura separación de responsabilidades, auditabilidad financiera, y cumplimiento sin interpretaciones subjetivas. No incluye código ni optimizaciones; es guía para desarrollo estructurado.

## 1. Arquitectura por Capas
Capas mínimas para mantener responsabilidades claras y facilitar auditoría. Cada capa debe interactuar solo con la inmediata inferior/superior.

- **Controller / Handler**:
  - **Responsabilidad**: Punto de entrada HTTP; maneja request/response según OpenAPI.
  - **Qué sí hace**: Valida input (tipos, enums, existencia de entidad); coordina capas inferiores; retorna archivo o errores.
  - **Qué no puede hacer**: No accede a BD directamente; no calcula saldos; no genera Excel.

- **Service Financiero**:
  - **Responsabilidad**: Lógica financiera pura; orquesta cálculos y generación virtual.
  - **Qué sí hace**: Calcula saldo inicial; obtiene abonos; genera cargos virtuales; calcula saldos/totales; ordena movimientos.
  - **Qué no puede hacer**: No maneja HTTP; no accede a BD; no genera archivos.

- **Data Access / Repository**:
  - **Responsabilidad**: Acceso a datos; ejecuta queries SQL lógico.
  - **Qué sí hace**: Ejecuta SQL para abonos; valida existencia de entidades; retorna datos crudos.
  - **Qué no puede hacer**: No calcula; no genera virtuales; no ordena (excepto en SQL si necesario).

- **Generador de Excel**:
  - **Responsabilidad**: Creación del archivo .xlsx según diseño congelado.
  - **Qué sí hace**: Escribe encabezado, movimientos, totales; nombra archivo.
  - **Qué no puede hacer**: No calcula datos; no valida input; no maneja errores.

## 2. Flujo de Ejecución
Flujo secuencial y auditable, desde request hasta response. Cada paso debe ser traceable para auditoría.

1. **Recepción y Validación Inicial (Controller)**: Recibe POST request; valida JSON contra OpenAPI (tipos, enums, required); valida existencia de entidad via Repository; si falla, retorna 400/403.
2. **Cálculo de Saldo Inicial (Service Financiero)**: Llama a Repository para suma algebraica antes del período; retorna 0 en v1.0.
3. **Obtención de Abonos (Repository)**: Ejecuta SQL lógico para payments filtrados; retorna lista de abonos.
4. **Generación de Cargos Virtuales (Service Financiero)**: Usa pseudocódigo lógico para contratos/seguros; genera lista virtual (no BD); filtra por período/entidad.
5. **Unificación y Ordenamiento (Service Financiero)**: Une abonos + cargos; ordena por fecha asc, cargo antes abono, ID asc.
6. **Cálculos Financieros (Service Financiero)**: Calcula saldo acumulado, días atraso, totales según pseudocódigo.
7. **Generación del Excel (Generador de Excel)**: Recibe movimientos calculados; crea .xlsx con estructura congelada.
8. **Respuesta (Controller)**: Retorna 200 con archivo binario nombrado; o errores según OpenAPI.

## 3. Dependencias Técnicas
Dependencias mínimas para funcionalidad, sin versiones específicas:
- Driver/conector para MySQL (para queries).
- Librería para generación de Excel (.xlsx) (ej. Apache POI equivalente).
- Framework web para HTTP (ej. Express-like) con soporte JSON y archivos binarios.
- Librería para validación de esquemas JSON (contra OpenAPI).
- Librería para manejo de fechas (para cálculos de períodos/meses).

## 4. Manejo de Errores
Manejo centralizado en Controller, alineado con OpenAPI responses. Capas inferiores propagan errores sin manejar.

- **Errores de Validación (400)**: Input inválido (tipos, enums, entidad inexistente); manejado en Controller tras validación inicial.
- **Errores de Integridad de Datos (500)**: Datos corruptos en BD (ej. FK roto, monto negativo); manejado en Repository, propagado a Controller.
- **Errores Internos (500)**: Fallos en cálculos/Excel (ej. memoria insuficiente); manejado en Service/Generador, propagado a Controller.
- **Errores de Autenticación/Autorización (401/403)**: Manejado en middleware JWT, antes de Controller.
- **Propagación**: Todas las capas usan excepciones estándar; Controller mapea a códigos OpenAPI y estructura error JSON.

## 5. Checklist de Implementación
Checklist técnico para verificar cumplimiento post-implementación. Debe aprobarse 100% para pasar a QA.

- [ ] Controller valida exactamente según OpenAPI (tipos, enums, required).
- [ ] Service Financiero calcula saldos/totales según pseudocódigo (algebraicos puros).
- [ ] Repository ejecuta solo SQL lógico aprobado (no cálculos).
- [ ] Generador de Excel produce exactamente el diseño v1.0 (sin variaciones).
- [ ] Flujo respeta capas (no mezclas, ej. no BD en Service).
- [ ] Errores mapean 1:1 a OpenAPI responses.
- [ ] Implementación pasa checklist financiero aprobado (QA valida).
- [ ] No lógica en capas incorrectas (ej. no HTTP en Service).
- [ ] Endpoint idempotente y stateless.
- [ ] Logging auditable (sin datos sensibles).

Este plan permite implementación sin decisiones subjetivas, QA con checklist aprobado, y auditoría financiera limpia. Base para desarrollo en producción.</content>
<parameter name="filePath">C:\Users\desib\Desktop\app_pcas\backend_implementation_plan.md