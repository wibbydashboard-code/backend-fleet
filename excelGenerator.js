import ExcelJS from 'exceljs';
import moment from 'moment';

export async function generateExcel(data, entidad_tipo, entidad_id, periodo_inicio, periodo_fin, saldoInicial) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Estado de Cuenta');

  // row 1: Título
  const row1 = worksheet.getRow(1);
  row1.getCell(1).value = 'Estado de Cuenta';
  worksheet.mergeCells('A1:H1');
  row1.getCell(1).font = { size: 14, bold: true };
  row1.getCell(1).alignment = { horizontal: 'center' };

  // row 2: Metadatos
  const row2 = worksheet.getRow(2);
  row2.getCell(1).value = `Entidad: ${entidad_tipo.charAt(0).toUpperCase() + entidad_tipo.slice(1)} ${entidad_id}`;
  row2.getCell(2).value = `Tipo: ${entidad_tipo.charAt(0).toUpperCase() + entidad_tipo.slice(1)}`;
  row2.getCell(3).value = `Fecha de Generación: ${moment().format('DD/MM/YYYY HH:mm')}`;

  // row 3: Período y saldo inicial
  const row3 = worksheet.getRow(3);
  row3.getCell(1).value = `Período: ${moment(periodo_inicio).format('DD/MM/YYYY')} - ${moment(periodo_fin).format('DD/MM/YYYY')}`;
  row3.getCell(2).value = `Saldo Inicial: ${saldoInicial}`;

  // row 4: Vacío

  // row 5: Headers
  const row5 = worksheet.getRow(5);
  row5.getCell(1).value = 'Fecha';
  row5.getCell(2).value = 'Referencia';
  row5.getCell(3).value = 'Descripción';
  row5.getCell(4).value = 'Tipo Movimiento';
  row5.getCell(5).value = 'Monto';
  row5.getCell(6).value = 'Saldo Acumulado';
  row5.getCell(7).value = 'Días de Atraso';
  row5.getCell(8).value = 'Estatus';
  [1, 2, 3, 4, 5, 6, 7, 8].forEach(col => {
    row5.getCell(col).font = { bold: true };
  });

  // row 6 en adelante: Movimientos
  let currentRow = 6;
  if (data.movimientos.length === 0) {
    worksheet.getRow(currentRow).getCell(1).value = 'Sin movimientos en el período seleccionado';
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
  } else {
    data.movimientos.forEach(mov => {
      const rowMov = worksheet.getRow(currentRow);
      rowMov.getCell(1).value = moment(mov.fecha).format('DD/MM/YYYY');
      rowMov.getCell(2).value = mov.referencia;
      rowMov.getCell(3).value = mov.descripcion;
      rowMov.getCell(4).value = mov.tipo_movimiento;
      rowMov.getCell(5).value = mov.monto;
      rowMov.getCell(6).value = mov.saldo_acumulado;
      rowMov.getCell(7).value = mov.dias_atraso;
      rowMov.getCell(8).value = mov.estatus;
      currentRow++;
    });
  }

  // Totales: Filas n+1 y n+2
  const totalRow1 = currentRow;
  const rowTotal1 = worksheet.getRow(totalRow1);
  rowTotal1.getCell(1).value = 'Total Cargos:';
  rowTotal1.getCell(2).value = data.total_cargos;
  rowTotal1.getCell(3).value = 'Total Abonos:';
  rowTotal1.getCell(4).value = data.total_abonos;
  rowTotal1.getCell(5).value = 'Saldo Final:';
  rowTotal1.getCell(6).value = data.saldo_final;

  const totalRow2 = totalRow1 + 1;
  const rowTotal2 = worksheet.getRow(totalRow2);
  rowTotal2.getCell(1).value = 'Días de Atraso Promedio:';
  rowTotal2.getCell(2).value = data.dias_atraso_promedio;
  rowTotal2.getCell(3).value = 'Monto Total Pendiente:';
  rowTotal2.getCell(4).value = data.monto_total_pendiente;

  return await workbook.xlsx.writeBuffer();
}