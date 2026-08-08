import type { EquipmentRequestListQuery, FulfilRequestInput, ReviewRequestInput } from 'shared';
import type { RequestReviewService, Reviewer } from '../services/RequestReviewService';

/** Admin controller for reviewing and fulfilling staff equipment requests. */
export class RequestReviewController {
  constructor(private readonly service: RequestReviewService) {}

  list(query: EquipmentRequestListQuery) {
    return this.service.list(query);
  }

  getById(id: number) {
    return this.service.getById(id);
  }

  approve(id: number, input: ReviewRequestInput, reviewer: Reviewer) {
    return this.service.approve(id, input, reviewer);
  }

  reject(id: number, input: ReviewRequestInput, reviewer: Reviewer) {
    return this.service.reject(id, input, reviewer);
  }

  requestMoreInformation(id: number, input: ReviewRequestInput, reviewer: Reviewer) {
    return this.service.requestMoreInformation(id, input, reviewer);
  }

  fulfil(id: number, input: FulfilRequestInput, reviewer: Reviewer) {
    return this.service.fulfil(id, input, reviewer);
  }
}
