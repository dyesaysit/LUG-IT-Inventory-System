import ExcelJS from 'exceljs';
import type { CreatePersonInput, Department, EmploymentStatus, Person } from 'shared';
import type { IDepartmentRepository } from '../repositories/DepartmentRepository';

const HEADERS = [
  'Staff ID *', 'First name *', 'Last name *', 'Email', 'Phone', 'Job title',
  'Department', 'Employment status', 'Notes', 'Active person',
] as const;
const STATUSES: EmploymentStatus[] = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'LEFT'];
const FIELD_NAMES = [
  'staff id', 'first name', 'last name', 'email', 'phone', 'job title',
  'department', 'employment status', 'notes', 'active person',
] as const;

export interface PeopleImportError { row: number; message: string }
export interface PeopleImportResult { imported: number; failed: number; errors: PeopleImportError[] }

interface PersonCreator { create(input: CreatePersonInput): Promise<Person> }

const cellText = (value: ExcelJS.CellValue): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if ('text' in value) return String(value.text).trim();
    if ('result' in value) return String(value.result ?? '').trim();
    if ('richText' in value) return value.richText.map((item) => item.text).join('').trim();
  }
  return String(value).trim();
};

const normalizeHeader = (value: ExcelJS.CellValue): string => {
  const header = cellText(value).toLowerCase().replaceAll('*', '').replace(/\s+/g, ' ').trim();
  return header === 'department code' || header === 'department name' ? 'department' : header;
};

interface ImportLayout {
  sheet: ExcelJS.Worksheet;
  headerRow: number;
  columns: Map<string, number>;
  populatedRows: number;
}

const findImportLayout = (workbook: ExcelJS.Workbook): ImportLayout | null => {
  const layouts: ImportLayout[] = [];
  for (const sheet of workbook.worksheets) {
    const lastHeaderCandidate = Math.min(Math.max(sheet.rowCount, 1), 10);
    for (let rowNumber = 1; rowNumber <= lastHeaderCandidate; rowNumber += 1) {
      const columns = new Map<string, number>();
      sheet.getRow(rowNumber).eachCell({ includeEmpty: false }, (cell, column) => {
        const header = normalizeHeader(cell.value);
        if (FIELD_NAMES.includes(header as typeof FIELD_NAMES[number])) columns.set(header, column);
      });
      if (!['staff id', 'first name', 'last name'].every((header) => columns.has(header))) continue;
      const mappedColumns = [...columns.values()];
      let populatedRows = 0;
      for (let dataRow = rowNumber + 1; dataRow <= sheet.rowCount; dataRow += 1) {
        if (mappedColumns.some((column) => cellText(sheet.getCell(dataRow, column).value) !== '')) populatedRows += 1;
      }
      layouts.push({ sheet, headerRow: rowNumber, columns, populatedRows });
    }
  }
  return layouts.sort((left, right) => right.populatedRows - left.populatedRows)[0] ?? null;
};

/** Creates the formatted workbook used for bulk People imports. */
export async function createPeopleImportTemplate(departments: Department[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IT Inventory System';
  const sheet = workbook.addWorksheet('People Import', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = HEADERS.map((header, index) => ({
    header,
    key: `column${index}`,
    width: [18, 20, 20, 28, 18, 24, 20, 22, 32, 16][index],
  }));
  sheet.getRow(1).height = 28;
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
  sheet.getRow(1).alignment = { vertical: 'middle', wrapText: true };
  sheet.autoFilter = { from: 'A1', to: 'J1' };
  const lists = workbook.addWorksheet('Import Lists');
  lists.getCell('A1').value = 'Active departments';
  departments.forEach((department, index) => { lists.getCell(index + 2, 1).value = department.name; });
  lists.state = 'hidden';
  for (let row = 2; row <= 501; row += 1) {
    if (departments.length > 0) {
      sheet.getCell(row, 7).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`'Import Lists'!$A$2:$A$${departments.length + 1}`],
      };
    }
    sheet.getCell(row, 8).dataValidation = { type: 'list', allowBlank: true, formulae: ['"ACTIVE,ON_LEAVE,SUSPENDED,LEFT"'] };
    sheet.getCell(row, 10).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Yes,No"'] };
  }
  const instructions = workbook.addWorksheet('Instructions');
  instructions.columns = [{ width: 24 }, { width: 80 }];
  instructions.addRows([
    ['Field', 'Instructions'],
    ['Required fields', 'Staff ID, First name, and Last name are required. Required headers are marked with *.'],
    ['Department', 'Optional. Select an active department from the dropdown. Existing files may also use a department name or code.'],
    ['Employment status', 'Optional. Use ACTIVE, ON_LEAVE, SUSPENDED, or LEFT. Defaults to ACTIVE.'],
    ['Active person', 'Optional. Use Yes or No. Defaults to Yes.'],
    ['Example row', `STAFF-000001 | Alex | Morgan | alex@example.com | +10000000000 | Technician | ${departments[0]?.name ?? '(blank)'} | ACTIVE | (blank) | Yes`],
    ['Important', 'Keep the column headings unchanged and enter one person per row in the People Import sheet.'],
  ]);
  instructions.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  instructions.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
  instructions.getColumn(2).alignment = { wrapText: true, vertical: 'top' };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** Imports valid rows from an uploaded People workbook and reports row-level failures. */
export async function importPeopleWorkbook(
  buffer: Buffer,
  personService: PersonCreator,
  departmentRepository: IDepartmentRepository,
): Promise<PeopleImportResult> {
  const workbook = new ExcelJS.Workbook();
  const excelBuffer = buffer as unknown as Parameters<typeof workbook.xlsx.load>[0];
  await workbook.xlsx.load(excelBuffer);
  if (workbook.worksheets.length === 0) return { imported: 0, failed: 1, errors: [{ row: 1, message: 'The workbook has no worksheets.' }] };
  const layout = findImportLayout(workbook);
  if (!layout) {
    const sheetNames = workbook.worksheets.map((sheet) => sheet.name).join(', ');
    return { imported: 0, failed: 1, errors: [{
      row: 1,
      message: `Required headers were not found. The workbook must contain Staff ID, First name, and Last name columns. Sheets checked: ${sheetNames}.`,
    }] };
  }
  const { sheet, headerRow, columns } = layout;
  const departments = await departmentRepository.list({ isActive: true, pageSize: 100, sortBy: 'code' });
  const departmentIds = new Map<string, number>();
  departments.forEach((item) => {
    departmentIds.set(item.code.trim().toUpperCase(), item.id);
    departmentIds.set(item.name.trim().toUpperCase(), item.id);
  });
  const result: PeopleImportResult = { imported: 0, failed: 0, errors: [] };
  for (let rowNumber = headerRow + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const values = FIELD_NAMES.map((field) => {
      const column = columns.get(field);
      return column === undefined ? '' : cellText(sheet.getCell(rowNumber, column).value);
    });
    if (values.every((value) => value === '')) continue;
    const [staffId, firstName, lastName, email, phone, jobTitle, department, statusText, notes, activeText] = values;
    try {
      const status = (statusText || 'ACTIVE').toUpperCase() as EmploymentStatus;
      if (!STATUSES.includes(status)) throw new Error('Employment status must be ACTIVE, ON_LEAVE, SUSPENDED, or LEFT.');
      const departmentId = department ? departmentIds.get(department.toUpperCase()) : undefined;
      if (department && departmentId === undefined) throw new Error(`Department "${department}" was not found or is inactive. Select a department from the template dropdown, or use its exact name or code.`);
      const normalizedActive = (activeText || 'YES').toUpperCase();
      if (!['YES', 'NO', 'TRUE', 'FALSE'].includes(normalizedActive)) throw new Error('Active person must be Yes or No.');
      const input: CreatePersonInput = {
        staffId, firstName, lastName, email: email || null, phone: phone || null,
        jobTitle: jobTitle || null, departmentId: departmentId ?? null,
        employmentStatus: status, notes: notes || null,
        isActive: normalizedActive === 'YES' || normalizedActive === 'TRUE',
      };
      await personService.create(input);
      result.imported += 1;
    } catch (error) {
      result.failed += 1;
      const message = error instanceof Error ? error.message : 'Unable to import this row.';
      result.errors.push({ row: rowNumber, message });
    }
  }
  if (result.imported === 0 && result.failed === 0) {
    result.failed = 1;
    result.errors.push({
      row: headerRow + 1,
      message: `No people data was found below the headers on the "${sheet.name}" sheet. Enter at least one person and save the workbook before importing.`,
    });
  }
  return result;
}
