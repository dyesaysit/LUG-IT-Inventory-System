import type Database from 'better-sqlite3';
import type { Notification, NotificationEntityType, NotificationListQuery } from 'shared';
import { getCurrentDb } from '../database/connection';
interface Row { id:number;user_id:number;type:string;title:string;message:string;entity_type:NotificationEntityType;entity_id:number;is_read:number;created_at:string;read_at:string|null }
const map=(r:Row):Notification=>({id:r.id,userId:r.user_id,type:r.type,title:r.title,message:r.message,entityType:r.entity_type,entityId:r.entity_id,isRead:r.is_read===1,createdAt:r.created_at,readAt:r.read_at});
export interface CreateNotificationRecord {userId:number;type:string;title:string;message:string;entityType:NotificationEntityType;entityId:number}
/** Owner-scoped notification persistence and permission-based recipient lookup. */
export class NotificationRepository {
 constructor(private readonly db:Database.Database=getCurrentDb()){}
 activeUserIdsWithPermission(code:string):number[]{return (this.db.prepare(`SELECT DISTINCT u.id FROM users u JOIN role_permissions rp ON rp.role_id=u.role_id JOIN permissions p ON p.id=rp.permission_id WHERE p.code=? AND u.is_active=1 AND u.archived_at IS NULL`).all(code) as {id:number}[]).map(r=>r.id)}
 createMany(rows:CreateNotificationRecord[]):void{const insert=this.db.prepare(`INSERT INTO notifications(user_id,type,title,message,entity_type,entity_id) VALUES(@userId,@type,@title,@message,@entityType,@entityId)`);this.db.transaction(()=>rows.forEach(r=>insert.run(r)))()}
 listForUser(userId:number,q:NotificationListQuery):Notification[]{const filter=q.read===undefined?'':'AND is_read=@isRead';return (this.db.prepare(`SELECT * FROM notifications WHERE user_id=@userId ${filter} ORDER BY created_at DESC,id DESC LIMIT @limit OFFSET @offset`).all({userId,isRead:q.read?1:0,limit:q.pageSize??20,offset:((q.page??1)-1)*(q.pageSize??20)}) as Row[]).map(map)}
 unreadCount(userId:number):number{return (this.db.prepare('SELECT COUNT(*) count FROM notifications WHERE user_id=? AND is_read=0').get(userId) as {count:number}).count}
 markRead(userId:number,id:number):Notification|null{this.db.prepare("UPDATE notifications SET is_read=1,read_at=COALESCE(read_at,datetime('now')) WHERE id=? AND user_id=?").run(id,userId);const row=this.db.prepare('SELECT * FROM notifications WHERE id=? AND user_id=?').get(id,userId) as Row|undefined;return row?map(row):null}
 markAllRead(userId:number):void{this.db.prepare("UPDATE notifications SET is_read=1,read_at=COALESCE(read_at,datetime('now')) WHERE user_id=? AND is_read=0").run(userId)}
}
