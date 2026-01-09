import ExcelJS from 'exceljs';

async function validateExcel(filename) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filename);
    const worksheet = workbook.getWorksheet(1);

    console.log(`\n📋 ${filename}:`);

    // Check headers
    const cellA1 = worksheet.getCell('A1').value;
    console.log(`   Encabezado: "${cellA1}"`);

    // Check saldo inicial
    const row3 = worksheet.getRow(3);
    const cellB3 = row3.getCell(2).value;
    console.log(`   Fila 3: "${cellB3}"`);

    if (cellB3 && cellB3.toString().includes('Saldo Inicial: 0')) {
      console.log(`   ✅ Saldo Inicial = 0`);
    } else {
      console.log(`   ⚠ Saldo Inicial no contiene '0'`);
    }

    // Count rows and check for "Sin movimientos"
    let hasNoMovements = false;
    let rowCount = 0;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 6) {
        const cellA = row.getCell(1).value;
        if (cellA && cellA.toString().includes('Sin movimientos')) {
          hasNoMovements = true;
        } else if (cellA) {
          rowCount++;
        }
      }
    });

    console.log(`   Filas de datos: ${rowCount}`);
    if (hasNoMovements) {
      console.log(`   📝 Archivo contiene: "Sin movimientos en el período seleccionado"`);
    }

    if (rowCount > 0) {
      // Check last few rows for totals
      const totalRows = worksheet.rowCount;
      console.log(`   Última fila: ${totalRows}`);

      const lastRow = worksheet.getRow(totalRows - 1);
      const cellA = lastRow.getCell(1).value;
      const cellB = lastRow.getCell(2).value;
      const cellC = lastRow.getCell(3).value;

      console.log(`   Totales:`);
      console.log(`      A: "${cellA}"`);
      console.log(`      B: "${cellB}"`);
      console.log(`      C: "${cellC}"`);

      if (cellC && cellC.toString().includes('Saldo Final')) {
        console.log(`   ✅ Contiene Saldo Final`);
      }
    }

  } catch (error) {
    console.error(`❌ Error validando ${filename}:`, error.message);
  }
}

const files = ['estado_cuenta_unidad.xlsx', 'estado_cuenta_empresa.xlsx', 'estado_cuenta_proveedor.xlsx'];
for (const file of files) {
  validateExcel(file);
}