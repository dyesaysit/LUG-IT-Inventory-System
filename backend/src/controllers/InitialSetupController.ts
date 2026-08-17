import type { NextFunction, Request, Response } from 'express';
import type { InitialSetupService } from '../services/InitialSetupService';

/** Handles the unauthenticated, one-time initial setup API. */
export class InitialSetupController {
  constructor(private readonly setup: InitialSetupService) {}

  /** Returns the current setup state. */
  status = (_req: Request, res: Response): void => {
    res.json(this.setup.getStatus());
  };

  /** Creates the initial administrator. */
  complete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.setup.complete(req.body);
      res.status(201).json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}
