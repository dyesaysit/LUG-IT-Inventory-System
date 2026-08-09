export type NotificationEntityType = 'TICKET' | 'EQUIPMENT_REQUEST';
export interface Notification { id:number; userId:number; type:string; title:string; message:string; entityType:NotificationEntityType; entityId:number; isRead:boolean; createdAt:string; readAt:string|null }
export interface NotificationListQuery { read?:boolean; page?:number; pageSize?:number }
