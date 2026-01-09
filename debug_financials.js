import { calculateSaldoInicial, getAbonosReales, generateCargosContratos, generateCargosSeguros, unifyMovimientos, sortMovimientos, calculateFinancials } from './financialService.js';

async function debugFinancials() {
  try {
    const entidad_tipo = 'unidad';
    const entidad_id = 1;
    const periodo_inicio = '2025-01-01';
    const periodo_fin = '2025-12-31';

    console.log('🔍 Debug de flujo financiero\n');

    const saldoInicial = calculateSaldoInicial(entidad_tipo, entidad_id, periodo_inicio);
    console.log(`1️⃣ Saldo Inicial:`, saldoInicial);

    const abonos = await getAbonosReales(entidad_tipo, entidad_id, periodo_inicio, periodo_fin);
    console.log(`2️⃣ Abonos (${abonos.length}):`, abonos.slice(0, 2));

    const cargosContratos = await generateCargosContratos(entidad_tipo, entidad_id, periodo_inicio, periodo_fin);
    console.log(`3️⃣ Cargos Contratos (${cargosContratos.length}):`, cargosContratos.slice(0, 2));

    const cargosSeguros = await generateCargosSeguros(entidad_tipo, entidad_id, periodo_inicio, periodo_fin);
    console.log(`4️⃣ Cargos Seguros (${cargosSeguros.length}):`, cargosSeguros.slice(0, 2));

    const movimientos = unifyMovimientos(abonos, cargosContratos, cargosSeguros);
    console.log(`5️⃣ Movimientos unificados (${movimientos.length})`);

    const movimientosOrdenados = sortMovimientos(movimientos);
    console.log(`6️⃣ Movimientos ordenados (${movimientosOrdenados.length})`);

    const financialData = calculateFinancials(movimientosOrdenados, saldoInicial);
    console.log(`7️⃣ Cálculos financieros:`);
    console.log(`   total_cargos:`, financialData.total_cargos);
    console.log(`   total_abonos:`, financialData.total_abonos);
    console.log(`   saldo_final:`, financialData.saldo_final);
    console.log(`   dias_atraso_promedio:`, financialData.dias_atraso_promedio);
    console.log(`   monto_total_pendiente:`, financialData.monto_total_pendiente);

    if (isNaN(financialData.saldo_final)) {
      console.log(`❌ ERROR: saldo_final is NaN!`);
    }

  } catch (error) {
    console.error('❌ Error en debug:', error.message, error.stack);
  }
}

debugFinancials();