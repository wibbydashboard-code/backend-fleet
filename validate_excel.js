import ExcelJS from 'exceljs';

async function validateExcel(filename) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filename);
    const worksheet = workbook.getWorksheet(1);

    console.log(`\n✅ ${filename}: Archivo abre correctamente`);

    // Check headers
    const cellA1 = worksheet.getCell('A1').value;
    console.log(`   Encabezado: "${cellA1}"`);
    if (cellA1 !== 'Estado de Cuenta') {
      console.log(`   ❌ ERROR: Encabezado incorrecto`);
    }

    // Get row 3 for saldo inicial
    const cellB3 = worksheet.getCell('B3').value;
    console.log(`   Saldo Inicial: ${cellB3}`);
    if (cellB3 && cellB3.toString().includes('Saldo Inicial: 0')) {
      console.log(`   ✅ Saldo Inicial = 0`);
    } else {
      console.log(`   ❌ ERROR: Saldo Inicial != 0`);
    }

    // Count data rows
    let dataRowCount = 0;
    let lastRow = 0;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 6) {
        const cell1 = row.getCell(1).value;
        if (cell1 && cell1.toString().includes('Sin movimientos')) {
          console.log(`   📝 Archivo sin movimientos`);
        } else if (cell1) {
          dataRowCount++;
          lastRow = rowNumber;
        }
      }
    });

    console.log(`   Filas de datos: ${dataRowCount}`);

    if (dataRowCount > 0) {
      // Check totals in last rows
      const cellA_last = worksheet.getCell(`A${lastRow}`).value.toString();
      const cellB_last = worksheet.getCell(`B${lastRow}`).value.toString();
      const cellC_last = worksheet.getCell(`C${lastRow}`).value.toString();

      console.log(`   Totales - Fila ${lastRow}:`);
      console.log(`      ${cellA_last}`);
      console.log(`      ${cellB_last}`);
      console.log(`      ${cellC_last}`);

      // Extract values
      const totalCargosMatch = cellA_last.match(/Total Cargos: ([\d.,]+)/);
      const totalAbonosMatch = cellB_last.match(/Total Abonos: ([\d.,]+)/);
      const saldoFinalMatch = cellC_last.match(/Saldo Final: ([\d.-]+)/);

      if (totalCargosMatch && totalAbonosMatch && saldoFinalMatch) {
        const totalCargos = parseFloat(totalCargosMatch[1]);
        const totalAbonos = parseFloat(totalAbonosMatch[1]);
        const saldoFinal = parseFloat(saldoFinalMatch[1]);

        const calculatedSaldoFinal = totalCargos - totalAbonos;
        console.log(`   Cálculo: ${totalCargos} - ${totalAbonos} = ${calculatedSaldoFinal}`);

        if (Math.abs(calculatedSaldoFinal - saldoFinal) < 0.01) {
          console.log(`   ✅ Saldo Final = Cargos - Abonos`);
        } else {
          console.log(`   ❌ ERROR: Saldo Final != Cargos - Abonos`);
        }
      }
    }

    // Check accounting order
    let previousDate = null;
    let previousType = null;
    let previousId = null;
    let orderCorrect = true;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 6) {
        const cell1 = row.getCell(1);
        const cell4 = row.getCell(4);
        const cell2 = row.getCell(2);

        const fecha = cell1 ? cell1.value : null;
        const tipo = cell4 ? cell4.value : null;
        const ref = cell2 ? cell2.value : null;
        const id = ref ? ref.toString().split(' - ')[0] || '' : '';

        if (fecha && typeof fecha === 'object' && !(fecha instanceof String)) {
          const dateValue = new Date(fecha);

          if (previousDate) {
            if (dateValue.getTime() < previousDate.getTime()) {
              console.log(`   ❌ ERROR: Orden incorrecto - fecha no ascendente`);
              orderCorrect = false;
            } else if (dateValue.getTime() === previousDate.getTime()) {
              // Same date - check Cargo before Abono
              if (tipo === 'Abono' && previousType === 'Cargo') {
                console.log(`   ❌ ERROR: Cargo debe venir antes que Abono en misma fecha`);
                orderCorrect = false;
              }
            }
          }

          previousDate = dateValue;
          previousType = tipo;
          previousId = id;
        }
      }
    });

    if (orderCorrect) {
      console.log(`   ✅ Orden contable correcto`);
    }

  } catch (error) {
    console.error(`❌ ${filename}: ${error.message}`);
  }
}

const files = ['estado_cuenta_unidad.xlsx', 'estado_cuenta_empresa.xlsx', 'estado_cuenta_proveedor.xlsx'];
for (const file of files) {
  validateExcel(file);
}