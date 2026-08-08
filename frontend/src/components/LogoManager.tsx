import { useState, useRef, useEffect } from 'react';
import { uploadLogo, deleteLogo, updateSetting } from '../services/api';
import { useApplicationSettings } from '../context/ApplicationSettingsContext';

interface LogoManagerProps {
  disabled: boolean;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function LogoManager({ disabled, onSuccess, onError }: LogoManagerProps) {
  const { settings, refresh } = useApplicationSettings();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [savingSize, setSavingSize] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoSize, setLogoSize] = useState<number>(120);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings?.logoDisplaySize) {
      setLogoSize(parseInt(settings.logoDisplaySize, 10) || 120);
    }
  }, [settings]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      onError('Unsupported file type. Please upload a PNG, JPG/JPEG, WebP, or safe SVG image.');
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      onError('File size exceeds the 2 MB maximum limit.');
      return false;
    }
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || disabled) return;
    setUploading(true);
    try {
      await uploadLogo(selectedFile);
      await refresh();
      setSelectedFile(null);
      setPreviewUrl(null);
      onSuccess('Logo uploaded successfully.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to upload logo.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (disabled) return;
    if (!window.confirm('Are you sure you want to remove the custom logo and revert to the default?')) return;
    setRemoving(true);
    try {
      await deleteLogo();
      await refresh();
      setSelectedFile(null);
      setPreviewUrl(null);
      onSuccess('Custom logo removed successfully.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to remove logo.');
    } finally {
      setRemoving(false);
    }
  };

  const handleCancelSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveSize = async () => {
    if (disabled || logoSize < 60 || logoSize > 200) return;
    setSavingSize(true);
    try {
      await updateSetting('ORGANIZATION', 'logo_display_size', { value: logoSize.toString() });
      await refresh();
      onSuccess('Logo display size updated successfully.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save logo display size.');
    } finally {
      setSavingSize(false);
    }
  };

  const currentLogo = settings?.logoUrl || '/LUG-logo-200x84-transparent.png';
  const effectivePreview = previewUrl || currentLogo;

  return (
    <div className="space-y-6">
      {/* File Drop Area / Card */}
      <div className="rounded-lg border border-lug-light-gray bg-lug-off-white p-5">
        <label className="block text-sm font-semibold text-lug-charcoal mb-4">Logo Branding</label>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Visual Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center outline-none transition-colors ${
              dragActive ? 'border-lug-red bg-lug-red/5' : 'border-lug-light-gray bg-white'
            }`}
          >
            <svg
              className="mx-auto h-12 w-12 text-lug-gray"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-4 flex text-sm text-lug-charcoal">
              <label
                htmlFor="logo-upload"
                className="relative cursor-pointer rounded-md bg-white font-semibold text-lug-red focus-within:outline-none focus-within:ring-2 focus-within:ring-lug-red focus-within:ring-offset-2 hover:text-red-700"
              >
                <span>Choose Logo</span>
                <input
                  id="logo-upload"
                  name="logo-upload"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="sr-only"
                  disabled={disabled}
                  accept=".png,.jpg,.jpeg,.webp,.svg"
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-lug-gray mt-2">Accepted formats: PNG, JPG, WebP, SVG up to 2 MB</p>
          </div>

          {/* Logo Action & Preview Area */}
          <div className="flex flex-col justify-between rounded-lg border border-lug-light-gray bg-white p-4">
            <div>
              <p className="text-xs font-semibold text-lug-gray uppercase tracking-wider mb-2">Logo Preview</p>
              <div 
                className="flex items-center justify-center border border-gray-100 rounded bg-gray-50 p-4 min-h-[140px] max-h-[140px] overflow-hidden"
              >
                <img
                  src={effectivePreview}
                  alt={settings?.organizationName || 'Logo Preview'}
                  className="max-h-[120px] max-w-full object-contain"
                  style={{ width: `${logoSize}px` }}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {selectedFile ? (
                <>
                  <button
                    type="button"
                    disabled={uploading || disabled}
                    onClick={handleUpload}
                    className="flex-1 rounded bg-lug-red px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload selected'}
                  </button>
                  <button
                    type="button"
                    disabled={uploading || disabled}
                    onClick={handleCancelSelection}
                    className="rounded border border-lug-light-gray px-3 py-2 text-xs font-semibold text-lug-charcoal bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {settings?.logoUrl && settings.logoUrl.startsWith('/api/settings/branding/logo/') && (
                    <button
                      type="button"
                      disabled={removing || disabled}
                      onClick={handleRemove}
                      className="flex-1 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      {removing ? 'Removing...' : 'Remove logo'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 rounded border border-lug-light-gray px-3 py-2 text-xs font-semibold text-lug-charcoal bg-white hover:bg-gray-50"
                  >
                    Replace logo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Display size scale */}
      <div className="rounded-lg border border-lug-light-gray bg-lug-off-white p-5">
        <label className="block text-sm font-semibold text-lug-charcoal mb-2">Display Size Control</label>
        <p className="text-xs text-lug-gray mb-4">Set the size of the logo in pixels as displayed throughout the dashboard, login screen, and report templates.</p>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1 flex items-center gap-4">
            <span className="text-xs font-medium text-lug-gray">60px</span>
            <input
              type="range"
              min="60"
              max="200"
              value={logoSize}
              onChange={(e) => setLogoSize(parseInt(e.target.value, 10))}
              disabled={disabled}
              className="flex-1 h-1 bg-lug-light-gray rounded-sm cursor-pointer accent-lug-red disabled:opacity-50"
            />
            <span className="text-xs font-medium text-lug-gray">200px</span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-lug-charcoal bg-white border border-lug-light-gray px-3 py-1.5 rounded min-w-[70px] text-center">
              {logoSize} px
            </span>
            <button
              type="button"
              disabled={disabled || savingSize || (settings?.logoDisplaySize ? parseInt(settings.logoDisplaySize, 10) === logoSize : logoSize === 120)}
              onClick={handleSaveSize}
              className="rounded bg-lug-red px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              {savingSize ? 'Saving...' : 'Save size'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
