import { Router } from 'express';
import type { NextFunction,Request,Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { requireAuthentication } from '../middleware/auth';
import type { AuthService } from '../services/AuthService';
import type { NotificationService } from '../services/NotificationService';
/** Authenticated routes; user identity always comes from the session. */
export function createNotificationRouter(service:NotificationService,auth:AuthService):Router{const r=Router();r.use(requireAuthentication(auth));r.get('/',(req,res)=>res.json(service.list(req.auth!.userId,{read:req.query.read===undefined?undefined:req.query.read==='true',page:Number(req.query.page)||1,pageSize:Math.min(Number(req.query.pageSize)||20,100)})));r.get('/unread-count',(req,res)=>res.json({count:service.unreadCount(req.auth!.userId)}));r.post('/read-all',(req,res)=>{service.markAllRead(req.auth!.userId);res.status(204).end()});r.post('/:id/read',(req:Request,res:Response,next:NextFunction)=>{try{const id=Number(req.params.id);if(!Number.isInteger(id)||id<1)throw new AppError('Invalid notification ID',400);res.json(service.markRead(req.auth!.userId,id))}catch(error){next(error)}});return r}
