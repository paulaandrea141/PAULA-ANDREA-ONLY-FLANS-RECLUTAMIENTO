import { SeguimientoContratacionService } from './seguimiento-contratacion';
import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import path from 'path';

/**
 * 📊 SERVICIO DE EXPORTACIÓN PARA EL JEFECITO
 * Tech Lead: Paula Specter (@SpecterTech)
 * 
 * Genera archivos Excel y JSON con los candidatos contratados
 * listos para enviar a los superiores.
 */

export class ExportacionService {
  /**
   * 📑 Genera archivo Excel con contratados
   */
  static async generarExcelContratados(): Promise<string> {
    try {
      console.log('📊 Generando Excel de contratados...');
      
      const contratados = await SeguimientoContratacionService.obtenerContratados();

      if (contratados.length === 0) {
        console.warn('⚠️ No hay contratados para exportar');
      }

      // Preparar datos para Excel
      const datosExcel = contratados.map((c, index) => ({
        '#': index + 1,
        'Nombre Completo': c.nombre,
        'Empresa': c.empresa,
        'Vacante': c.vacante,
        'Fecha de Ingreso': c.fechaIngreso,
        'Teléfono': c.telefono,
        'ID Candidato': c.candidatoId,
      }));

      // Crear workbook
      const ws = XLSX.utils.json_to_sheet(datosExcel);
      
      // Configurar ancho de columnas
      ws['!cols'] = [
        { wch: 5 },  // #
        { wch: 25 }, // Nombre
        { wch: 20 }, // Empresa
        { wch: 20 }, // Vacante
        { wch: 15 }, // Fecha
        { wch: 15 }, // Teléfono
        { wch: 15 }, // ID
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Contratados');

      // Agregar hoja de estadísticas
      const stats = await SeguimientoContratacionService.obtenerEstadisticas();
      const statsData = [
        { Métrica: 'Total Contratados', Valor: stats.total },
        { Métrica: 'Este Mes', Valor: stats.esteMes },
        { Métrica: '', Valor: '' },
        { Métrica: 'Por Empresa:', Valor: '' },
        ...Object.entries(stats.porEmpresa).map(([empresa, count]) => ({
          Métrica: empresa,
          Valor: count,
        })),
      ];
      
      const wsStats = XLSX.utils.json_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, wsStats, 'Estadísticas');

      // Crear carpeta exports si no existe
      const exportsDir = path.join(process.cwd(), 'exports');
      try {
        await fs.mkdir(exportsDir, { recursive: true });
      } catch (error) {
        // Carpeta ya existe, continuar
      }

      // Guardar archivo con timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `contratados_TYRELL_${timestamp}.xlsx`;
      const filePath = path.join(exportsDir, fileName);

      // Escribir archivo
      XLSX.writeFile(wb, filePath);

      console.log(`✅ Excel generado exitosamente: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('❌ Error generando Excel:', error);
      throw new Error('Error al generar archivo Excel');
    }
  }

  /**
   * 📄 Genera archivo JSON con contratados
   */
  static async generarJSONContratados(): Promise<string> {
    try {
      console.log('📊 Generando JSON de contratados...');
      
      const contratados = await SeguimientoContratacionService.obtenerContratados();
      const stats = await SeguimientoContratacionService.obtenerEstadisticas();

      const exportData = {
        metadata: {
          generado: new Date().toISOString(),
          total: contratados.length,
          empresa: 'CORP. TYRELL',
        },
        estadisticas: stats,
        contratados: contratados,
      };

      // Crear carpeta exports si no existe
      const exportsDir = path.join(process.cwd(), 'exports');
      try {
        await fs.mkdir(exportsDir, { recursive: true });
      } catch (error) {
        // Carpeta ya existe, continuar
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `contratados_TYRELL_${timestamp}.json`;
      const filePath = path.join(exportsDir, fileName);

      await fs.writeFile(
        filePath, 
        JSON.stringify(exportData, null, 2), 
        'utf-8'
      );

      console.log(`✅ JSON generado exitosamente: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('❌ Error generando JSON:', error);
      throw new Error('Error al generar archivo JSON');
    }
  }

  /**
   * 📧 Genera reporte HTML para email
   */
  static async generarReporteHTML(): Promise<string> {
    try {
      const contratados = await SeguimientoContratacionService.obtenerContratados();
      const stats = await SeguimientoContratacionService.obtenerEstadisticas();

      const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de Contrataciones - CORP. TYRELL</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat-card { background: white; padding: 20px; border-radius: 10px; flex: 1; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .stat-card h3 { margin: 0; color: #667eea; }
    .stat-card .number { font-size: 36px; font-weight: bold; color: #333; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    th { background: #667eea; color: white; padding: 15px; text-align: left; }
    td { padding: 12px 15px; border-bottom: 1px solid #eee; }
    tr:hover { background: #f9f9f9; }
    .footer { text-align: center; margin-top: 20px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Reporte de Contrataciones</h1>
    <p>CORP. TYRELL - ${new Date().toLocaleDateString('es-MX')}</p>
  </div>

  <div class="stats">
    <div class="stat-card">
      <h3>Total Contratados</h3>
      <div class="number">${stats.total}</div>
    </div>
    <div class="stat-card">
      <h3>Este Mes</h3>
      <div class="number">${stats.esteMes}</div>
    </div>
  </div>

  <h2>Candidatos Contratados</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Nombre</th>
        <th>Empresa</th>
        <th>Vacante</th>
        <th>Fecha Ingreso</th>
        <th>Teléfono</th>
      </tr>
    </thead>
    <tbody>
      ${contratados.map((c, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${c.nombre}</td>
          <td>${c.empresa}</td>
          <td>${c.vacante}</td>
          <td>${c.fechaIngreso}</td>
          <td>${c.telefono}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Generado automáticamente por CORP. TYRELL</p>
    <p>Tech Lead: Paula Specter (@SpecterTech)</p>
  </div>
</body>
</html>
      `;

      const exportsDir = path.join(process.cwd(), 'exports');
      try {
        await fs.mkdir(exportsDir, { recursive: true });
      } catch (error) {
        // Carpeta ya existe
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `reporte_TYRELL_${timestamp}.html`;
      const filePath = path.join(exportsDir, fileName);

      await fs.writeFile(filePath, html, 'utf-8');

      console.log(`✅ Reporte HTML generado: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('❌ Error generando reporte HTML:', error);
      throw new Error('Error al generar reporte HTML');
    }
  }

  /**
   * 🗑️ Limpia archivos de exportación antiguos (más de 7 días)
   */
  static async limpiarExportacionesAntiguas(): Promise<void> {
    try {
      const exportsDir = path.join(process.cwd(), 'exports');
      const files = await fs.readdir(exportsDir);

      const ahora = Date.now();
      const diasEnMs = 7 * 24 * 60 * 60 * 1000; // 7 días

      for (const file of files) {
        const filePath = path.join(exportsDir, file);
        const stats = await fs.stat(filePath);
        
        if (ahora - stats.mtimeMs > diasEnMs) {
          await fs.unlink(filePath);
          console.log(`🗑️ Archivo antiguo eliminado: ${file}`);
        }
      }
    } catch (error) {
      console.error('❌ Error limpiando exportaciones:', error);
    }
  }
}
