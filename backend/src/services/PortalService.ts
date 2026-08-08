import { CreateEquipmentRequestInputSchema, ReportProblemInputSchema } from 'shared';
import type {
  AssetAssignment,
  CreateEquipmentRequestInput,
  EquipmentRequest,
  MaintenanceRecord,
  PortalProfile,
  ReportProblemInput,
} from 'shared';
import { AppError } from '../middleware/errorHandler';
import type { IEquipmentRequestRepository } from '../repositories/EquipmentRequestRepository';
import type { IUserRepository } from '../repositories/UserRepository';
import type { IAssignmentService } from './AssignmentService';
import type { IMaintenanceService } from './MaintenanceService';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Staff Portal service. Everything is scoped to the signed-in user: staff can
 * only see their own assigned assets and requests, and can only report problems
 * on assets currently assigned to them. Problem reports are created as
 * maintenance records, reusing the existing Maintenance module.
 */
export class PortalService {
  constructor(
    private readonly users: IUserRepository,
    private readonly assignments: IAssignmentService,
    private readonly maintenance: IMaintenanceService,
    private readonly requests: IEquipmentRequestRepository,
  ) {}

  async getProfile(userId: number): Promise<PortalProfile> {
    const user = await this.users.getUserById(userId);
    if (!user) throw new AppError('User not found', 404);
    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      personId: user.personId,
      personName: user.personName,
    };
  }

  async getMyAssets(userId: number): Promise<AssetAssignment[]> {
    const user = await this.users.getUserById(userId);
    if (!user?.personId) return [];
    return this.assignments.list({ personId: user.personId, status: 'ACTIVE', pageSize: 200 });
  }

  async reportProblem(userId: number, input: ReportProblemInput): Promise<MaintenanceRecord> {
    const parsed = ReportProblemInputSchema.parse(input);
    const user = await this.users.getUserById(userId);
    if (!user?.personId) {
      throw new AppError('Your account is not linked to a staff record. Please contact IT.', 400);
    }
    const active = await this.assignments.list({
      personId: user.personId,
      assetId: parsed.assetId,
      status: 'ACTIVE',
      pageSize: 1,
    });
    if (active.length === 0) {
      throw new AppError('You can only report problems on assets currently assigned to you.', 403);
    }
    return this.maintenance.create({
      assetId: parsed.assetId,
      maintenanceType: 'CORRECTIVE',
      priority: parsed.priority,
      reportedDate: today(),
      reportedByPersonId: user.personId,
      faultDescription: parsed.faultDescription,
    });
  }

  async createRequest(userId: number, input: CreateEquipmentRequestInput): Promise<EquipmentRequest> {
    const parsed = CreateEquipmentRequestInputSchema.parse(input);
    const user = await this.users.getUserById(userId);
    return this.requests.create(userId, user?.personId ?? null, parsed);
  }

  async getMyRequests(userId: number): Promise<EquipmentRequest[]> {
    return this.requests.listByUser(userId);
  }

  async cancelRequest(userId: number, id: number): Promise<EquipmentRequest> {
    const request = await this.requests.getById(id);
    if (!request || request.requestedByUserId !== userId) {
      throw new AppError('Request not found', 404);
    }
    if (request.status !== 'PENDING') {
      throw new AppError('Only pending requests can be cancelled.', 400);
    }
    return this.requests.setStatus(id, 'CANCELLED');
  }
}
