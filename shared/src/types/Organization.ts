/**
 * White-label organization profile types.
 * These types allow the application to be branded for any organization
 * without code changes — all values come from system settings.
 */

/** ISO 3166-1 alpha-2 country code (e.g. "GH", "GM") */
export type CountryCode = string;

/** ISO 4217 currency code (e.g. "GHS", "GMD") */
export type CurrencyCode = string;

/** IANA timezone identifier (e.g. "Africa/Accra", "Africa/Banjul") */
export type Timezone = string;

/** BCP 47 locale tag (e.g. "en-GH", "en-GM") */
export type LocaleTag = string;

/** Date format style used throughout the application. */
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

/** Time format: 12-hour or 24-hour clock. */
export type TimeFormat = '12_HOUR' | '24_HOUR';

/** Pre-configured country that the application supports out of the box. */
export interface SupportedCountry {
  /** ISO 3166-1 alpha-2 code */
  code: CountryCode;
  /** Human-readable country name */
  countryName: string;
  /** Recommended BCP 47 locale */
  locale: LocaleTag;
  /** Recommended ISO 4217 currency code */
  currencyCode: CurrencyCode;
  /** Human-readable currency name */
  currencyName: string;
  /** Currency symbol for display (e.g. "GH₵", "D") */
  currencySymbol: string;
  /** Recommended IANA timezone */
  timezone: Timezone;
}

/** Organization identity fields visible before login and in public branding. */
export interface OrganizationProfile {
  organizationName: string;
  organizationShortName: string;
  systemName: string;
  departmentName: string;
  countryCode: CountryCode;
  countryName: string;
  timezone: Timezone;
  locale: LocaleTag;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  currencyCode: CurrencyCode;
  currencySymbol: string;
  currencyName: string;
  assetTagPrefix: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  website: string;
  reportFooterText: string;
  confidentialityText: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  logoDisplaySize?: string | null;
}

/**
 * Public-facing settings exposed via GET /api/public-settings.
 * Must NOT contain secrets, backup paths, or internal database paths.
 */
export interface PublicApplicationSettings {
  organizationName: string;
  organizationShortName: string;
  systemName: string;
  departmentName: string;
  countryCode: CountryCode;
  countryName: string;
  timezone: Timezone;
  locale: LocaleTag;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  currencyCode: CurrencyCode;
  currencySymbol: string;
  currencyName: string;
  assetTagPrefix: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  website: string;
  reportFooterText: string;
  confidentialityText: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  logoDisplaySize?: string | null;
}

/** Supported countries registry — used to suggest regional defaults when country changes. */
export const SUPPORTED_COUNTRIES: SupportedCountry[] = [
  {
    code: 'GH',
    countryName: 'Ghana',
    locale: 'en-GH',
    currencyCode: 'GHS',
    currencyName: 'Ghanaian Cedi',
    currencySymbol: 'GH₵',
    timezone: 'Africa/Accra',
  },
  {
    code: 'GM',
    countryName: 'The Gambia',
    locale: 'en-GM',
    currencyCode: 'GMD',
    currencyName: 'Gambian Dalasi',
    currencySymbol: 'D',
    timezone: 'Africa/Banjul',
  },
];

/** Looks up a supported country by ISO code. */
export const getSupportedCountry = (code: CountryCode): SupportedCountry | undefined =>
  SUPPORTED_COUNTRIES.find((c) => c.code === code);