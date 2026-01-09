import ExcelJS from 'exceljs';
import { getCompanies, createUnit } from './repository.js';

export const UNIT_TYPES = [
    'Tractocamión',
    'Remolque',
    'Dolly',
    'Vehículo Ligero',
    'Maquinaria',
    'Otro'
];

export async function generateUnitTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Unidades');

    // Definir Columnas
    worksheet.columns = [
        { header: 'No. Económico (Obligatorio)', key: 'economic_number', width: 25 },
        { header: 'Placas (Obligatorio)', key: 'license_plate', width: 20 },
        { header: 'ID Empresa (Obligatorio)', key: 'company_id', width: 20 },
        { header: 'Tipo (Obligatorio)', key: 'type', width: 20 },
        { header: 'Marca', key: 'brand', width: 15 },
        { header: 'Modelo', key: 'model', width: 15 },
        { header: 'Año', key: 'year', width: 10 },
        { header: 'No. Serie', key: 'serial_number', width: 25 },
    ];

    // Estilos de Header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' } // Azul oscuro
    };

    // Obtener catálogos para validaciones
    const companies = await getCompanies();

    // Hoja de Catálogos (Oculta)
    const catalogSheet = workbook.addWorksheet('Catalogos');
    catalogSheet.state = 'hidden';

    catalogSheet.getCell('A1').value = 'EMPRESAS';
    catalogSheet.getCell('B1').value = 'TIPOS';

    // Llenar catálogos
    companies.forEach((c, idx) => {
        // Formato: "ID: Nombre" para que el usuario sepa cuál elegir, pero necesitamos el ID.
        // ExcelJS DataValidation con lista suele ser texto.
        // Estrategia: Pondremos solo el ID en la lista visible de validación si queremos insertar directo,
        // O mejor, pondremos una hoja de referencia visible "Ayuda" y en la hoja de carga pedimos solo el ID numérico.
        // Para simplificar y robustez: Usaremos una columna de "Ayuda Empresas" en la hoja principal (Lejana) o comentario.

        // Mejor enfoque: DataValidation List con los IDs de empresas válidos.
        catalogSheet.getCell(`A${idx + 2}`).value = c.id;
        catalogSheet.getCell(`C${idx + 2}`).value = `${c.id} - ${c.name}`; // Referencia visual
    });

    UNIT_TYPES.forEach((t, idx) => {
        catalogSheet.getCell(`B${idx + 2}`).value = t;
    });

    // Validaciones
    // Columna Tipo (D)
    const typeCol = worksheet.getColumn('D');
    typeCol.eachCell((cell, rowNumber) => {
        if (rowNumber > 1) {
            cell.dataValidation = {
                type: 'list',
                allowBlank: false,
                formulae: [`=Catalogos!$B$2:$B$${UNIT_TYPES.length + 1}`]
            };
        }
    });

    // Columna Empresa (C) - Restringir a IDs existentes
    const companyCol = worksheet.getColumn('C');
    companyCol.eachCell((cell, rowNumber) => {
        if (rowNumber > 1) {
            // Nota: Excel a veces molesta con listas de otra hoja si no son rangos nombrados.
            // Intentaremos rango directo. Si falla, el usuario debe meter el ID manual.
            // Agregaremos comentarios de ayuda.
            cell.note = 'Ingrese el ID numérico de la empresa (ver hoja Referencia)';
        }
    });

    // Agregar Hoja de Referencia Visible
    const refSheet = workbook.addWorksheet('Referencia Empresas');
    refSheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Nombre Empresa', key: 'name', width: 40 }
    ];
    companies.forEach(c => refSheet.addRow({ id: c.id, name: c.name }));
    refSheet.getRow(1).font = { bold: true };

    return workbook;
}

export async function processBatchUpload(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet('Unidades') || workbook.worksheets[0];
    const results = {
        total: 0,
        inserted: 0,
        failed: 0,
        errors: []
    };

    const rowsToProcess = [];

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        // Get values (ExcelJS indices are 1-based)
        // Cols: 1=Eco, 2=Plate, 3=CompId, 4=Type, 5=Brand, 6=Model, 7=Year, 8=Serial
        const rawEco = row.getCell(1).value;

        // Si no hay económico, asumimos fila vacía
        if (!rawEco) return;

        const rowData = {
            economic_number: rawEco?.toString(),
            license_plate: row.getCell(2).value?.toString(),
            assigned_company_id: row.getCell(3).value, // ID Numérico
            type: row.getCell(4).value?.toString(),
            brand: row.getCell(5).value?.toString() || '',
            model: row.getCell(6).value?.toString() || '',
            year: row.getCell(7).value?.toString() || new Date().getFullYear().toString(),
            serial_number: row.getCell(8).value?.toString() || '',
        };

        rowsToProcess.push({ rowNumber, data: rowData });
    });

    results.total = rowsToProcess.length;

    // Procesar secuencialmente para no saturar connection pool
    for (const item of rowsToProcess) {
        try {
            // Validaciones básicas
            if (!item.data.economic_number || !item.data.license_plate || !item.data.assigned_company_id || !item.data.type) {
                throw new Error('Faltan campos obligatorios (Económico, Placas, ID Empresa, Tipo)');
            }

            // Intentar Insertar
            await createUnit(item.data);
            results.inserted++;

        } catch (err) {
            results.failed++;
            let msg = err.message;
            if (msg === 'DUPLICATE_ECONOMIC_NUMBER') msg = 'Número económico duplicado';
            if (msg === 'DUPLICATE_LICENSE_PLATE') msg = 'Placas duplicadas';
            if (msg.includes('foreign key constraint fails')) msg = 'ID de Empresa no válido';

            results.errors.push({
                row: item.rowNumber,
                economic_number: item.data.economic_number,
                message: msg
            });
        }
    }

    return results;
}
