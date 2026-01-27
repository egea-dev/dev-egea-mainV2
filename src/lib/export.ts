import Papa from 'papaparse';
import { loadXlsx } from './xlsx-loader';

// Función para exportar a Excel
export const exportToExcel = async (data: Record<string, unknown>[], fileName: string) => {
  const XLSX = await loadXlsx();
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// Función para exportar a CSV
export const exportToCsv = (data: Record<string, unknown>[], fileName: string) => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${fileName}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
