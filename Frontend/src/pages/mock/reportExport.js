import { downloadBlob } from './querySupport';
const columns = ['Reference', 'Subject', 'Student', 'Department', 'Assigned staff', 'Status', 'Priority', 'Channel', 'Submitted', 'Updated'];
const values = query => [query.reference, query.subject, query.student, query.department, query.assigned_instructor, query.status, query.priority, query.channel, query.created_at, query.updated_at].map(value => String(value ?? ''));
export async function exportLocalReport(format, report, filters, user) {
  if (!['ADMIN', 'HOD'].includes(user.role)) throw new Error('Report downloads require an Admin or HOD account.');
  const metadata = `Local demo report · Simulated AI and delivery · ${user.role}: ${user.full_name} · ${filters.from || 'All dates'} to ${filters.to || 'All dates'}`;
  const summary = [['Total queries', report.total], ['Open queries', report.open], ['Resolved queries', report.resolved], ['Escalated queries', report.escalated], ['Closed queries', report.closed], ['Average first response minutes', report.avg_response_minutes.toFixed(1)], ['Resolution rate', `${report.resolution_rate.toFixed(1)}%`], ['Average resolution hours', report.avg_resolution_hours.toFixed(1)]];
  const name = `CampusIQ-local-demo-${filters.from || 'all'}-${filters.to || 'dates'}`;
  if (format === 'pdf') {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const document = new jsPDF({ orientation: 'landscape' }); document.setFontSize(18); document.text('CampusIQ local demo report', 14, 18); document.setFontSize(9); document.text(document.splitTextToSize(metadata, 265), 14, 26);
    autoTable(document, { startY: 40, head: [['Metric', 'Value']], body: summary });
    autoTable(document, { startY: document.lastAutoTable.finalY + 10, head: [columns], body: report.queries.map(values), styles: { fontSize: 7, overflow: 'linebreak' } });
    document.save(`${name}.pdf`); return;
  }
  const { default: ExcelJS } = await import('exceljs'); const workbook = new ExcelJS.Workbook(); workbook.creator = 'CampusIQ local demo';
  const info = workbook.addWorksheet('Summary'); info.addRow(['CampusIQ local demo report']); info.addRow([metadata]); info.addRow(['Generated', new Date().toISOString()]); info.addRows(summary); info.columns = [{ width: 28 }, { width: 80 }];
  const sheet = workbook.addWorksheet('Queries'); sheet.addRow(columns); sheet.addRows(report.queries.map(values)); sheet.columns.forEach((column, index) => { column.width = [18, 42, 26, 20, 26, 24, 14, 14, 28, 28][index]; }); sheet.getRow(1).font = { bold: true }; sheet.views = [{ state: 'frozen', ySplit: 1 }];
  const buffer = await workbook.xlsx.writeBuffer(); downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${name}.xlsx`);
}
