# Backup Documentation

## Fase 1 - Backup Inicial

**Fecha**: 2026-01-09
**Estado**: Backup manual requerido (TiDB Cloud)
**Archivo**: backup-fase1-20260109.sql

## Instrucciones para Backup Manual (TiDB Cloud)

1. Entrar a TiDB Cloud Console
2. Seleccionar el cluster de PCAS
3. Ir a "Backup & Restore"
4. Crear nuevo backup manual
5. Guardar como: `backup-fase1-20260109.sql`
6. Documentar fecha y hora

## NOTA:
Este backup debe guardarse antes de cualquier modificación de esquema en Fase 3a.

## Backup Points:
- Fase 1: Preparación (este backup)
- Fase 3a: Antes de agregar tenant_id
- Fase 7: Antes de cambiar frontend
