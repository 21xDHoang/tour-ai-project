/**
 * Xuất dữ liệu dạng bảng ra file Excel (.xlsx).
 *
 * columns: [{ header: 'Tên cột', key: 'fieldName' }]
 * rows: mảng object (khóa = `key`). Nếu key chứa dấu chấm thì dùng getter.
 */
export async function exportToExcel(filename, columns, rows) {
  const XLSX = await import('xlsx');
  const data = rows.map((row) => {
    const out = {};
    for (const c of columns) {
      out[c.header] = c.getter ? c.getter(row) : row[c.key];
    }
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
