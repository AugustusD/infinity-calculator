/**
 * exportExcel.ts
 * Generates a two-sheet Excel workbook:
 *   Sheet 1 — Material Quote (BOM + job info)
 *   Sheet 2 — Vinyl Optimization Validation (glass insert lengths vs post counts)
 */

import ExcelJS from 'exceljs';
import type { ConfigInputs, CalculationResult } from './calculator';

interface JobInfo {
  dealerName: string;
  jobReference: string;
  color: string;
}

// Brand colours
const GOLD = 'FFB69A5A';
const BLACK = 'FF111111';
const WHITE = 'FFFFFFFF';
const LIGHT_GREY = 'FFF5F5F5';
const MID_GREY = 'FF6B6B6B';
const WARN_BG = 'FFFFF3CD';
const WARN_FG = 'FF856404';
const OK_BG = 'FFD4EDDA';
const OK_FG = 'FF155724';

function headerFill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function applyBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFD8D8D8' } },
    bottom: { style: 'thin', color: { argb: 'FFD8D8D8' } },
    left: { style: 'thin', color: { argb: 'FFD8D8D8' } },
    right: { style: 'thin', color: { argb: 'FFD8D8D8' } },
  };
}

function setRowHeight(row: ExcelJS.Row, h: number) {
  row.height = h;
}

export async function exportToExcel(
  config: ConfigInputs,
  result: CalculationResult,
  jobInfo: JobInfo,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Innovative Aluminum Systems';
  wb.created = new Date();

  // ============================================================
  // SHEET 1 — Material Quote
  // ============================================================
  const ws1 = wb.addWorksheet('Material Quote', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
  });
  ws1.columns = [
    { key: 'a', width: 40 },
    { key: 'b', width: 10 },
    { key: 'c', width: 14 },
    { key: 'd', width: 14 },
  ];

  // --- Title block ---
  const titleRow = ws1.addRow(['INFINITY GLASS RAILING — MATERIAL QUOTE', '', '', '']);
  titleRow.getCell(1).font = { name: 'Arial', bold: true, size: 14, color: { argb: BLACK } };
  titleRow.getCell(1).fill = headerFill(GOLD);
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  ws1.mergeCells(`A${titleRow.number}:D${titleRow.number}`);
  setRowHeight(titleRow, 24);

  // --- Job info block ---
  const infoData = [
    ['Dealer', jobInfo.dealerName || '—'],
    ['Job Reference', jobInfo.jobReference || '—'],
    ['Powder Coat Color', jobInfo.color || '—'],
    ['Mount Type', config.mountType === 'surface' ? 'Surface Mount' : 'Fascia Mount'],
    ['Rail Height', `${config.railHeight}"`],
    ['Glass Thickness', `${config.glassThickness}mm`],
    ['Country / Code', config.country === 'CA' ? 'Canada (NBC)' : 'United States (IRC)'],
    ['Discount', config.discountLevel > 0 ? `${(config.discountLevel * 100).toFixed(1)}%` : 'None'],
    ['Ship Via Courier', config.shipViaCourier ? 'Yes' : 'No'],
    ['Date', new Date().toLocaleDateString('en-CA')],
  ];
  infoData.forEach(([label, value]) => {
    const r = ws1.addRow([label, '', value, '']);
    ws1.mergeCells(`C${r.number}:D${r.number}`);
    r.getCell(1).font = { name: 'Arial', bold: true, size: 9, color: { argb: MID_GREY } };
    r.getCell(3).font = { name: 'Arial', size: 9, color: { argb: BLACK } };
    r.getCell(1).fill = headerFill(LIGHT_GREY);
    setRowHeight(r, 15);
  });

  ws1.addRow([]);

  // --- BOM header ---
  const bomHeader = ws1.addRow(['Description', 'QTY', 'Unit Price', 'Total']);
  bomHeader.eachCell(cell => {
    cell.font = { name: 'Arial', bold: true, size: 9, color: { argb: WHITE } };
    cell.fill = headerFill(BLACK);
    cell.alignment = { horizontal: cell.col === 'A' ? 'left' : 'right', vertical: 'middle' };
    applyBorder(cell);
  });
  setRowHeight(bomHeader, 18);

  // --- BOM rows ---
  result.lineItems.forEach((item, idx) => {
    const r = ws1.addRow([
      item.description,
      item.qty % 1 === 0 ? item.qty : +item.qty.toFixed(2),
      item.unitCost,
      item.total + (item.paintCost || 0),
    ]);
    r.getCell(1).font = { name: 'Arial', size: 9 };
    r.getCell(2).font = { name: 'Arial', size: 9 };
    r.getCell(3).font = { name: 'Arial', size: 9 };
    r.getCell(4).font = { name: 'Arial', size: 9, bold: true };
    r.getCell(3).numFmt = '$#,##0.00';
    r.getCell(4).numFmt = '$#,##0.00';
    r.getCell(2).alignment = { horizontal: 'right' };
    r.getCell(3).alignment = { horizontal: 'right' };
    r.getCell(4).alignment = { horizontal: 'right' };
    if (idx % 2 === 0) {
      r.eachCell(c => { c.fill = headerFill(LIGHT_GREY); });
    }
    r.eachCell(c => applyBorder(c));
    setRowHeight(r, 15);
  });

  // --- Total row ---
  const totalRow = ws1.addRow(['TOTAL JOB COST', '', '', result.jobCost]);
  ws1.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
  totalRow.getCell(1).font = { name: 'Arial', bold: true, size: 10, color: { argb: WHITE } };
  totalRow.getCell(4).font = { name: 'Arial', bold: true, size: 10, color: { argb: WHITE } };
  totalRow.getCell(4).numFmt = '$#,##0.00';
  totalRow.getCell(4).alignment = { horizontal: 'right' };
  totalRow.eachCell(c => {
    c.fill = headerFill(BLACK);
    applyBorder(c);
  });
  setRowHeight(totalRow, 20);

  ws1.addRow([]);

  // --- Fasteners note ---
  if (result.deckFasteners > 0 || result.wallFasteners > 0) {
    const fnRow = ws1.addRow([
      `Note: ${result.deckFasteners} deck fasteners required (not included)` +
        (result.wallFasteners > 0 ? ` · ${result.wallFasteners} wall fasteners required (not included)` : ''),
    ]);
    ws1.mergeCells(`A${fnRow.number}:D${fnRow.number}`);
    fnRow.getCell(1).font = { name: 'Arial', italic: true, size: 8, color: { argb: MID_GREY } };
    setRowHeight(fnRow, 13);
  }

  // --- Disclaimer ---
  const disc = ws1.addRow([
    'Glass is not included with the Infinity system. Pricing based on 2026 Dealer Price List. ' +
    'Please ensure topless rail fastening details are acceptable to local building authorities. ' +
    'This calculator is for material estimation purposes — verify final sales order for accuracy.',
  ]);
  ws1.mergeCells(`A${disc.number}:D${disc.number}`);
  disc.getCell(1).font = { name: 'Arial', italic: true, size: 7.5, color: { argb: MID_GREY } };
  disc.getCell(1).alignment = { wrapText: true };
  setRowHeight(disc, 30);

  // ============================================================
  // SHEET 2 — Vinyl Optimization Validation
  // ============================================================
  const ws2 = wb.addWorksheet('Vinyl Optimization');
  ws2.columns = [
    { key: 'a', width: 36 },
    { key: 'b', width: 16 },
    { key: 'c', width: 16 },
    { key: 'd', width: 22 },
  ];

  const t2 = ws2.addRow(['VINYL (GLASS INSERT) OPTIMIZATION VALIDATION', '', '', '']);
  t2.getCell(1).font = { name: 'Arial', bold: true, size: 13, color: { argb: BLACK } };
  t2.getCell(1).fill = headerFill(GOLD);
  ws2.mergeCells(`A${t2.number}:D${t2.number}`);
  setRowHeight(t2, 22);

  ws2.addRow([]);

  // --- Section: Post counts ---
  const ph = ws2.addRow(['Post / Track Counts', 'Quantity', '', '']);
  ph.getCell(1).font = { name: 'Arial', bold: true, size: 9, color: { argb: WHITE } };
  ph.getCell(2).font = { name: 'Arial', bold: true, size: 9, color: { argb: WHITE } };
  ph.eachCell(c => { c.fill = headerFill(BLACK); applyBorder(c); });
  ws2.mergeCells(`C${ph.number}:D${ph.number}`);
  setRowHeight(ph, 16);

  const q = config.quantities;
  const addons = config.addOns;
  const postRows: [string, number][] = [
    ['Mid Posts', q.midPosts],
    ['End Posts', q.endPosts],
    ['Outside Corner Posts', q.outsideCornerPosts],
    ['Inside Corner Posts', q.insideCornerPosts],
    ['Wall Tracks', q.wallTracks],
    ['2.5" End Left Posts', q.endPostsLeft25],
    ['2.5" End Right Posts', q.endPostsRight25],
  ];
  postRows.forEach(([label, val], idx) => {
    const r = ws2.addRow([label, val, '', '']);
    r.getCell(1).font = { name: 'Arial', size: 9 };
    r.getCell(2).font = { name: 'Arial', size: 9, bold: true };
    r.getCell(2).alignment = { horizontal: 'right' };
    if (idx % 2 === 0) r.eachCell(c => { c.fill = headerFill(LIGHT_GREY); });
    r.eachCell(c => applyBorder(c));
    setRowHeight(r, 14);
  });

  ws2.addRow([]);

  // --- Section: Vinyl cut lengths ---
  const vh = ws2.addRow(['Vinyl Insert Cut Lengths', 'Length (in)', 'Cuts / Length', 'Pieces Needed']);
  vh.eachCell(c => {
    c.font = { name: 'Arial', bold: true, size: 9, color: { argb: WHITE } };
    c.fill = headerFill(BLACK);
    c.alignment = { horizontal: c.col === 'A' ? 'left' : 'right', vertical: 'middle' };
    applyBorder(c);
  });
  setRowHeight(vh, 16);

  const totalPostPieces = q.midPosts * 2 + q.endPosts + q.outsideCornerPosts * 2 + q.insideCornerPosts * 2;
  const totalTrackPieces = q.wallTracks + q.endPostsLeft25 + q.endPostsRight25;
  const totalEndPostPieces = Math.max(0, q.endPosts - addons.removeTrackFromPost);

  const courierLen = result.courierLength;
  const cutsPost = courierLen > 0 ? Math.floor(courierLen / (result.glassInsertLength + 0.125)) : 0;
  const cutsEnd = courierLen > 0 ? Math.floor(courierLen / (result.endPostInsertLength + 0.125)) : 0;
  const cutsTrack = courierLen > 0 ? Math.floor(courierLen / (result.glassInsertLengthTrack + 0.125)) : 0;

  const vinylRows: [string, number, number, number][] = [
    ['Glass Insert — Mid / Corner Posts', result.glassInsertLength, cutsPost, totalPostPieces],
    ['Glass Insert — End Posts', result.endPostInsertLength, cutsEnd, totalEndPostPieces],
    ['Glass Insert — Wall Tracks / 2.5" Posts', result.glassInsertLengthTrack, cutsTrack, totalTrackPieces],
  ];

  vinylRows.forEach(([label, length, cuts, pieces], idx) => {
    const r = ws2.addRow([label, +length.toFixed(3), cuts, pieces]);
    r.getCell(1).font = { name: 'Arial', size: 9 };
    [2, 3, 4].forEach(col => {
      r.getCell(col).font = { name: 'Arial', size: 9, bold: true };
      r.getCell(col).alignment = { horizontal: 'right' };
    });
    if (idx % 2 === 0) r.eachCell(c => { c.fill = headerFill(LIGHT_GREY); });
    r.eachCell(c => applyBorder(c));
    setRowHeight(r, 14);
  });

  ws2.addRow([]);

  // --- Section: Lengths ordered ---
  const lh = ws2.addRow(['Vinyl Lengths to Order', 'Raw Lengths Needed', 'Lengths Ordered', 'Status']);
  lh.eachCell(c => {
    c.font = { name: 'Arial', bold: true, size: 9, color: { argb: WHITE } };
    c.fill = headerFill(BLACK);
    c.alignment = { horizontal: c.col === 'A' ? 'left' : 'right', vertical: 'middle' };
    applyBorder(c);
  });
  setRowHeight(lh, 16);

  const rawPost = cutsPost > 0 ? totalPostPieces / cutsPost : 0;
  const rawEnd = cutsEnd > 0 ? totalEndPostPieces / cutsEnd : 0;
  const rawTrack = cutsTrack > 0 ? totalTrackPieces / cutsTrack : 0;

  const orderedLengths = result.gasketLengths;
  const totalRaw = rawPost + rawEnd + rawTrack;
  const isOptimal = orderedLengths <= Math.ceil(totalRaw) + 1;

  const lenRows: [string, number, number][] = [
    ['Post inserts', rawPost, Math.ceil(rawPost)],
    ['End post inserts', rawEnd, Math.ceil(rawEnd)],
    ['Track inserts', rawTrack, Math.ceil(rawTrack)],
  ];
  lenRows.forEach(([label, raw, ceil], idx) => {
    const r = ws2.addRow([label, +raw.toFixed(3), ceil, '']);
    ws2.mergeCells(`D${r.number}:D${r.number}`);
    r.getCell(1).font = { name: 'Arial', size: 9 };
    [2, 3].forEach(col => {
      r.getCell(col).font = { name: 'Arial', size: 9, bold: true };
      r.getCell(col).alignment = { horizontal: 'right' };
    });
    if (idx % 2 === 0) r.eachCell(c => { c.fill = headerFill(LIGHT_GREY); });
    r.eachCell(c => applyBorder(c));
    setRowHeight(r, 14);
  });

  // Summary row
  const sumRow = ws2.addRow([
    `TOTAL — ${result.gasketDescription}`,
    +totalRaw.toFixed(3),
    orderedLengths,
    isOptimal ? '✓ Optimized' : '⚠ Review — excess lengths',
  ]);
  sumRow.getCell(1).font = { name: 'Arial', bold: true, size: 9, color: { argb: WHITE } };
  sumRow.getCell(2).font = { name: 'Arial', bold: true, size: 9, color: { argb: WHITE } };
  sumRow.getCell(3).font = { name: 'Arial', bold: true, size: 9, color: { argb: WHITE } };
  sumRow.getCell(4).font = { name: 'Arial', bold: true, size: 9, color: { argb: isOptimal ? OK_FG : WARN_FG } };
  sumRow.getCell(4).fill = headerFill(isOptimal ? OK_BG : WARN_BG);
  [1, 2, 3].forEach(col => { sumRow.getCell(col).fill = headerFill(BLACK); });
  [2, 3, 4].forEach(col => { sumRow.getCell(col).alignment = { horizontal: 'right' }; });
  sumRow.eachCell(c => applyBorder(c));
  setRowHeight(sumRow, 18);

  ws2.addRow([]);

  // --- Courier length note ---
  const noteRow = ws2.addRow([
    `Courier length: ${courierLen}" | Glass thickness: ${config.glassThickness}mm | Ship via courier: ${config.shipViaCourier ? 'Yes' : 'No'}`,
  ]);
  ws2.mergeCells(`A${noteRow.number}:D${noteRow.number}`);
  noteRow.getCell(1).font = { name: 'Arial', italic: true, size: 8, color: { argb: MID_GREY } };
  setRowHeight(noteRow, 13);

  // ============================================================
  // Write to browser download
  // ============================================================
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (jobInfo.jobReference || 'Quote').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.href = url;
  a.download = `IAS_Infinity_${safeName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
