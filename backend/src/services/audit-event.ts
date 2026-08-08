import type { AuditAction,AuditEntityType } from 'shared';import type { IAuditService } from './AuditService';
let service:IAuditService|null=null;export const configureAudit=(value:IAuditService)=>{service=value;};
/** Records an event after a successful business operation. */
export const recordAudit=async(entityType:AuditEntityType,entityId:number|null,action:AuditAction,summary:string,previousValues:object|null=null,newValues:object|null=null)=>{if(!service)return;await service.record({entityType,entityId,action,summary,previousValues:previousValues as Record<string,unknown>|null,newValues:newValues as Record<string,unknown>|null,performedBy:'system',performedByName:'System'});};
