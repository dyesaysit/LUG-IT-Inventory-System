import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import Database from 'better-sqlite3';
import { AuditRepository } from '../repositories/AuditRepository';
import { RoleRepository } from '../repositories/RoleRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { UserRepository } from '../repositories/UserRepository';
import { AuditService } from '../services/AuditService';
import { AuthService } from '../services/AuthService';
import { PasswordService } from '../services/PasswordService';

const migration = (name: string) => fs.readFileSync(path.resolve(__dirname, `../database/migrations/${name}`), 'utf8');
const setup = async () => {
  const db = new Database(':memory:');
  for (const name of ['002_assets.sql','003_departments.sql','004_people.sql','009_audit_logs.sql','010_authentication.sql']) db.exec(migration(name));
  const users = new UserRepository(db); const roles = new RoleRepository(db); const sessions = new SessionRepository(db); const passwords = new PasswordService();
  const role = await roles.getRoleByCode('SYSTEM_ADMINISTRATOR'); assert.ok(role);
  const user = await users.createUser({ username:'admin',email:'admin@example.test',roleId:role.id,temporaryPassword:'Admin@1',confirmTemporaryPassword:'Admin@1',isActive:true }, await passwords.hash('Admin@1'));
  const auth = new AuthService(users,roles,sessions,passwords,new AuditService(new AuditRepository(db)));
  return { db,users,sessions,auth,user };
};
const context = { ipAddress:'127.0.0.1',userAgent:'test' };

describe('AuthService', () => {
  it('logs in, stores only a token hash, and authenticates the session', async () => { const x=await setup(); const result=await x.auth.login({identity:'admin',password:'Admin@1'},context); assert.equal((await x.auth.authenticateSession(result.token))?.auth.userId,x.user.id); const row=x.db.prepare('SELECT token_hash FROM user_sessions').get() as {token_hash:string}; assert.notEqual(row.token_hash,result.token); assert.equal(row.token_hash.length,64); x.db.close(); });
  it('uses the same generic error for unknown users and invalid passwords', async () => { const x=await setup(); await assert.rejects(x.auth.login({identity:'missing',password:'Wrong@1'},context),/Invalid username or password/); await assert.rejects(x.auth.login({identity:'admin',password:'Wrong@1'},context),/Invalid username or password/); x.db.close(); });
  it('rejects inactive users', async () => { const x=await setup(); await x.users.deactivateUser(x.user.id); await assert.rejects(x.auth.login({identity:'admin',password:'Admin@1'},context),/Invalid username or password/); x.db.close(); });
  it('locks an account after five failed attempts', async () => { const x=await setup(); for(let index=0;index<5;index+=1) await assert.rejects(x.auth.login({identity:'admin',password:'Wrong@1'},context)); const user=await x.users.getUserById(x.user.id); assert.ok(user?.lockedUntil); await assert.rejects(x.auth.login({identity:'admin',password:'Admin@1'},context),/temporarily locked/); x.db.close(); });
  it('logout revokes the current session', async () => { const x=await setup(); const result=await x.auth.login({identity:'admin',password:'Admin@1'},context); await x.auth.logout(result.token); assert.equal(await x.auth.authenticateSession(result.token),null); x.db.close(); });
  it('logout all revokes every user session', async () => { const x=await setup(); const first=await x.auth.login({identity:'admin',password:'Admin@1'},context); const second=await x.auth.login({identity:'admin',password:'Admin@1'},context); await x.auth.logoutAll(x.user.id); assert.equal(await x.auth.authenticateSession(first.token),null); assert.equal(await x.auth.authenticateSession(second.token),null); x.db.close(); });
  it('changes a password, clears the forced-change flag, and rejects reuse', async () => { const x=await setup(); await assert.rejects(x.auth.changePassword(x.user.id,{currentPassword:'Admin@1',newPassword:'Admin@1',confirmNewPassword:'Admin@1'}),/different/); await x.auth.changePassword(x.user.id,{currentPassword:'Admin@1',newPassword:'Better@2',confirmNewPassword:'Better@2'}); assert.equal((await x.users.getUserById(x.user.id))?.mustChangePassword,false); await x.auth.login({identity:'admin',password:'Better@2'},context); x.db.close(); });
  it('rejects expired and revoked sessions', async () => { const x=await setup(); const result=await x.auth.login({identity:'admin',password:'Admin@1'},context); x.db.prepare("UPDATE user_sessions SET expires_at=datetime('now','-1 minute')").run(); assert.equal(await x.auth.authenticateSession(result.token),null); x.db.close(); });
});
