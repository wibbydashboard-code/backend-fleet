import ExcelJS from 'exceljs';
import { getCompanies, createUnit, checkExistingUnits } from './repository.js';

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

export async function processBatchUpload(filePath, tenantId = 1) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet('Unidades') || workbook.worksheets[0];
    const results = {
        total: 0,
        inserted: 0,
        duplicados_en_excel: 0,
        duplicados_en_bd: 0,
        failed: 0,
        errors: []
    };

    const rowsToProcess = [];
    const seenEcos = new Set();
    // const seenPlates = new Set(); // Placas también deben ser únicas

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        // Cols: 1=Eco, 2=Plate, 3=CompId, 4=Type, 5=Brand, 6=Model, 7=Year, 8=Serial
        const rawEco = row.getCell(1).value;

        // Si no hay económico, asumimos fila vacía
        if (!rawEco) return;

        const rowData = {
            economic_number: rawEco?.toString().trim(),
            license_plate: row.getCell(2).value?.toString().trim(),
            assigned_company_id: row.getCell(3).value, // ID Numérico
            type: row.getCell(4).value?.toString().trim(),
            brand: row.getCell(5).value?.toString().trim() || '',
            model: row.getCell(6).value?.toString().trim() || '',
            year: row.getCell(7).value?.toString().trim() || new Date().getFullYear().toString(),
            serial_number: row.getCell(8).value?.toString().trim() || '',
            tenantId: tenantId
        };

        // 1. Detección Duplicados en Excel (solo Económico es crítico aquí, Placas opcional)
        // El usuario mencionó "Numero económico duplicado".
        if (seenEcos.has(rowData.economic_number)) {
            results.duplicados_en_excel++;
            results.failed++;
            results.errors.push({
                fila: rowNumber,
                campo: 'numero_economico',
                valor: rowData.economic_number,
                motivo: 'Duplicado en el mismo archivo (Excel)'
            });
            // No procesamos inserción si ya está duplicado en archivo
        } else {
            seenEcos.add(rowData.economic_number);
            rowsToProcess.push({ rowNumber, data: rowData });
        }
    });

    // 2. Detección Duplicados en BD (Bulk Check)
    if (rowsToProcess.length > 0) {
        const ecosToCheck = rowsToProcess.map(r => r.data.economic_number);
        const platesToCheck = rowsToProcess.map(r => r.data.license_plate).filter(p => p); // Filtrar vacíos

        try {
            const existingUnits = await checkExistingUnits(ecosToCheck, platesToCheck, tenantId);

            // Sets para búsqueda rápida
            const existingEcosSet = new Set(existingUnits.map(u => u.economic_number));
            const existingPlatesSet = new Set(existingUnits.map(u => u.license_plate));

            const finalRowsToInsert = [];

            for (const item of rowsToProcess) {
                let isDbDupe = false;

                if (existingEcosSet.has(item.data.economic_number)) {
                    isDbDupe = true;
                    results.duplicados_en_bd++;
                    results.failed++;
                    results.errors.push({
                        fila: item.rowNumber,
                        campo: 'numero_economico',
                        valor: item.data.economic_number,
                        motivo: 'Duplicado en base de datos'
                    });
                } else if (item.data.license_plate && existingPlatesSet.has(item.data.license_plate)) {
                    isDbDupe = true;
                    results.duplicados_en_bd++;
                    results.failed++;
                    results.errors.push({
                        fila: item.rowNumber,
                        campo: 'placas',
                        valor: item.data.license_plate,
                        motivo: 'Duplicado en base de datos'
                    });
                }

                if (!isDbDupe) {
                    finalRowsToInsert.push(item);
                }
            }

            // 3. Insertar válidos
            for (const item of finalRowsToInsert) {
                try {
                    // Validaciones obligatorias
                    if (!item.data.economic_number || !item.data.license_plate || !item.data.assigned_company_id || !item.data.type) {
                        throw new Error('Faltan campos obligatorios (Económico, Placas, ID Empresa, Tipo)');
                    }

                    await createUnit(item.data);
                    results.inserted++;

                } catch (err) {
                    results.failed++;
                    let msg = err.message;
                    // Mapeo errores conocidos
                    if (msg === 'DUPLICATE_ECONOMIC_NUMBER') msg = 'Número económico duplicado (Race condition)';
                    if (msg === 'DUPLICATE_LICENSE_PLATE') msg = 'Placas duplicadas (Race condition)';
                    if (msg.includes('foreign key') || msg === 'INVALID_FOREIGN_KEY') msg = 'ID de Empresa no válido';

                    results.errors.push({
                        fila: item.rowNumber,
                        campo: 'general',
                        valor: 'N/A',
                        motivo: msg
                    });
                }
            }

        } catch (error) {
            // Si falla el check bulk, abortamos? O procesamos uno a uno?
            // Mejor log y error general
            console.error(error);
            throw new Error('Error verificando duplicados en BD');
        }
    }

    results.total = results.inserted + results.failed;
    return results;
}
