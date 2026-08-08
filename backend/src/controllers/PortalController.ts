import type { CreateEquipmentRequestInput, ReportProblemInput } from 'shared';
import type { PortalService } from '../services/PortalService';

/** Controller for the staff self-service portal. All actions are scoped to the caller. */
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  profile(userId: number) {
    return this.portal.getProfile(userId);
  }

  assets(userId: number) {
    return this.portal.getMyAssets(userId);
  }

  reportProblem(userId: number, input: ReportProblemInput) {
    return this.portal.reportProblem(userId, input);
  }

  requests(userId: number) {
    return this.portal.getMyRequests(userId);
  }

  createRequest(userId: number, input: CreateEquipmentRequestInput) {
    return this.portal.createRequest(userId, input);
  }

  cancelRequest(userId: number, id: number) {
    return this.portal.cancelRequest(userId, id);
  }
}
