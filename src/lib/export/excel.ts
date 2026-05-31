import * as XLSX from 'xlsx';

export function exportToExcel(data: any[], filename: string) {
  if (data.length === 0) {
    alert("No data available to export.");
    return;
  }

  // Create a new workbook and add the data
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  // Trigger file download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
