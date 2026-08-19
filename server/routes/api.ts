import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { getDb, saveDatabase, seedSampleDataIfEmpty } from '../db';
import {
  generateOperatorReport,
  generateProductReport,
  generateDashboardSummary,
  getUnmatchedRecords,
  ReportFilter,
} from '../reports';

const router = Router();

/**
 * GET /api/reports/operator
 * Returns Report 1: Por Operador
 */
router.get('/reports/operator', (req: Request, res: Response) => {
  try {
    const filter: ReportFilter = {
      dataInicio: req.query.dataInicio as string,
      dataFim: req.query.dataFim as string,
      operador: req.query.operador as string,
      produto: req.query.produto as string,
      usuario: req.query.usuario as string,
      supervisor: req.query.supervisor as string,
    };

    const report = generateOperatorReport(filter);
    return res.json(report);
  } catch (error: any) {
    console.error('Error generating operator report:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório por operador.' });
  }
});

/**
 * GET /api/reports/product
 * Returns Report 2: Por Produto
 */
router.get('/reports/product', (req: Request, res: Response) => {
  try {
    const filter: ReportFilter = {
      dataInicio: req.query.dataInicio as string,
      dataFim: req.query.dataFim as string,
      operador: req.query.operador as string,
      produto: req.query.produto as string,
      usuario: req.query.usuario as string,
      supervisor: req.query.supervisor as string,
    };

    const report = generateProductReport(filter);
    return res.json(report);
  } catch (error: any) {
    console.error('Error generating product report:', error);
    return res.status(500).json({ error: 'Erro ao gerar relatório por produto.' });
  }
});

/**
 * GET /api/reports/summary
 * Returns Dashboard Cards Summary
 */
router.get('/reports/summary', (req: Request, res: Response) => {
  try {
    const filter: ReportFilter = {
      dataInicio: req.query.dataInicio as string,
      dataFim: req.query.dataFim as string,
      operador: req.query.operador as string,
      produto: req.query.produto as string,
      usuario: req.query.usuario as string,
      supervisor: req.query.supervisor as string,
    };

    const summary = generateDashboardSummary(filter);
    return res.json(summary);
  } catch (error: any) {
    console.error('Error generating summary:', error);
    return res.status(500).json({ error: 'Erro ao gerar resumo.' });
  }
});

/**
 * GET /api/reports/unmatched
 * Returns unmatched records (nuvidio and pausas without registered operator)
 */
router.get('/reports/unmatched', (req: Request, res: Response) => {
  try {
    const filter: ReportFilter = {
      dataInicio: req.query.dataInicio as string,
      dataFim: req.query.dataFim as string,
    };

    const unmatched = getUnmatchedRecords(filter);
    return res.json(unmatched);
  } catch (error: any) {
    console.error('Error getting unmatched records:', error);
    return res.status(500).json({ error: 'Erro ao buscar registros sem operador.' });
  }
});

/**
 * GET /api/filters/options
 * Returns distinct values for dropdown filters (Operators, Products, Users)
 */
router.get('/filters/options', (req: Request, res: Response) => {
  try {
    const db = getDb();

    const operadores = db.operadores.map((o) => ({
      id: o.id,
      nome: o.nome,
      email: o.email,
      usuario: o.usuario,
      supervisor: o.supervisor || 'Não Informado',
    }));

    const produtos = Array.from(
      new Set(
        [
          ...db.pausas.map((p) => p.produto),
          ...db.operadores.map((o) => o.produto || ''),
        ].filter((p) => Boolean(p) && p !== 'Sem Produto')
      )
    ).sort();

    const usuarios = Array.from(
      new Set(
        [
          ...db.operadores.map((o) => o.usuario),
          ...db.pausas.map((p) => p.usuario),
        ].filter((u) => Boolean(u))
      )
    ).sort();

    const supervisores = Array.from(
      new Set(
        db.operadores
          .map((o) => o.supervisor || 'Não Informado')
          .filter((s) => Boolean(s))
      )
    ).sort();

    return res.json({
      operadores,
      produtos,
      usuarios,
      supervisores,
      totalOperadoresInDb: db.operadores.length,
      totalPausasInDb: db.pausas.length,
      totalNuvidioInDb: db.nuvidio.length,
      importacoes: db.importacoes,
    });
  } catch (error: any) {
    console.error('Error getting filter options:', error);
    return res.status(500).json({ error: 'Erro ao buscar opções de filtro.' });
  }
});

/**
 * GET /api/export/operator
 * Exports Operator Report to Excel .xlsx file
 */
router.get('/export/operator', async (req: Request, res: Response) => {
  try {
    const filter: ReportFilter = {
      dataInicio: req.query.dataInicio as string,
      dataFim: req.query.dataFim as string,
      operador: req.query.operador as string,
      produto: req.query.produto as string,
      usuario: req.query.usuario as string,
      supervisor: req.query.supervisor as string,
    };

    const rows = generateOperatorReport(filter);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Produtividade por Operador');

    worksheet.columns = [
      { header: 'Operador', key: 'operadorNome', width: 30 },
      { header: 'Supervisor', key: 'supervisor', width: 25 },
      { header: 'Usuário', key: 'usuario', width: 20 },
      { header: 'E-mail', key: 'operadorEmail', width: 35 },
      { header: 'Produto', key: 'produto', width: 20 },
      { header: 'Qtd Nuvidio', key: 'qtdNuvidio', width: 15 },
      { header: 'Tempo Nuvidio', key: 'tempoNuvidioFormatted', width: 18 },
      { header: 'Qtd Pausas', key: 'qtdPausas', width: 15 },
      { header: 'Tempo Pausas', key: 'tempoPausasFormatted', width: 18 },
      { header: 'Diferença', key: 'diferencaFormatted', width: 18 },
    ];

    // Style Header Row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E3A8A' }, // Dark Blue
    };

    rows.forEach((r) => {
      worksheet.addRow(r);
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio_produtividade_operadores_${Date.now()}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('Error exporting operator report:', error);
    res.status(500).json({ error: 'Erro ao exportar relatório.' });
  }
});

/**
 * GET /api/export/product
 * Exports Product Report to Excel .xlsx file
 */
router.get('/export/product', async (req: Request, res: Response) => {
  try {
    const filter: ReportFilter = {
      dataInicio: req.query.dataInicio as string,
      dataFim: req.query.dataFim as string,
      operador: req.query.operador as string,
      produto: req.query.produto as string,
      usuario: req.query.usuario as string,
    };

    const rows = generateProductReport(filter);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Produtividade por Produto');

    worksheet.columns = [
      { header: 'Produto', key: 'produto', width: 25 },
      { header: 'Qtd Nuvidio', key: 'qtdNuvidio', width: 15 },
      { header: 'Tempo Nuvidio', key: 'tempoNuvidioFormatted', width: 20 },
      { header: 'Qtd Pausas', key: 'qtdPausas', width: 15 },
      { header: 'Tempo Pausas', key: 'tempoPausasFormatted', width: 20 },
      { header: 'Diferença', key: 'diferencaFormatted', width: 20 },
      { header: 'Diferença %', key: 'diferencaPercFormatted', width: 18 },
    ];

    // Style Header Row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '065F46' }, // Dark Green
    };

    rows.forEach((r) => {
      worksheet.addRow(r);
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio_produtividade_produtos_${Date.now()}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('Error exporting product report:', error);
    res.status(500).json({ error: 'Erro ao exportar relatório.' });
  }
});

/**
 * POST /api/database/reset
 * Resets database to sample data or empty state
 */
router.post('/database/reset', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const mode = req.body.mode; // 'empty' or 'seed'

    if (mode === 'empty') {
      db.operadores = [];
      db.pausas = [];
      db.nuvidio = [];
      db.importacoes = [];
    } else {
      db.operadores = [];
      db.pausas = [];
      db.nuvidio = [];
      db.importacoes = [];
      seedSampleDataIfEmpty();
    }

    saveDatabase();

    return res.json({
      success: true,
      message: mode === 'empty' ? 'Banco de dados zerado com sucesso.' : 'Dados de exemplo restaurados com sucesso.',
    });
  } catch (error: any) {
    console.error('Error resetting database:', error);
    return res.status(500).json({ error: 'Erro ao reiniciar banco de dados.' });
  }
});

export default router;
