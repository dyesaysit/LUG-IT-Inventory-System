import nodemailer from 'nodemailer';
import type Database from 'better-sqlite3';
import type { ISettingsRepository } from '../repositories/SettingsRepository';
import { AppError } from '../middleware/errorHandler';
import type { SecretService } from './SecretService';

export interface EmailSettingsInput {
  enabled: boolean; smtpHost: string; smtpPort: number; smtpSecure: boolean;
  smtpUsername: string; smtpPassword?: string; fromName: string; fromAddress: string; applicationUrl: string;
}
export interface EmailSettingsView extends Omit<EmailSettingsInput, 'smtpPassword'> { passwordConfigured: boolean }

interface EmailConfig extends EmailSettingsView { password: string }

/** SMTP configuration, durable delivery queue, and recipient resolution. */
export class EmailService {
  private working = false;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly db: Database.Database,
    private readonly settings: ISettingsRepository,
    private readonly secrets: SecretService,
  ) {}

  async getSettings(): Promise<EmailSettingsView> {
    const config = await this.config();
    return { enabled: config.enabled, smtpHost: config.smtpHost, smtpPort: config.smtpPort,
      smtpSecure: config.smtpSecure, smtpUsername: config.smtpUsername,
      fromName: config.fromName, fromAddress: config.fromAddress,
      applicationUrl: config.applicationUrl, passwordConfigured: config.passwordConfigured };
  }

  async save(input: EmailSettingsInput, userId: number): Promise<EmailSettingsView> {
    this.validate(input);
    const updates = [
      ['enabled', String(input.enabled)], ['smtp_host', input.smtpHost.trim()], ['smtp_port', String(input.smtpPort)],
      ['smtp_secure', String(input.smtpSecure)], ['smtp_username', input.smtpUsername.trim()],
      ['from_name', input.fromName.trim()], ['from_address', input.fromAddress.trim()],
      ['application_url', input.applicationUrl.trim().replace(/\/$/, '')],
    ].map(([key, value]) => ({ category: 'EMAIL', key, value }));
    if (input.smtpPassword) updates.push({ category: 'EMAIL', key: 'smtp_password', value: this.secrets.encrypt(input.smtpPassword) });
    await this.settings.updateSettingsBatch(updates, userId);
    return this.getSettings();
  }

  async test(recipient: string): Promise<void> {
    const config = await this.config();
    if (!/^\S+@\S+\.\S+$/.test(recipient)) throw new AppError('Enter a valid test recipient email.', 400);
    await this.transporter(config).sendMail({ from: this.from(config), to: recipient, subject: 'IT Inventory email test', text: 'Email notifications are configured correctly.', html: '<p>Email notifications are configured correctly.</p>' });
  }

  async queuePermission(permission: string, subject: string, message: string, ticketId: number): Promise<void> {
    const rows = this.db.prepare(`SELECT DISTINCT u.email FROM users u JOIN role_permissions rp ON rp.role_id=u.role_id JOIN permissions p ON p.id=rp.permission_id WHERE p.code=? AND u.is_active=1 AND u.archived_at IS NULL AND u.email IS NOT NULL AND trim(u.email)<>''`).all(permission) as { email: string }[];
    await this.enqueue(rows.map((row) => row.email), subject, message, ticketId);
  }

  async queueRequester(userId: number | null, personId: number | null, subject: string, message: string, ticketId: number): Promise<void> {
    const row = this.db.prepare(`SELECT COALESCE(NULLIF(trim(u.email),''),NULLIF(trim(p.email),'')) email FROM users u LEFT JOIN people p ON p.id=COALESCE(u.person_id,?) WHERE u.id=? UNION ALL SELECT email FROM people WHERE id=? AND ? IS NULL LIMIT 1`).get(personId, userId, personId, userId) as { email: string | null } | undefined;
    await this.enqueue(row?.email ? [row.email] : [], subject, message, ticketId);
  }

  start(): void { this.timer = setInterval(() => void this.process(), 30_000); this.timer.unref(); void this.process(); }
  stop(): void { if (this.timer) clearInterval(this.timer); }

  private async enqueue(recipients: string[], subject: string, message: string, ticketId: number): Promise<void> {
    const config = await this.config();
    if (!config.enabled || recipients.length === 0) return;
    const link = config.applicationUrl ? `${config.applicationUrl}/tickets` : '';
    const text = `${message}${link ? `\n\nOpen the system: ${link}` : ''}\n\nThis mailbox is not monitored. Please respond through the Inventory System.`;
    const html = `<p>${this.escape(message)}</p>${link ? `<p><a href="${this.escape(link)}">Open the Inventory System</a></p>` : ''}<p><small>This mailbox is not monitored. Please respond through the Inventory System.</small></p>`;
    const insert = this.db.prepare(`INSERT INTO email_outbox(recipient,subject,text_body,html_body,entity_type,entity_id) VALUES(?,?,?,?,'TICKET',?)`);
    this.db.transaction(() => [...new Set(recipients.map((item) => item.trim().toLowerCase()))].forEach((email) => insert.run(email, subject, text, html, ticketId)))();
    void this.process();
  }

  private async process(): Promise<void> {
    if (this.working) return;
    this.working = true;
    try {
      const config = await this.config();
      if (!config.enabled) return;
      const rows = this.db.prepare(`SELECT id,recipient,subject,text_body textBody,html_body htmlBody,attempts FROM email_outbox WHERE status IN ('PENDING','FAILED') AND attempts<5 AND next_attempt_at<=datetime('now') ORDER BY id LIMIT 20`).all() as Array<{id:number;recipient:string;subject:string;textBody:string;htmlBody:string;attempts:number}>;
      const transport = this.transporter(config);
      for (const row of rows) {
        try {
          this.db.prepare("UPDATE email_outbox SET status='SENDING' WHERE id=?").run(row.id);
          await transport.sendMail({ from: this.from(config), to: row.recipient, subject: row.subject, text: row.textBody, html: row.htmlBody });
          this.db.prepare("UPDATE email_outbox SET status='SENT',sent_at=datetime('now'),last_error=NULL WHERE id=?").run(row.id);
        } catch (error) {
          const safeError = (error instanceof Error ? error.message : 'SMTP delivery failed').slice(0, 500);
          const delay = Math.min(60, 2 ** row.attempts);
          this.db.prepare("UPDATE email_outbox SET status='FAILED',attempts=attempts+1,last_error=?,next_attempt_at=datetime('now','+'||?||' minutes') WHERE id=?").run(safeError, delay, row.id);
        }
      }
    } finally { this.working = false; }
  }

  private async config(): Promise<EmailConfig> {
    const rows = await this.settings.listSettingsByCategory('EMAIL');
    const value = (key: string) => rows.find((row) => row.key === key)?.value ?? '';
    const encrypted = value('smtp_password');
    return { enabled: value('enabled') === 'true', smtpHost: value('smtp_host'), smtpPort: Number(value('smtp_port') || 587),
      smtpSecure: value('smtp_secure') === 'true', smtpUsername: value('smtp_username'), password: encrypted ? this.secrets.decrypt(encrypted) : '',
      fromName: value('from_name'), fromAddress: value('from_address'), applicationUrl: value('application_url'), passwordConfigured: Boolean(encrypted) };
  }

  private transporter(config: EmailConfig) { return nodemailer.createTransport({ host: config.smtpHost, port: config.smtpPort, secure: config.smtpSecure, auth: config.smtpUsername ? { user: config.smtpUsername, pass: config.password } : undefined, requireTLS: !config.smtpSecure }); }
  private from(config: EmailConfig): string { return `"${config.fromName.replaceAll('"', '')}" <${config.fromAddress}>`; }
  private validate(input: EmailSettingsInput): void { if (input.smtpPort < 1 || input.smtpPort > 65535) throw new AppError('SMTP port must be between 1 and 65535.',400); if (input.enabled && (!input.smtpHost.trim() || !/^\S+@\S+\.\S+$/.test(input.fromAddress))) throw new AppError('SMTP host and a valid From address are required when email is enabled.',400); }
  private escape(value: string): string { return value.replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char] ?? char)).replaceAll('\n','<br>'); }
}
