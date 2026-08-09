import type { Notification, NotificationListQuery } from 'shared';
import { AppError } from '../middleware/errorHandler';
import type { CreateNotificationRecord } from '../repositories/NotificationRepository';
import type { NotificationRepository } from '../repositories/NotificationRepository';
/** Best-effort delivery with authoritative recipient resolution. */
export class NotificationService {
 constructor(private readonly repo:NotificationRepository){}
 notifyPermission(permission:string,n:Omit<CreateNotificationRecord,'userId'>):void{this.safe(this.repo.activeUserIdsWithPermission(permission).map(userId=>({...n,userId})))}
 notifyUser(userId:number|null,n:Omit<CreateNotificationRecord,'userId'>):void{if(userId)this.safe([{...n,userId}])}
 list(userId:number,q:NotificationListQuery):Notification[]{return this.repo.listForUser(userId,q)}
 unreadCount(userId:number):number{return this.repo.unreadCount(userId)}
 markRead(userId:number,id:number):Notification{const result=this.repo.markRead(userId,id);if(!result)throw new AppError('Notification not found',404);return result}
 markAllRead(userId:number):void{this.repo.markAllRead(userId)}
 private safe(rows:CreateNotificationRecord[]):void{if(!rows.length)return;try{this.repo.createMany(rows)}catch(error){console.error('Notification delivery failed:',error instanceof Error?error.message:'Unknown error')}}
}
