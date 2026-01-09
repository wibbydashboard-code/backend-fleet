# Pseudocódigo Financiero y SQL Lógico para Estado de Cuenta v1.0

Este documento describe el pseudocódigo y SQL lógico para generar el Estado de Cuenta v1.0, basado en la BD alineada (con campos como due_date en payments, índices en FKs). No es código ejecutable; es diseño lógico para auditoría y desarrollo. Sigue reglas congeladas: cargos virtuales de contracts.monthly_rent e insurance_policies.premium_amount, abonos de payments, tipo_movimiento determinado en backend, saldos calculados algebraicamente.

## 1. Validación y Preparación
```
VALIDAR entidad_tipo EN ['unidad', 'empresa', 'proveedor']
VALIDAR entidad_id EXISTE EN TABLA CORRESPONDIENTE (units.id, companies.id, providers.id)
VALIDAR periodo_inicio < periodo_fin Y FECHAS VÁLIDAS
CALCULAR saldo_inicial = SUMA_ALGEBRAICA_ANTES_PERIODO (0 EN v1.0)
```

## 2. Obtener Abonos (Pagos Reales)
SQL lógico para payments filtrados:
```
SELECT
  p.id,
  p.contract_id,
  p.insurance_policy_id,
  p.payment_date AS fecha,
  CONCAT(c.contract_number, ' - ', p.period) AS referencia,
  CONCAT('Pago de ', COALESCE(p.type, 'rent'), ' ', p.period) AS descripcion,
  'Abono' AS tipo_movimiento,
  p.amount AS monto,
  p.status AS estatus,
  0 AS dias_atraso,
  p.due_date
FROM payments p
LEFT JOIN contracts c ON p.contract_id = c.id
LEFT JOIN units u ON c.unit_id = u.id
LEFT JOIN companies co ON u.assigned_company_id = co.id
LEFT JOIN providers pr ON c.provider_id = pr.id
WHERE p.payment_date BETWEEN periodo_inicio AND periodo_fin
  AND (
    (entidad_tipo = 'unidad' AND u.id = entidad_id) OR
    (entidad_tipo = 'empresa' AND co.id = entidad_id) OR
    (entidad_tipo = 'proveedor' AND pr.id = entidad_id)
  )
ORDER BY p.payment_date ASC, p.id ASC
```

## 3. Generar Cargos Virtuales
Pseudocódigo lógico (no ejecutable):
```
cargos = []
PARA CADA contrato EN contracts DONDE FILTRADO_POR_ENTIDAD(entidad_tipo, entidad_id):
  fecha_actual = contrato.start_date
  MIENTRAS fecha_actual <= contrato.end_date:
    due_date = FIN_DE_MES(fecha_actual)
    SI due_date ESTÁ_EN_PERIODO(periodo_inicio, periodo_fin):
      referencia = contrato.contract_number + ' - ' + FORMATO_MES_AÑO(fecha_actual)
      descripcion = 'Cargo de rent ' + FORMATO_MES_AÑO(fecha_actual)
      monto = contrato.monthly_rent
      SI monto > 0:
        AGREGAR_A cargos: {
          id: 'cargo-' + contrato.id + '-' + ITERACION,
          fecha: due_date,
          referencia,
          descripcion,
          tipo_movimiento: 'Cargo',
          monto,
          estatus: 'Pendiente',
          dias_atraso: MAX(0, DIAS_ENTRE(due_date, HOY))
        }
    fecha_actual = SIGUIENTE_MES(fecha_actual)

PARA CADA seguro EN insurance_policies DONDE FILTRADO_POR_ENTIDAD(entidad_tipo, entidad_id):
  # Asumir premium_amount existe y es mensual; generar similar a contratos
  fecha_actual = seguro.start_date
  MIENTRAS fecha_actual <= seguro.end_date:
    due_date = FIN_DE_MES(fecha_actual)
    SI due_date ESTÁ_EN_PERIODO(periodo_inicio, periodo_fin):
      referencia = seguro.policy_number + ' - ' + FORMATO_MES_AÑO(fecha_actual)
      descripcion = 'Cargo de seguro ' + FORMATO_MES_AÑO(fecha_actual)
      monto = seguro.premium_amount  # Asumir campo existe
      SI monto > 0:
        AGREGAR_A cargos: { ... similar a contratos, con insurer en descripcion si aplica }
```

## 4. Unificar y Ordenar Movimientos
SQL lógico para union (usando CTE o UNION):
```
WITH movimientos AS (
  SELECT fecha, referencia, descripcion, tipo_movimiento, monto, estatus, dias_atraso, id
  FROM abonos
  UNION ALL
  SELECT fecha, referencia, descripcion, tipo_movimiento, monto, estatus, dias_atraso, id
  FROM cargos_virtuales  # Simulado como tabla temporal
)
SELECT *
FROM movimientos
ORDER BY fecha ASC, 
         CASE WHEN tipo_movimiento = 'Cargo' THEN 1 ELSE 2 END ASC, 
         id ASC
```

## 5. Calcular Saldos y Totales
Pseudocódigo financiero:
```
saldo_acumulado = saldo_inicial
total_cargos = 0
total_abonos = 0
dias_atraso_pendientes = []

PARA CADA movimiento EN movimientos_ordenados:
  SI tipo_movimiento == 'Cargo':
    saldo_acumulado += monto
    total_cargos += monto
    SI estatus == 'Pendiente':
      AGREGAR dias_atraso A dias_atraso_pendientes
  SINO:
    saldo_acumulado -= monto
    total_abonos += monto
  movimiento.saldo_acumulado = saldo_acumulado

saldo_final = saldo_acumulado
dias_atraso_promedio = PROMEDIO(dias_atraso_pendientes) SI dias_atraso_pendientes.NO_VACIO SINO 0
monto_total_pendiente = total_cargos - total_abonos
```

## 6. Generar Excel
Pseudocódigo lógico:
```
CREAR_WORKBOOK
AGREGAR_HOJA 'Estado de Cuenta'
ESCRIBIR_ENCABEZADO: 'Estado de Cuenta', entidad, tipo, fecha_generacion, periodo, saldo_inicial
ESCRIBIR_COLUMNAS: Fecha, Referencia, Descripción, Tipo Movimiento, Monto, Saldo Acumulado, Días de Atraso, Estatus
SI movimientos.VACIO:
  ESCRIBIR 'Sin movimientos en el período seleccionado'
SINO:
  PARA CADA movimiento: ESCRIBIR FILA
ESCRIBIR_TOTALES: total_cargos, total_abonos, saldo_final, dias_atraso_promedio, monto_total_pendiente
EXPORTAR_COMO_XLSX nombrado Estado_Cuenta_[entidad_tipo]_[entidad_id]_[periodo_inicio]_[periodo_fin].xlsx
```

Este pseudocódigo asegura integridad financiera: saldos algebraicos, cargos virtuales controlados, orden contable estricto. Base para implementación sin ambigüedades.</content>
<parameter name="filePath">C:\Users\desib\Desktop\app_pcas\pseudocode_financial_sql.md