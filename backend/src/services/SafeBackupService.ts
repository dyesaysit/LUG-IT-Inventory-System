import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { BackupRecord, BackupType } from 'shared';
import type { EnvConfig } from '../config';
import { getCurrentDb } from '../database/connection';
import { AppError } from '../middleware/errorHandler';
import type { IBackupRepository } from '../repositories/BackupRepository';
import { createBackupRepository } from '../repositories/BackupRepository';

const criticalTables = ['assets','users','roles','schema_migrations','backup_records'];
const markerName = 'pending-restore.json';
interface RestoreMarker { stagedFilename:string; preRestoreFilename:string; preRestoreSize:number; preRestoreChecksum:string; createdBy:number|null }

/** Resolves managed backup storage outside the source repository by default. */
export const resolveBackupDirectory = (config: EnvConfig): string => path.resolve(config.BACKUP_DIRECTORY || config.BACKUP_DIR || path.join(process.env.LOCALAPPDATA ?? os.homedir(), 'LUG IT Inventory', 'backups'));
const checksum = (filePath:string) => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
const assertInside = (root:string,filePath:string) => { const relative=path.relative(root,path.resolve(filePath)); if(relative.startsWith('..')||path.isAbsolute(relative)) throw new AppError('Backup file path is invalid.',400); };
const validateDatabase = (filePath:string) => { const db=new Database(filePath,{readonly:true,fileMustExist:true}); try { const integrity=(db.pragma('integrity_check',{simple:true}) as string); if(integrity!=='ok') throw new Error(`Integrity check failed: ${integrity}`); const rows=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {name:string}[]; const names=new Set(rows.map(row=>row.name)); const missing=criticalTables.filter(name=>!names.has(name)); if(missing.length) throw new Error(`Missing critical tables: ${missing.join(', ')}`); } finally { db.close(); } };

export interface ISafeBackupService {
  listBackups():Promise<BackupRecord[]>; getBackup(id:number):Promise<BackupRecord>; createBackup(createdBy:number|null,type?:BackupType):Promise<BackupRecord>;
  getDownload(id:number):Promise<{filePath:string;filename:string}>; verifyBackup(id:number):Promise<{valid:boolean;checksum:string|null}>;
  restoreBackup(id:number,createdBy:number|null):Promise<{success:boolean;restartRequired:boolean;message:string}>; archiveBackup(id:number):Promise<void>; getLatestCompleted():Promise<BackupRecord|null>;
}

/** SQLite-safe backup service with controlled restart-required restore staging. */
export class SafeBackupService implements ISafeBackupService {
  private readonly backupDir:string;
  constructor(private readonly config:EnvConfig,private readonly repository:IBackupRepository=createBackupRepository()){this.backupDir=resolveBackupDirectory(config);}
  async listBackups(){return this.repository.listBackups();}
  async getBackup(id:number){const record=(await this.repository.listBackups()).find(item=>item.id===id);if(!record)throw new AppError('Backup not found.',404);return record;}
  async getLatestCompleted(){return this.repository.getLatestCompleted();}
  async createBackup(createdBy:number|null,type:BackupType='MANUAL'){
    fs.mkdirSync(this.backupDir,{recursive:true});const timestamp=new Date().toISOString().replace(/[:.]/g,'-');const filename=`inventory-${type.toLowerCase()}-${timestamp}.sqlite`;const filePath=path.join(this.backupDir,filename);const record=await this.repository.createBackupRecord(filename,filePath,type,createdBy);
    try{getCurrentDb().pragma('wal_checkpoint(PASSIVE)');await getCurrentDb().backup(filePath);validateDatabase(filePath);const stats=fs.statSync(filePath);await this.repository.completeBackupRecord(record.id,stats.size,checksum(filePath));return (await this.repository.getBackupById(record.id))!;}catch(error){const message=error instanceof Error?error.message:'Unknown backup error';await this.repository.failBackupRecord(record.id,message);throw new AppError(`Backup failed: ${message}`,500);}
  }
  private async file(id:number){const record=await this.repository.getBackupById(id);if(!record||!['COMPLETED','VERIFIED'].includes(record.status))throw new AppError('Backup not found or unavailable.',404);assertInside(this.backupDir,record.filePath);if(!fs.existsSync(record.filePath))throw new AppError('Backup file is missing from disk.',404);return record;}
  async getDownload(id:number){const record=await this.file(id);return{filePath:record.filePath,filename:path.basename(record.filename)};}
  async verifyBackup(id:number){const record=await this.file(id);const actual=checksum(record.filePath);let valid=actual===record.checksum;try{if(valid)validateDatabase(record.filePath);}catch{valid=false;}await this.repository.markVerification(id,valid,valid?'Checksum and SQLite integrity verified.':'Checksum or SQLite integrity verification failed.');return{valid,checksum:actual};}
  async restoreBackup(id:number,createdBy:number|null){const record=await this.file(id);const verification=await this.verifyBackup(id);if(!verification.valid)throw new AppError('Backup failed verification and cannot be restored.',400);const safety=await this.createBackup(createdBy,'PRE_RESTORE');const safetyFile=await this.repository.getBackupById(safety.id);const safetySize=safetyFile?.sizeBytes;const safetyChecksum=safetyFile?.checksum;if(!safetyChecksum||!safetySize)throw new AppError('Pre-restore safety backup failed.',500);const stagedFilename=`restore-${Date.now()}.sqlite.restore-pending`;const staged=path.join(this.backupDir,stagedFilename);fs.copyFileSync(record.filePath,staged);validateDatabase(staged);const marker:RestoreMarker={stagedFilename,preRestoreFilename:safety.filename,preRestoreSize:safetySize,preRestoreChecksum:safetyChecksum,createdBy};fs.writeFileSync(path.join(this.backupDir,markerName),JSON.stringify(marker),{encoding:'utf8',flag:'wx'});return{success:true,restartRequired:true,message:'Restore staged successfully. Restart the backend to apply it safely.'};}
  async archiveBackup(id:number){const record=await this.repository.getBackupById(id);if(!record)throw new AppError('Backup not found.',404);assertInside(this.backupDir,record.filePath);if(fs.existsSync(record.filePath))fs.unlinkSync(record.filePath);await this.repository.archiveBackupRecord(id,'Archived by administrator.');}
}

/** Applies a staged restore before the application opens SQLite. */
export function applyPendingRestore(config:EnvConfig):RestoreMarker|null{const root=resolveBackupDirectory(config);const markerPath=path.join(root,markerName);if(!fs.existsSync(markerPath))return null;const marker=JSON.parse(fs.readFileSync(markerPath,'utf8')) as RestoreMarker;const staged=path.join(root,marker.stagedFilename);assertInside(root,staged);validateDatabase(staged);const target=path.resolve(config.DATABASE_PATH);fs.mkdirSync(path.dirname(target),{recursive:true});const old=`${target}.restore-old`;if(fs.existsSync(old))fs.unlinkSync(old);if(fs.existsSync(target))fs.renameSync(target,old);try{fs.renameSync(staged,target);for(const ext of ['-wal','-shm'])if(fs.existsSync(`${target}${ext}`))fs.unlinkSync(`${target}${ext}`);validateDatabase(target);if(fs.existsSync(old))fs.unlinkSync(old);return marker;}catch(error){if(fs.existsSync(old)){if(fs.existsSync(target))fs.unlinkSync(target);fs.renameSync(old,target);}throw error;}}

/** Finalizes restored metadata and invalidates all restored sessions. */
export function finalizePendingRestore(config:EnvConfig,db:Database.Database,marker:RestoreMarker|null):void{if(!marker)return;db.prepare("UPDATE user_sessions SET revoked_at=COALESCE(revoked_at,datetime('now'))").run();const filePath=path.join(resolveBackupDirectory(config),marker.preRestoreFilename);db.prepare("INSERT INTO backup_records(filename,file_path,size_bytes,backup_type,status,checksum,notes,completed_at,created_by) VALUES(?,?,?,'PRE_RESTORE','VERIFIED',?,'Created automatically before restore.',datetime('now'),?)").run(marker.preRestoreFilename,filePath,marker.preRestoreSize,marker.preRestoreChecksum,marker.createdBy);fs.unlinkSync(path.join(resolveBackupDirectory(config),markerName));}

export const createSafeBackupService=(config:EnvConfig,repository?:IBackupRepository):ISafeBackupService=>new SafeBackupService(config,repository);
