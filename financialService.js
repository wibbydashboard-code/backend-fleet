// financialService.js - Service Financiero layer
// Only financial logic, no DB, no HTTP, no Excel

import moment from 'moment';
import { getAbonos, getContratosPorEntidad, getSegurosPorEntidad } from './repository.js';

export function calculateSaldoInicial(entidad_tipo, entidad_id, periodo_inicio) {
  // In v1.0, saldo inicial is always 0
  return 0;
}

export async function getAbonosReales(entidad_tipo, entidad_id, periodo_inicio, periodo_fin) {
  return getAbonos(entidad_tipo, entidad_id, periodo_inicio, periodo_fin);
}

export async function generateCargosContratos(entidad_tipo, entidad_id, periodo_inicio, periodo_fin) {
  const contratos = await getContratosPorEntidad(entidad_tipo, entidad_id);
  const cargos = [];

  for (const contrato of contratos) {
    let fecha_actual = moment(contrato.start_date);
    const end = moment(contrato.end_date);
    let iteracion = 0;

    while (fecha_actual.isSameOrBefore(end)) {
      const due_date = fecha_actual.clone().endOf('month');
      if (due_date.isBetween(moment(periodo_inicio), moment(periodo_fin), null, '[]') && contrato.monthly_rent > 0) {
        const referencia = `${contrato.contract_number} - ${fecha_actual.format('MMMM YYYY')}`;
        const descripcion = `Cargo de rent ${fecha_actual.format('MMMM YYYY')}`;
        const dias_atraso = Math.max(0, moment().diff(due_date, 'days'));
        cargos.push({
          id: `cargo-${contrato.id}-${iteracion}`,
          fecha: due_date.format('YYYY-MM-DD'),
          referencia,
          descripcion,
          tipo_movimiento: 'Cargo',
          monto: Number(contrato.monthly_rent),
          estatus: 'Pendiente',
          dias_atraso
        });
      }
      fecha_actual = fecha_actual.add(1, 'month');
      iteracion++;
    }
  }

  return cargos;
}

export async function generateCargosSeguros(entidad_tipo, entidad_id, periodo_inicio, periodo_fin) {
  const seguros = await getSegurosPorEntidad(entidad_tipo, entidad_id);
  const cargos = [];

  for (const seguro of seguros) {
    let fecha_actual = moment(seguro.start_date);
    const end = moment(seguro.end_date);
    let iteracion = 0;

    while (fecha_actual.isSameOrBefore(end)) {
      const due_date = fecha_actual.clone().endOf('month');
      if (due_date.isBetween(moment(periodo_inicio), moment(periodo_fin), null, '[]') && seguro.premium_amount > 0) {
        const referencia = `${seguro.policy_number} - ${fecha_actual.format('MMMM YYYY')}`;
        const descripcion = `Cargo de seguro ${fecha_actual.format('MMMM YYYY')}`;
        const dias_atraso = Math.max(0, moment().diff(due_date, 'days'));
        cargos.push({
          id: `seguro-${seguro.id}-${iteracion}`,
          fecha: due_date.format('YYYY-MM-DD'),
          referencia,
          descripcion,
          tipo_movimiento: 'Cargo',
          monto: seguro.premium_amount,
          estatus: 'Pendiente',
          dias_atraso
        });
      }
      fecha_actual = fecha_actual.add(1, 'month');
      iteracion++;
    }
  }

  return cargos;
}

export function unifyMovimientos(abonos, cargosContratos, cargosSeguros) {
  return [...abonos, ...cargosContratos, ...cargosSeguros];
}

export function sortMovimientos(movimientos) {
  return [...movimientos].sort((a, b) => {
    const dateA = moment(a.fecha);
    const dateB = moment(b.fecha);
    if (dateA.isSame(dateB)) {
      if (a.tipo_movimiento === 'Cargo' && b.tipo_movimiento === 'Abono') return -1;
      if (a.tipo_movimiento === 'Abono' && b.tipo_movimiento === 'Cargo') return 1;
      return a.id.localeCompare(b.id);
    }
    return dateA.diff(dateB);
  });
}

export function calculateFinancials(movimientosOrdenados, saldoInicial) {
  let saldo_acumulado = saldoInicial;
  let total_cargos = 0;
  let total_abonos = 0;
  const dias_atraso_pendientes = [];

  for (const movimiento of movimientosOrdenados) {
    let montoNumerico = movimiento.monto;
    if (typeof montoNumerico === 'string') {
      montoNumerico = parseFloat(montoNumerico);
    }
    if (movimiento.tipo_movimiento === 'Cargo') {
      saldo_acumulado += montoNumerico;
      total_cargos += montoNumerico;
      if (movimiento.estatus === 'Pendiente') {
        dias_atraso_pendientes.push(movimiento.dias_atraso);
      }
    } else {
      saldo_acumulado -= montoNumerico;
      total_abonos += montoNumerico;
    }
    movimiento.saldo_acumulado = saldo_acumulado;
  }

  const saldo_final = saldo_acumulado;
  const dias_atraso_promedio = dias_atraso_pendientes.length > 0 ? dias_atraso_pendientes.reduce((a, b) => a + b, 0) / dias_atraso_pendientes.length : 0;
  const monto_total_pendiente = Number(total_cargos) - Number(total_abonos);

  return {
    movimientos: movimientosOrdenados,
    total_cargos,
    total_abonos,
    saldo_final,
    dias_atraso_promedio,
    monto_total_pendiente
  };
}