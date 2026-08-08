import type { ReportFilter, ReportType } from 'shared';
import type { ReportService } from '../services/ReportService';

export class ReportController {
  constructor(private readonly s: ReportService) {}

  catalog() {
    return this.s.catalog();
  }

  summary() {
    return this.s.summary();
  }

  generate(type: ReportType, f: ReportFilter) {
    return this.s.generate(type, f);
  }

  export(
    type: ReportType,
    f: ReportFilter,
    format: 'CSV' | 'XLSX' | 'PDF_PRINT',
    username?: string,
  ) {
    return this.s.export(type, f, format, username);
  }
}