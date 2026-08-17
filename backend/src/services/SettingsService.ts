import type {
  OrganizationProfile,
  PublicApplicationSettings,
  SettingsByCategory,
  SystemSetting,
} from 'shared';
import type { ISettingsRepository, SettingUpdate } from '../repositories/SettingsRepository';
import { createSettingsRepository } from '../repositories/SettingsRepository';
import { AppError } from '../middleware/errorHandler';

/** Placeholder value shown in place of a sensitive setting's real value. */
const SENSITIVE_MASK = '••••••••';

/** Permission required to edit settings within a given category. */
export const settingsPermissionForCategory = (category: string): string => {
  if (category === 'EMAIL') return 'settings.email';
  if (category === 'SECURITY') return 'settings.security';
  if (category === 'REPORTS') return 'settings.reports';
  return 'settings.manage';
};

/**
 * Settings that can never be changed away from their seeded value.
 * NOTE: currency and currency_symbol were unlocked in migration 013.
 */
const LOCKED_SETTINGS = new Set<string>();

/** Setting keys that must be trimmed and upper-cased before being persisted. */
const PREFIX_KEYS = new Set([
  'asset_tag_prefix',
  'maintenance_number_prefix',
  'repair_number_prefix',
]);

/** Setting keys with a required minimum numeric value, keyed by `category.key`. */
const MIN_NUMERIC_VALUE: Record<string, number> = {
  'SECURITY.session_timeout_minutes': 1,
  'SECURITY.account_lock_minutes': 1,
  'INVENTORY.warranty_warning_days': 0,
  'ASSIGNMENTS.default_assignment_days': 1,
  'ASSIGNMENTS.overdue_warning_days': 0,
  'ORGANIZATION.logo_display_size': 60,
};

/** Setting keys with a required maximum numeric value, keyed by `category.key`. */
const MAX_NUMERIC_VALUE: Record<string, number> = {
  'SECURITY.max_failed_login_attempts': 20,
  'ORGANIZATION.logo_display_size': 200,
};

/** Minimum permitted value for the max failed login attempts setting. */
const MIN_FAILED_ATTEMPTS = 1;

/**
 * Validates a raw string value against the setting's declared value type.
 * Throws an `AppError` (400) when the value cannot be interpreted as that type.
 */
const validateValueForType = (value: string, valueType: SystemSetting['valueType']): void => {
  if (valueType === 'NUMBER') {
    if (Number.isNaN(Number(value)) || value.trim() === '') {
      throw new AppError('Value must be a valid number.', 400);
    }
  } else if (valueType === 'BOOLEAN') {
    if (value !== 'true' && value !== 'false') {
      throw new AppError('Value must be "true" or "false".', 400);
    }
  } else if (valueType === 'JSON') {
    try {
      JSON.parse(value);
    } catch {
      throw new AppError('Value must be valid JSON.', 400);
    }
  }
};

/** Applies setting-specific business rules (numeric ranges, prefix normalization, locked settings). */
const applyBusinessRules = (category: string, key: string, rawValue: string): string => {
  const compositeKey = `${category}.${key}`;
  if (LOCKED_SETTINGS.has(compositeKey)) {
    throw new AppError('This setting is fixed and cannot be changed.', 400);
  }

  let value = rawValue;
  if (PREFIX_KEYS.has(key)) {
    value = value.trim().toUpperCase();
    if (value === '') {
      throw new AppError('Prefix cannot be empty.', 400);
    }
  }

  if (compositeKey === 'SECURITY.max_failed_login_attempts') {
    const numeric = Number(value);
    if (numeric < MIN_FAILED_ATTEMPTS || numeric > MAX_NUMERIC_VALUE[compositeKey]!) {
      throw new AppError(
        `Maximum failed login attempts must be between ${MIN_FAILED_ATTEMPTS} and ${MAX_NUMERIC_VALUE[compositeKey]}.`,
        400,
      );
    }
  } else if (compositeKey in MIN_NUMERIC_VALUE) {
    const numeric = Number(value);
    if (numeric < MIN_NUMERIC_VALUE[compositeKey]!) {
      throw new AppError(`Value must be at least ${MIN_NUMERIC_VALUE[compositeKey]}.`, 400);
    }
  }

  return value;
};

/** Masks a setting's value if it is flagged sensitive. */
const maskIfSensitive = (setting: SystemSetting): SystemSetting =>
  setting.isSensitive ? { ...setting, value: SENSITIVE_MASK } : setting;

/** Helper to find a setting value from a raw array of settings. */
const findSettingValue = (settings: SystemSetting[], key: string): string =>
  settings.find((s) => s.key === key)?.value ?? '';

/** Business logic for reading and updating system settings. */
export interface ISettingsService {
  getAll(): Promise<SettingsByCategory>;
  getByCategory(category: string): Promise<SystemSetting[]>;
  updateSetting(
    category: string,
    key: string,
    value: string,
    updatedBy: number | null,
  ): Promise<SystemSetting>;
  updateSettingsBatch(
    updates: SettingUpdate[],
    updatedBy: number | null,
  ): Promise<SystemSetting[]>;
  /** Returns only non-sensitive settings suitable for public (pre-login) consumption. */
  getPublicSettings(): Promise<PublicApplicationSettings>;
  /** Returns the full organization profile from settings. */
  getOrganizationProfile(): Promise<OrganizationProfile>;
}

export class SettingsService implements ISettingsService {
  constructor(private readonly repository: ISettingsRepository = createSettingsRepository()) {}

  async getAll(): Promise<SettingsByCategory> {
    const settings = await this.repository.listSettings();
    const grouped: SettingsByCategory = {};
    for (const setting of settings) {
      grouped[setting.category] = grouped[setting.category] ?? [];
      grouped[setting.category]!.push(maskIfSensitive(setting));
    }
    return grouped;
  }

  async getByCategory(category: string): Promise<SystemSetting[]> {
    const settings = await this.repository.listSettingsByCategory(category);
    return settings.map(maskIfSensitive);
  }

  /** Validates a single update without persisting it. */
  private async validateUpdate(
    category: string,
    key: string,
    value: string,
  ): Promise<SystemSetting> {
    const existing = await this.repository.getSetting(category, key);
    if (!existing) {
      throw new AppError(`Setting "${category}.${key}" was not found.`, 404);
    }
    if (!existing.isEditable) {
      throw new AppError(`Setting "${category}.${key}" is not editable.`, 400);
    }
    validateValueForType(value, existing.valueType);
    return existing;
  }

  async updateSetting(
    category: string,
    key: string,
    value: string,
    updatedBy: number | null,
  ): Promise<SystemSetting> {
    const existing = await this.validateUpdate(category, key, value);
    const normalized = applyBusinessRules(category, key, value);
    const updated = await this.repository.updateSetting(category, key, normalized, updatedBy);
    return existing.isSensitive ? maskIfSensitive(updated) : updated;
  }

  async updateSettingsBatch(
    updates: SettingUpdate[],
    updatedBy: number | null,
  ): Promise<SystemSetting[]> {
    const normalizedUpdates: SettingUpdate[] = [];
    for (const update of updates) {
      await this.validateUpdate(update.category, update.key, update.value);
      const normalizedValue = applyBusinessRules(update.category, update.key, update.value);
      normalizedUpdates.push({ ...update, value: normalizedValue });
    }
    const updated = await this.repository.updateSettingsBatch(normalizedUpdates, updatedBy);
    return updated.map(maskIfSensitive);
  }

  /**
   * Builds the full organization profile from current settings.
   * Used by report services and the public settings endpoint.
   */
  async getOrganizationProfile(): Promise<OrganizationProfile> {
    const org = await this.repository.listSettingsByCategory('ORGANIZATION');
    const reports = await this.repository.listSettingsByCategory('REPORTS');

    return {
      organizationName:
        findSettingValue(org, 'organization_name') || 'School IT Inventory System',
      organizationShortName: findSettingValue(org, 'organization_short_name') || 'ORG',
      systemName: findSettingValue(org, 'system_name') || 'IT Inventory System',
      departmentName:
        findSettingValue(org, 'department_name') || 'Information Technology Department',
      countryCode: findSettingValue(org, 'country_code') || '',
      countryName: findSettingValue(org, 'country_name') || '',
      timezone: findSettingValue(org, 'timezone') || 'UTC',
      locale: findSettingValue(org, 'locale') || 'en',
      dateFormat: (findSettingValue(org, 'date_format') || 'DD/MM/YYYY') as 'DD/MM/YYYY',
      timeFormat: (findSettingValue(org, 'time_format') || '12_HOUR') as '12_HOUR',
      currencyCode: findSettingValue(org, 'currency') || 'USD',
      currencySymbol: findSettingValue(org, 'currency_symbol') || '$',
      currencyName: findSettingValue(org, 'currency_name') || 'US Dollar',
      assetTagPrefix: findSettingValue(org, 'asset_tag_prefix') || 'ASSET',
      supportEmail: findSettingValue(org, 'supportEmail') || '',
      supportPhone: findSettingValue(org, 'support_phone') || '',
      address: findSettingValue(org, 'address') || '',
      website: findSettingValue(org, 'website') || '',
      reportFooterText:
        findSettingValue(reports, 'report_footer_text') || '',
      confidentialityText:
        findSettingValue(reports, 'report_confidentiality_footer') || 'For internal use only.',
      logoUrl: findSettingValue(org, 'logo_path') || null,
      faviconUrl: findSettingValue(org, 'favicon_path') || null,
      logoDisplaySize: findSettingValue(org, 'logo_display_size') || '120',
    };
  }

  /**
   * Returns only the non-sensitive subset of settings safe for pre-login / public consumption.
   */
  async getPublicSettings(): Promise<PublicApplicationSettings> {
    const profile = await this.getOrganizationProfile();
    return {
      organizationName: profile.organizationName,
      organizationShortName: profile.organizationShortName,
      systemName: profile.systemName,
      departmentName: profile.departmentName,
      countryCode: profile.countryCode,
      countryName: profile.countryName,
      timezone: profile.timezone,
      locale: profile.locale,
      dateFormat: profile.dateFormat,
      timeFormat: profile.timeFormat,
      currencyCode: profile.currencyCode,
      currencySymbol: profile.currencySymbol,
      currencyName: profile.currencyName,
      assetTagPrefix: profile.assetTagPrefix,
      supportEmail: profile.supportEmail,
      supportPhone: profile.supportPhone,
      address: profile.address,
      website: profile.website,
      reportFooterText: profile.reportFooterText,
      confidentialityText: profile.confidentialityText,
      logoUrl: profile.logoUrl,
      faviconUrl: profile.faviconUrl,
      logoDisplaySize: profile.logoDisplaySize,
    };
  }
}

export const createSettingsService = (repository?: ISettingsRepository): ISettingsService =>
  new SettingsService(repository);
