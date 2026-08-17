import axios from 'axios';
import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { downloadPeopleImportTemplate, importPeopleWorkbook } from '../services/api';

interface PeopleImportDialogProps {
  onClose: () => void;
  onImported: (count: number) => void;
}

/** Excel upload dialog for bulk People registration. */
export const PeopleImportDialog = ({ onClose, onImported }: PeopleImportDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof importPeopleWorkbook>> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Preparing import…');

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
    setError(null);
    setResult(null);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) { setError('Choose an Excel workbook first.'); return; }
    setSubmitting(true); setError(null); setResult(null); setProgress(5); setProgressLabel('Uploading workbook…');
    try {
      const imported = await importPeopleWorkbook(file, (percentage) => {
        setProgress(percentage);
        if (percentage >= 70) setProgressLabel('Validating and importing rows…');
      });
      setProgress(100); setProgressLabel('Import complete');
      setResult(imported);
      if (imported.imported > 0) onImported(imported.imported);
    } catch (requestError) {
      setProgress(0);
      if (axios.isAxiosError(requestError)) {
        const data = requestError.response?.data as { error?: string; message?: string; errors?: Array<{ row: number; message: string }>; imported?: number; failed?: number } | string | undefined;
        if (typeof data === 'object' && data?.errors?.length) {
          setResult({ imported: data.imported ?? 0, failed: data.failed ?? data.errors.length, errors: data.errors });
        } else if (!requestError.response) {
          setError('The server could not be reached. Check that the inventory service is running, then try again.');
        } else {
          const serverMessage = typeof data === 'string' ? data : data?.error ?? data?.message;
          setError(serverMessage || `The server rejected the workbook (HTTP ${requestError.response.status}). Confirm it is an unencrypted .xlsx or .xlsm file using the downloaded template.`);
        }
      } else setError(requestError instanceof Error ? requestError.message : 'Unable to import the workbook.');
    } finally { setSubmitting(false); }
  };
  const downloadTemplate = async () => {
    setError(null);
    try { await downloadPeopleImportTemplate(); }
    catch { setError('Unable to download the Excel template.'); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="people-import-title">
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded bg-white p-6 shadow-xl">
      <h2 id="people-import-title" className="text-lg font-semibold text-lug-charcoal">Import people from Excel</h2>
      <p className="mt-1 text-sm text-lug-gray">Download the template, keep its headings unchanged, then upload the completed workbook.</p>
      <button type="button" onClick={() => void downloadTemplate()} className="mt-5 rounded border border-lug-red px-4 py-2 text-sm font-medium text-lug-red hover:bg-red-50">Download Excel template</button>
      <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Required: Staff ID, First name, and Last name. Select Department from the template dropdown, or enter its exact name or code. An example is provided on the Instructions sheet.
      </div>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-sm font-medium text-lug-charcoal">Excel workbook (.xlsx or .xlsm)
          <input type="file" accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={selectFile} className="mt-2 block w-full rounded border border-lug-light-gray p-2 text-sm" />
        </label>
        {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {submitting && <div className="space-y-2" role="status" aria-live="polite">
          <div className="flex justify-between text-sm text-lug-charcoal"><span>{progressLabel}</span><span>{progress}%</span></div>
          <progress value={progress} max={100} aria-label={`Import progress: ${progress}%`} className="h-3 w-full accent-lug-red" />
        </div>}
        {result && <div className={`rounded border p-3 text-sm ${result.failed ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          <p className="font-medium">Imported {result.imported}; failed {result.failed}.</p>
          {result.errors.length > 0 && <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5">{result.errors.map((item) => <li key={`${item.row}-${item.message}`}>Row {item.row}: {item.message}</li>)}</ul>}
        </div>}
        <div className="flex flex-col-reverse gap-3 border-t border-lug-light-gray pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded border border-lug-light-gray px-4 py-2 text-sm">{result ? 'Close' : 'Cancel'}</button>
          <button type="submit" disabled={!file || submitting} className="rounded bg-lug-red px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{submitting ? 'Importing…' : 'Import people'}</button>
        </div>
      </form>
    </div>
  </div>;
};
