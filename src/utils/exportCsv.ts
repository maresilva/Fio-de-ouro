export function exportToCsv(filename: string, rows: Record<string, any>[], headers?: { key: string; label: string }[]) {
  if (!rows || !rows.length) {
    alert('Não há dados para exportar.');
    return;
  }

  const columns = headers || Object.keys(rows[0]).map(key => ({ key, label: key }));

  const csvRows: string[] = [];

  // Header row
  csvRows.push(columns.map(col => `"${col.label.replace(/"/g, '""')}"`).join(';'));

  // Data rows
  for (const row of rows) {
    const values = columns.map(col => {
      let val = row[col.key];
      if (val === undefined || val === null) {
        val = '';
      } else if (typeof val === 'number') {
        val = val.toLocaleString('pt-BR');
      } else {
        val = String(val).replace(/"/g, '""');
      }
      return `"${val}"`;
    });
    csvRows.push(values.join(';'));
  }

  // UTF-8 BOM for Brazilian Excel compatibility
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
