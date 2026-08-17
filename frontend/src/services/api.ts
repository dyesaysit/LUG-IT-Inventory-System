import axios from 'axios';
import type {
  EquipmentRequest,
  EquipmentRequestListQuery,
  CreateEquipmentRequestInput,
  ReviewRequestInput,
  FulfilRequestInput,
  ReportProblemInput,
  PortalProfile,
} from 'shared';
import type {
  Ticket,
  TicketListQuery,
  TicketSummary,
  CreateTicketInput,
  AssignTicketInput,
  CompleteTicketInput,
  ConvertTicketInput,
} from 'shared';
import type {
  ChangePasswordInput,
  LoginInput,
  LoginResponse,
  AssetListQuery,
  InventoryAsset as Asset,
  InventoryAssetCategory as AssetCategory,
  InventoryCreateAssetInput as CreateAssetInput,
  InventoryUpdateAssetInput as UpdateAssetInput,
  CreateDepartmentInput,
  Department,
  DepartmentListQuery,
  UpdateDepartmentInput,
  CreatePersonInput,
  Person,
  PersonListQuery,
  UpdatePersonInput,
  CreateLocationInput,
  Location,
  LocationListQuery,
  UpdateLocationInput,
  AssetAssignment,
  AssignmentListQuery,
  CreateAssignmentInput,
  ReturnAssignmentInput,
  UpdateAssignmentInput,
  MaintenanceRecord,
  MaintenanceListQuery,
  MaintenanceSummary,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  CompleteMaintenanceInput,
  RepairJob,
  RepairListQuery,
  RepairSummary,
  CreateRepairInput,
  UpdateRepairInput,
  ApproveRepairInput,
  CompleteRepairInput,
  ReturnRepairInput,
  AuditLog,
  AuditLogQuery,
  AuditSummary,
  ReportCatalogItem,
  ReportFilter,
  ReportResult,
  ReportSummary,
  ReportType,
  ReportFormat,
  SettingsResponse,
  SystemSetting,
  SystemInformation,
  DatabaseMaintenanceResult,
  DatabaseStatus,
  UpdateSettingInput,
  BatchUpdateSettingsInput,
  BackupRecord,
  RestoreBackupResult,
  RestoreBackupInput,
  CreateAssetCategoryInput,
  UpdateAssetCategoryInput,
  CreateUserInput,
  ResetPasswordInput,
  Role,
  Permission,
  UpdateUserInput,
  User,
  UserListQuery,
  Notification,
  NotificationListQuery,
  InitialSetupInput,
  InitialSetupStatus,
} from 'shared';

/**
 * API base URL.
 */
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError<{ error?: string }>(error)) return Promise.reject(error);
    const status = error.response?.status;
    const validationMessage = status && status < 500 ? error.response?.data?.error : undefined;
    error.message = validationMessage ?? 'We could not complete this request. Please try again.';
    return Promise.reject(error);
  },
);

/**
 * Assets API endpoint.
 */
const ASSETS_ENDPOINT = '/assets';
const ASSET_CATEGORIES_ENDPOINT = '/asset-categories';
const DEPARTMENTS_ENDPOINT = '/departments';
const PEOPLE_ENDPOINT = '/people';
const LOCATIONS_ENDPOINT = '/locations';
const ASSIGNMENTS_ENDPOINT = '/assignments';

export interface EmailSettingsView { enabled:boolean;smtpHost:string;smtpPort:number;smtpSecure:boolean;smtpUsername:string;fromName:string;fromAddress:string;applicationUrl:string;passwordConfigured:boolean }
export interface EmailSettingsInput extends Omit<EmailSettingsView,'passwordConfigured'>{smtpPassword?:string}
export const fetchEmailSettings=async():Promise<EmailSettingsView>=>(await api.get('/settings/email/config')).data;
export const saveEmailSettings=async(input:EmailSettingsInput):Promise<EmailSettingsView>=>(await api.put('/settings/email/config',input)).data;
export const sendTestEmail=async(recipient:string):Promise<{success:boolean;message:string}>=>(await api.post('/settings/email/test',{recipient})).data;
const MAINTENANCE_ENDPOINT = '/maintenance';
const REPAIRS_ENDPOINT = '/repairs';
const AUDIT_ENDPOINT = '/audit';
const REPORTS_ENDPOINT = '/reports';
const AUTH_ENDPOINT = '/auth';

/** Fetches whether the one-time administrator setup is required. */
export const fetchInitialSetupStatus = async (): Promise<InitialSetupStatus> =>
  (await api.get<InitialSetupStatus>('/setup')).data;

/** Completes the one-time initial administrator setup. */
export const completeInitialSetup = async (input: InitialSetupInput): Promise<void> => {
  await api.post('/setup', input);
};

/** Logs in with credentials; the session is issued as an httpOnly cookie. */
export const login = async (input: LoginInput): Promise<LoginResponse> =>
  (await api.post<LoginResponse>(`${AUTH_ENDPOINT}/login`, input)).data;
/** Clears the current session cookie. */
export const logout = async (): Promise<void> => {
  await api.post(`${AUTH_ENDPOINT}/logout`);
};
/** Fetches the currently authenticated user, or rejects with 401 if none. */
export const fetchCurrentUser = async (): Promise<LoginResponse> =>
  (await api.get<LoginResponse>(`${AUTH_ENDPOINT}/me`)).data;
/** Changes the current user's password. */
export const changePassword = async (input: ChangePasswordInput): Promise<void> => {
  await api.post(`${AUTH_ENDPOINT}/change-password`, input);
};
/** Revokes every session belonging to the current user. */
export const logoutAll = async (): Promise<void> => { await api.post(`${AUTH_ENDPOINT}/logout-all`); };
/** Lists users visible to the current administrator. */
export const fetchUsers = async (query: UserListQuery = {}): Promise<User[]> => (await api.get<User[]>('/users', { params: query })).data;
export const fetchUser = async (id: number): Promise<User> => (await api.get<User>(`/users/${id}`)).data;
export const createUser = async (input: CreateUserInput): Promise<User> => (await api.post<User>('/users', input)).data;
export const updateUser = async (id: number, input: UpdateUserInput): Promise<User> => (await api.patch<User>(`/users/${id}`, input)).data;
export const deactivateUser = async (id: number): Promise<void> => { await api.post(`/users/${id}/deactivate`); };
export const reactivateUser = async (id: number): Promise<void> => { await api.post(`/users/${id}/reactivate`); };
export const resetUserPassword = async (id: number, input: ResetPasswordInput): Promise<void> => { await api.post(`/users/${id}/reset-password`, input); };
export const revokeUserSessions = async (id: number): Promise<void> => { await api.post(`/users/${id}/revoke-sessions`); };
export const unlockUser = async (id: number): Promise<User> => (await api.post<User>(`/users/${id}/unlock`)).data;
export const fetchRoles = async (): Promise<Role[]> => (await api.get<Role[]>('/roles')).data;

// ----- Staff Portal -----
export const fetchPortalProfile = async (): Promise<PortalProfile> => (await api.get<PortalProfile>('/portal/me')).data;
export const fetchMyAssets = async (): Promise<AssetAssignment[]> => (await api.get<AssetAssignment[]>('/portal/assets')).data;
export const reportAssetProblem = async (input: ReportProblemInput): Promise<Ticket> =>
  (await api.post<Ticket>('/portal/problems', input)).data;
export const fetchMyTickets = async (): Promise<Ticket[]> =>
  (await api.get<Ticket[]>('/portal/tickets')).data;
export const createPortalTicket = async (input: CreateTicketInput): Promise<Ticket> =>
  (await api.post<Ticket>('/portal/tickets', input)).data;
export const fetchMyRequests = async (): Promise<EquipmentRequest[]> =>
  (await api.get<EquipmentRequest[]>('/portal/requests')).data;
export const createEquipmentRequest = async (input: CreateEquipmentRequestInput): Promise<EquipmentRequest> =>
  (await api.post<EquipmentRequest>('/portal/requests', input)).data;
export const cancelEquipmentRequest = async (id: number): Promise<EquipmentRequest> =>
  (await api.post<EquipmentRequest>(`/portal/requests/${id}/cancel`)).data;

// ----- Admin equipment-request review -----
export const fetchEquipmentRequests = async (
  query: EquipmentRequestListQuery = {},
): Promise<EquipmentRequest[]> =>
  (await api.get<EquipmentRequest[]>('/equipment-requests', { params: query })).data;
export const fetchEquipmentRequest = async (id: number): Promise<EquipmentRequest> =>
  (await api.get<EquipmentRequest>(`/equipment-requests/${id}`)).data;
export const approveEquipmentRequest = async (id: number, input: ReviewRequestInput = {}): Promise<EquipmentRequest> =>
  (await api.post<EquipmentRequest>(`/equipment-requests/${id}/approve`, input)).data;
export const rejectEquipmentRequest = async (id: number, input: ReviewRequestInput = {}): Promise<EquipmentRequest> =>
  (await api.post<EquipmentRequest>(`/equipment-requests/${id}/reject`, input)).data;
export const requestMoreInformation = async (id: number, input: ReviewRequestInput): Promise<EquipmentRequest> =>
  (await api.post<EquipmentRequest>(`/equipment-requests/${id}/request-info`, input)).data;
export const fulfilEquipmentRequest = async (id: number, input: FulfilRequestInput): Promise<EquipmentRequest> =>
  (await api.post<EquipmentRequest>(`/equipment-requests/${id}/fulfil`, input)).data;

// ----- Ticket Management -----
export const fetchTickets = async (query: TicketListQuery = {}): Promise<Ticket[]> =>
  (await api.get<Ticket[]>('/tickets', { params: query })).data;
export const fetchTicketSummary = async (): Promise<TicketSummary> =>
  (await api.get<TicketSummary>('/tickets/summary')).data;
export const createTicket = async (input: CreateTicketInput): Promise<Ticket> =>
  (await api.post<Ticket>('/tickets', input)).data;
export const assignTicket = async (id: number, input: AssignTicketInput): Promise<Ticket> =>
  (await api.post<Ticket>(`/tickets/${id}/assign`, input)).data;
export const startTicket = async (id: number): Promise<Ticket> =>
  (await api.post<Ticket>(`/tickets/${id}/start`)).data;
export const convertTicket = async (id: number, input: ConvertTicketInput): Promise<Ticket> =>
  (await api.post<Ticket>(`/tickets/${id}/convert`, input)).data;
export const completeTicket = async (id: number, input: CompleteTicketInput): Promise<Ticket> =>
  (await api.post<Ticket>(`/tickets/${id}/complete`, input)).data;
export const closeTicket = async (id: number): Promise<Ticket> =>
  (await api.post<Ticket>(`/tickets/${id}/close`)).data;
export const cancelTicket = async (id: number): Promise<Ticket> =>
  (await api.post<Ticket>(`/tickets/${id}/cancel`)).data;
export const requestTicketInformation = async (id:number,message:string):Promise<void>=>{await api.post(`/tickets/${id}/request-information`,{message})};
export const respondToTicket = async (id:number,message:string):Promise<void>=>{await api.post(`/tickets/${id}/respond`,{message})};
export const fetchPermissions = async (): Promise<Permission[]> => (await api.get<Permission[]>('/permissions')).data;
export const fetchNotifications = async (query:NotificationListQuery={}):Promise<Notification[]> => (await api.get<Notification[]>('/notifications',{params:query})).data;
export const fetchUnreadNotificationCount = async ():Promise<number> => (await api.get<{count:number}>('/notifications/unread-count')).data.count;
export const markNotificationRead = async (id:number):Promise<Notification> => (await api.post<Notification>(`/notifications/${id}/read`)).data;
export const markAllNotificationsRead = async ():Promise<void> => { await api.post('/notifications/read-all'); };

interface AssetApiResponse {
  id: number;
  asset_tag: string;
  serial_number: string | null;
  category_id: number;
  manufacturer: string;
  model: string;
  description: string;
  purchase_date: string | null;
  purchase_cost: number | null;
  warranty_expiry_date: string | null;
  condition: Asset['condition'];
  status: Asset['status'];
  current_location_id: number | null;
  current_location: string;
  notes: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface AssetCategoryApiResponse {
  id: number;
  name: string;
  description: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const mapAsset = (asset: AssetApiResponse): Asset => ({
  id: asset.id,
  assetTag: asset.asset_tag,
  serialNumber: asset.serial_number,
  categoryId: asset.category_id,
  manufacturer: asset.manufacturer,
  model: asset.model,
  description: asset.description,
  purchaseDate: asset.purchase_date,
  purchaseCost: asset.purchase_cost,
  warrantyExpiryDate: asset.warranty_expiry_date,
  condition: asset.condition,
  status: asset.status,
  currentLocationId: asset.current_location_id,
  currentLocation: asset.current_location,
  notes: asset.notes,
  createdAt: asset.created_at,
  updatedAt: asset.updated_at,
  archivedAt: asset.archived_at,
});

const mapAssetCategory = (category: AssetCategoryApiResponse): AssetCategory => ({
  id: category.id,
  name: category.name,
  description: category.description,
  isActive: category.is_active === 1,
  createdAt: category.created_at,
  updatedAt: category.updated_at,
});

/**
 * Fetches the available asset categories.
 *
 * @returns Promise of asset categories
 */
export const fetchAssetCategories = async (): Promise<AssetCategory[]> => {
  const response = await api.get<AssetCategoryApiResponse[]>(ASSET_CATEGORIES_ENDPOINT);
  return response.data.map(mapAssetCategory);
};

/**
 * Fetches a list of assets.
 *
 * @param query - Query parameters (e.g. search, status, condition)
 * @returns Promise of asset list
 */
export const fetchAssets = async (query: AssetListQuery = {}): Promise<Asset[]> => {
  const response = await api.get<AssetApiResponse[]>(ASSETS_ENDPOINT, { params: query });
  return response.data.map(mapAsset);
};

/**
 * Fetches an asset by ID.
 *
 * @param id - Asset ID
 * @returns Promise of asset object
 */
export const fetchAssetById = async (id: number): Promise<Asset> => {
  const response = await api.get<AssetApiResponse>(`${ASSETS_ENDPOINT}/${id}`);
  return mapAsset(response.data);
};

/**
 * Creates a new asset.
 *
 * @param asset - Asset object
 * @returns Promise of created asset object
 */
export const createAsset = async (asset: CreateAssetInput): Promise<Asset> => {
  const response = await api.post<AssetApiResponse>(ASSETS_ENDPOINT, asset);
  return mapAsset(response.data);
};

/**
 * Updates an existing asset.
 *
 * @param id - Asset ID
 * @param asset - Asset object
 * @returns Promise of updated asset object
 */
export const updateAsset = async (id: number, asset: UpdateAssetInput): Promise<Asset> => {
  const response = await api.patch<AssetApiResponse>(`${ASSETS_ENDPOINT}/${id}`, asset);
  return mapAsset(response.data);
};

/**
 * Archives an asset.
 *
 * @param id - Asset ID
 * @returns Promise of archived asset object
 */
export const archiveAsset = async (id: number): Promise<void> => {
  await api.delete(`${ASSETS_ENDPOINT}/${id}`);
};

/** Fetches departments matching the supplied filters. */
export const fetchDepartments = async (
  query: DepartmentListQuery = {},
): Promise<Department[]> => {
  const response = await api.get<Department[]>(DEPARTMENTS_ENDPOINT, { params: query });
  return response.data;
};

/** Fetches one department by its numeric identifier. */
export const fetchDepartment = async (id: number): Promise<Department> => {
  const response = await api.get<Department>(`${DEPARTMENTS_ENDPOINT}/${id}`);
  return response.data;
};

/** Creates a department. */
export const createDepartment = async (
  input: CreateDepartmentInput,
): Promise<Department> => {
  const response = await api.post<Department>(DEPARTMENTS_ENDPOINT, input);
  return response.data;
};

/** Updates a department. */
export const updateDepartment = async (
  id: number,
  input: UpdateDepartmentInput,
): Promise<Department> => {
  const response = await api.patch<Department>(`${DEPARTMENTS_ENDPOINT}/${id}`, input);
  return response.data;
};

/** Archives a department without permanently deleting it. */
export const archiveDepartment = async (id: number): Promise<void> => {
  await api.delete(`${DEPARTMENTS_ENDPOINT}/${id}`);
};

/** Fetches people matching supplied filters. */
export const fetchPeople = async (query: PersonListQuery = {}): Promise<Person[]> => {
  const response = await api.get<Person[]>(PEOPLE_ENDPOINT, { params: query });
  return response.data;
};

/** Fetches one person by identifier. */
export const fetchPerson = async (id: number): Promise<Person> => {
  const response = await api.get<Person>(`${PEOPLE_ENDPOINT}/${id}`);
  return response.data;
};

/** Registers a person. */
export const createPerson = async (input: CreatePersonInput): Promise<Person> => {
  const response = await api.post<Person>(PEOPLE_ENDPOINT, input);
  return response.data;
};

/** Updates a person. */
export const updatePerson = async (id: number, input: UpdatePersonInput): Promise<Person> => {
  const response = await api.patch<Person>(`${PEOPLE_ENDPOINT}/${id}`, input);
  return response.data;
};

/** Soft-archives a person. */
export const archivePerson = async (id: number): Promise<void> => {
  await api.delete(`${PEOPLE_ENDPOINT}/${id}`);
};

/** Result returned after processing a People Excel workbook. */
export interface PeopleImportResult {
  imported: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

/** Downloads the current People import template. */
export const downloadPeopleImportTemplate = async (): Promise<void> => {
  const response = await api.get<Blob>(`${PEOPLE_ENDPOINT}/import-template`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'people-import-template.xlsx';
  link.click();
  URL.revokeObjectURL(url);
};

/** Uploads a completed People import workbook. */
export const importPeopleWorkbook = async (
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<PeopleImportResult> => {
  const formData = new FormData();
  formData.append('file', file);
  return (await api.post<PeopleImportResult>(`${PEOPLE_ENDPOINT}/import`, formData, {
    onUploadProgress: (event) => {
      if (!event.total) return;
      onProgress?.(Math.min(70, Math.round((event.loaded / event.total) * 70)));
    },
  })).data;
};

/** Fetches locations matching supplied filters. */
export const fetchLocations = async (query: LocationListQuery = {}): Promise<Location[]> => {
  const response = await api.get<Location[]>(LOCATIONS_ENDPOINT, { params: query });
  return response.data;
};

/** Fetches one location. */
export const fetchLocation = async (id: number): Promise<Location> => {
  const response = await api.get<Location>(`${LOCATIONS_ENDPOINT}/${id}`);
  return response.data;
};

/** Creates a location. */
export const createLocation = async (input: CreateLocationInput): Promise<Location> => {
  const response = await api.post<Location>(LOCATIONS_ENDPOINT, input);
  return response.data;
};

/** Updates a location. */
export const updateLocation = async (
  id: number,
  input: UpdateLocationInput,
): Promise<Location> => {
  const response = await api.patch<Location>(`${LOCATIONS_ENDPOINT}/${id}`, input);
  return response.data;
};

/** Soft-archives a location. */
export const archiveLocation = async (id: number): Promise<void> => {
  await api.delete(`${LOCATIONS_ENDPOINT}/${id}`);
};

/** Fetches assignment records. */
export const fetchAssignments = async (
  query: AssignmentListQuery = {},
): Promise<AssetAssignment[]> => {
  const response = await api.get<AssetAssignment[]>(ASSIGNMENTS_ENDPOINT, { params: query });
  return response.data;
};

/** Fetches one assignment. */
export const fetchAssignment = async (id: number): Promise<AssetAssignment> => {
  const response = await api.get<AssetAssignment>(`${ASSIGNMENTS_ENDPOINT}/${id}`);
  return response.data;
};

/** Creates an asset assignment. */
export const createAssignment = async (
  input: CreateAssignmentInput,
): Promise<AssetAssignment> => {
  const response = await api.post<AssetAssignment>(ASSIGNMENTS_ENDPOINT, input);
  return response.data;
};

/** Updates an active assignment. */
export const updateAssignment = async (
  id: number,
  input: UpdateAssignmentInput,
): Promise<AssetAssignment> => {
  const response = await api.patch<AssetAssignment>(`${ASSIGNMENTS_ENDPOINT}/${id}`, input);
  return response.data;
};

/** Returns an assigned asset. */
export const returnAssignment = async (
  id: number,
  input: ReturnAssignmentInput,
): Promise<AssetAssignment> => {
  const response = await api.post<AssetAssignment>(`${ASSIGNMENTS_ENDPOINT}/${id}/return`, input);
  return response.data;
};

/** Cancels an active assignment. */
export const cancelAssignment = async (id: number): Promise<AssetAssignment> => {
  const response = await api.post<AssetAssignment>(`${ASSIGNMENTS_ENDPOINT}/${id}/cancel`);
  return response.data;
};

/** Fetches preserved assignment history for an asset. */
export const fetchAssetAssignmentHistory = async (
  assetId: number,
): Promise<AssetAssignment[]> => {
  const response = await api.get<AssetAssignment[]>(`/assets/${assetId}/assignment-history`);
  return response.data;
};

/** Fetches maintenance records matching supplied filters. */
export const fetchMaintenanceRecords = async (
  query: MaintenanceListQuery = {},
): Promise<MaintenanceRecord[]> => {
  const response = await api.get<MaintenanceRecord[]>(MAINTENANCE_ENDPOINT, { params: query });
  return response.data;
};

/** Fetches one maintenance record. */
export const fetchMaintenanceRecord = async (id: number): Promise<MaintenanceRecord> => {
  const response = await api.get<MaintenanceRecord>(`${MAINTENANCE_ENDPOINT}/${id}`);
  return response.data;
};

/** Fetches live maintenance summary values. */
export const fetchMaintenanceSummary = async (): Promise<MaintenanceSummary> => {
  const response = await api.get<MaintenanceSummary>(`${MAINTENANCE_ENDPOINT}/summary`);
  return response.data;
};

/** Reports a maintenance request. */
export const createMaintenanceRecord = async (input: CreateMaintenanceInput): Promise<MaintenanceRecord> => {
  const response = await api.post<MaintenanceRecord>(MAINTENANCE_ENDPOINT, input);
  return response.data;
};

/** Updates a non-terminal maintenance record. */
export const updateMaintenanceRecord = async (id: number, input: UpdateMaintenanceInput): Promise<MaintenanceRecord> => {
  const response = await api.patch<MaintenanceRecord>(`${MAINTENANCE_ENDPOINT}/${id}`, input);
  return response.data;
};

/** Starts or resumes maintenance work. */
export const startMaintenance = async (id: number, input: UpdateMaintenanceInput): Promise<MaintenanceRecord> => {
  const response = await api.post<MaintenanceRecord>(`${MAINTENANCE_ENDPOINT}/${id}/start`, input);
  return response.data;
};

/** Marks maintenance as waiting for parts. */
export const markMaintenanceWaitingForParts = async (id: number, input: UpdateMaintenanceInput): Promise<MaintenanceRecord> => {
  const response = await api.post<MaintenanceRecord>(`${MAINTENANCE_ENDPOINT}/${id}/waiting-for-parts`, input);
  return response.data;
};

/** Completes maintenance and synchronizes the asset state. */
export const completeMaintenance = async (id: number, input: CompleteMaintenanceInput): Promise<MaintenanceRecord> => {
  const response = await api.post<MaintenanceRecord>(`${MAINTENANCE_ENDPOINT}/${id}/complete`, input);
  return response.data;
};

/** Cancels an open maintenance record. */
export const cancelMaintenance = async (id: number): Promise<MaintenanceRecord> => {
  const response = await api.post<MaintenanceRecord>(`${MAINTENANCE_ENDPOINT}/${id}/cancel`);
  return response.data;
};

/** Retires an asset that cannot be repaired. */
export const markMaintenanceBeyondRepair = async (id: number, input: UpdateMaintenanceInput): Promise<MaintenanceRecord> => {
  const response = await api.post<MaintenanceRecord>(`${MAINTENANCE_ENDPOINT}/${id}/beyond-repair`, input);
  return response.data;
};

/** Fetches maintenance history for an asset. */
export const fetchAssetMaintenanceHistory = async (assetId: number): Promise<MaintenanceRecord[]> => {
  const response = await api.get<MaintenanceRecord[]>(`/assets/${assetId}/maintenance-history`);
  return response.data;
};

/** Fetches formal repair jobs. */
export const fetchRepairs = async (query:RepairListQuery={}):Promise<RepairJob[]> => (await api.get<RepairJob[]>(REPAIRS_ENDPOINT,{params:query})).data;
/** Fetches one repair job. */
export const fetchRepair = async (id:number):Promise<RepairJob> => (await api.get<RepairJob>(`${REPAIRS_ENDPOINT}/${id}`)).data;
/** Fetches live repair summary totals. */
export const fetchRepairSummary = async ():Promise<RepairSummary> => (await api.get<RepairSummary>(`${REPAIRS_ENDPOINT}/summary`)).data;
/** Creates a repair job. */
export const createRepair = async (input:CreateRepairInput):Promise<RepairJob> => (await api.post<RepairJob>(REPAIRS_ENDPOINT,input)).data;
/** Updates a repair job. */
export const updateRepair = async (id:number,input:UpdateRepairInput):Promise<RepairJob> => (await api.patch<RepairJob>(`${REPAIRS_ENDPOINT}/${id}`,input)).data;
/** Submits a vendor quotation. */
export const submitRepairQuotation = async (id:number,input:UpdateRepairInput):Promise<RepairJob> => (await api.post<RepairJob>(`${REPAIRS_ENDPOINT}/${id}/quotation`,input)).data;
/** Approves a repair quotation. */
export const approveRepair = async (id:number,input:ApproveRepairInput):Promise<RepairJob> => (await api.post<RepairJob>(`${REPAIRS_ENDPOINT}/${id}/approve`,input)).data;
/** Rejects a repair quotation. */
export const rejectRepair = async (id:number,input:UpdateRepairInput):Promise<RepairJob> => (await api.post<RepairJob>(`${REPAIRS_ENDPOINT}/${id}/reject`,input)).data;
/** Sends an approved repair to its vendor. */
export const sendRepairToVendor = async (id:number,input:UpdateRepairInput):Promise<RepairJob> => (await api.post<RepairJob>(`${REPAIRS_ENDPOINT}/${id}/send-to-vendor`,input)).data;
/** Starts diagnosis, starts repair, or resumes repair. */
export const startRepair = async (id:number,input:UpdateRepairInput={}):Promise<RepairJob> => (await api.post<RepairJob>(`${REPAIRS_ENDPOINT}/${id}/start`,input)).data;
/** Marks a repair as waiting for parts. */
export const markRepairWaitingForParts = async (id:number,input:UpdateRepairInput):Promise<RepairJob> => (await api.post<RepairJob>(`${REPAIRS_ENDPOINT}/${id}/waiting-for-parts`,input)).data;
/** Completes repair work. */
export const completeRepair = async (id:number,input:CompleteRepairInput):Promise<RepairJob> => (await api.post<RepairJob>(`${REPAIRS_ENDPOINT}/${id}/complete`,input)).data;
/** Records return of a repaired asset. */
export const returnRepairToSchool = async (id:number,input:ReturnRepairInput):Promise<RepairJob> => (await api.post<RepairJob>(`${REPAIRS_ENDPOINT}/${id}/return`,input)).data;
/** Cancels a repair. */
export const cancelRepair = async (id:number):Promise<RepairJob> => (await api.post<RepairJob>(`${REPAIRS_ENDPOINT}/${id}/cancel`)).data;
/** Records a beyond-repair decision. */
export const markRepairBeyondRepair = async (id:number,input:UpdateRepairInput):Promise<RepairJob> => (await api.post<RepairJob>(`${REPAIRS_ENDPOINT}/${id}/beyond-repair`,input)).data;
/** Fetches preserved repair history for an asset. */
export const fetchAssetRepairHistory = async (assetId:number):Promise<RepairJob[]> => (await api.get<RepairJob[]>(`/assets/${assetId}/repair-history`)).data;
/** Fetches audit events using server-side paging and filters. */
export const fetchAuditLogs=async(query:AuditLogQuery={}):Promise<AuditLog[]> => (await api.get<AuditLog[]>(AUDIT_ENDPOINT,{params:query})).data;
/** Fetches one audit event. */
export const fetchAuditLog=async(id:number):Promise<AuditLog> => (await api.get<AuditLog>(`${AUDIT_ENDPOINT}/${id}`)).data;
/** Fetches an entity's complete audit timeline. */
export const fetchEntityAuditLogs=async(entity:string,id:number):Promise<AuditLog[]> => (await api.get<AuditLog[]>(`${AUDIT_ENDPOINT}/entity/${entity}/${id}`)).data;
/** Fetches audit summary totals. */
export const fetchAuditSummary=async():Promise<AuditSummary> => (await api.get<AuditSummary>(`${AUDIT_ENDPOINT}/summary`)).data;
/** Fetches the report catalog. */
export const fetchReportCatalog=async():Promise<ReportCatalogItem[]> => (await api.get<ReportCatalogItem[]>(REPORTS_ENDPOINT)).data;
/** Fetches cross-module reporting metrics. */
export const fetchReportSummary=async():Promise<ReportSummary> => (await api.get<ReportSummary>(`${REPORTS_ENDPOINT}/summary`)).data;
const report=async(path:string,filter:ReportFilter):Promise<ReportResult> => (await api.get<ReportResult>(`${REPORTS_ENDPOINT}/${path}`,{params:filter})).data;
export const fetchAssetReport=(filter:ReportFilter):Promise<ReportResult>=>report('assets',filter);
export const fetchAssignmentReport=(filter:ReportFilter):Promise<ReportResult>=>report('assignments',filter);
export const fetchMaintenanceReport=(filter:ReportFilter):Promise<ReportResult>=>report('maintenance',filter);
export const fetchRepairReport=(filter:ReportFilter):Promise<ReportResult>=>report('repairs',filter);
export const fetchDepartmentReport=(filter:ReportFilter):Promise<ReportResult>=>report('departments',filter);
export const fetchLocationReport=(filter:ReportFilter):Promise<ReportResult>=>report('locations',filter);
export const fetchPeopleReport=(filter:ReportFilter):Promise<ReportResult>=>report('people',filter);
export const fetchAuditReport=(filter:ReportFilter):Promise<ReportResult>=>report('audit',filter);
/** Downloads CSV/XLSX or opens the print-ready HTML report. */
export const exportReport=async(reportType:ReportType,format:Exclude<ReportFormat,'JSON'>,filter:ReportFilter):Promise<void>=>{
  const response=await api.get<Blob>(`${REPORTS_ENDPOINT}/export`,{params:{...filter,reportType,format},responseType:'blob'});
  let reportBlob=response.data;
  if(format==='PDF_PRINT'){
    const origin=window.location.origin;
    const html=(await response.data.text()).replaceAll('__REPORTS_URL__',`${origin}/reports`).replaceAll('src="/','src="'+origin+'/');
    reportBlob=new Blob([html],{type:'text/html;charset=utf-8'});
  }
  const url=URL.createObjectURL(reportBlob);
  if(format==='PDF_PRINT'){window.open(url,'_blank','noopener,noreferrer');setTimeout(()=>URL.revokeObjectURL(url),60000);return;}
  const disposition=response.headers['content-disposition'] as string|undefined;
  const filename=disposition?.match(/filename="([^"]+)"/)?.[1]??`${reportType.toLowerCase()}.${format.toLowerCase()}`;
  const link=document.createElement('a');link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url);
};

const SETTINGS_ENDPOINT = '/settings';
const BACKUPS_ENDPOINT = '/settings/backups';

/** Uploads custom organization logo. */
export const uploadLogo = async (file: File): Promise<{ success: boolean; logoUrl: string }> => {
  const formData = new FormData();
  formData.append('logo', file);
  const response = await api.post<{ success: boolean; logoUrl: string }>(
    `${SETTINGS_ENDPOINT}/branding/logo`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

/** Removes custom organization logo, reverting to default. */
export const deleteLogo = async (): Promise<{ success: boolean; logoUrl: string | null }> =>
  (await api.delete<{ success: boolean; logoUrl: string | null }>(`${SETTINGS_ENDPOINT}/branding/logo`)).data;

/** Fetches all system settings, grouped by category. */
export const fetchSettings = async (): Promise<SettingsResponse> =>
  (await api.get<SettingsResponse>(SETTINGS_ENDPOINT)).data;

/** Fetches settings for one category, including whether the caller may edit them. */
export const fetchSettingsCategory = async (category: string): Promise<SettingsResponse> =>
  (await api.get<SettingsResponse>(`${SETTINGS_ENDPOINT}/${category}`)).data;

/** Applies one or more setting changes atomically. */
export const updateSettings = async (input: BatchUpdateSettingsInput): Promise<SystemSetting[]> =>
  (await api.patch<SystemSetting[]>(SETTINGS_ENDPOINT, input)).data;

/** Updates a single system setting. */
export const updateSetting = async (
  category: string,
  key: string,
  input: UpdateSettingInput,
): Promise<SystemSetting> =>
  (await api.patch<SystemSetting>(`${SETTINGS_ENDPOINT}/${category}/${key}`, input)).data;

/** Fetches read-only system information (versions, DB size, uptime, etc.). */
export const fetchSystemInformation = async (): Promise<SystemInformation> =>
  (await api.get<SystemInformation>(`${SETTINGS_ENDPOINT}/system-info`)).data;

/** Fetches current database file/pragma status. */
export const fetchDatabaseStatus = async (): Promise<DatabaseStatus> =>
  (await api.get<DatabaseStatus>(`${SETTINGS_ENDPOINT}/database/status`)).data;

/** Runs a PRAGMA integrity_check against the database. */
export const runIntegrityCheck = async (): Promise<DatabaseMaintenanceResult> =>
  (await api.post<DatabaseMaintenanceResult>(`${SETTINGS_ENDPOINT}/database/integrity-check`)).data;

/** Runs PRAGMA optimize + VACUUM against the database. */
export const optimizeDatabase = async (): Promise<DatabaseMaintenanceResult> =>
  (await api.post<DatabaseMaintenanceResult>(`${SETTINGS_ENDPOINT}/database/optimize`)).data;

/** @deprecated Use optimizeDatabase. */
export const runOptimize = optimizeDatabase;

/** Truncates the WAL file via a checkpoint. */
export const runCheckpoint = async (): Promise<DatabaseMaintenanceResult> =>
  (await api.post<DatabaseMaintenanceResult>(`${SETTINGS_ENDPOINT}/database/checkpoint`)).data;

/** Lists all backup records, most recent first. */
export const fetchBackups = async (): Promise<BackupRecord[]> =>
  (await api.get<BackupRecord[]>(BACKUPS_ENDPOINT)).data;

/** Triggers a manual database backup. */
export const createBackup = async (): Promise<BackupRecord> =>
  (await api.post<BackupRecord>(BACKUPS_ENDPOINT)).data;

/** Returns the server/device directory used for newly created backups. */
export const fetchBackupStorage = async (): Promise<{ directory: string }> =>
  (await api.get<{ directory: string }>(`${BACKUPS_ENDPOINT}/storage/config`)).data;

/** Changes the server/device directory used for newly created backups. */
export const saveBackupStorage = async (directory: string): Promise<{ directory: string }> =>
  (await api.put<{ directory: string }>(`${BACKUPS_ENDPOINT}/storage/config`, { directory })).data;

/** Uploads and validates an existing SQLite backup before adding it to restore history. */
export const importBackup = async (file: File): Promise<BackupRecord> => {
  const body = new FormData();
  body.append('backup', file);
  return (await api.post<BackupRecord>(`${BACKUPS_ENDPOINT}/import`, body)).data;
};

/** Recalculates a backup checksum and reports whether it still matches. */
export const verifyBackup = async (id: number): Promise<{ valid: boolean; checksum: string | null }> =>
  (await api.post<{ valid: boolean; checksum: string | null }>(`${BACKUPS_ENDPOINT}/${id}/verify`)).data;

/** Downloads a completed backup file to the user's device. */
export const downloadBackup = async (id: number, filename: string): Promise<void> => {
  const response = await api.get<Blob>(`${BACKUPS_ENDPOINT}/${id}/download`, { responseType: 'blob' });
  if (String(response.headers['content-type'] ?? '').includes('json')) throw new Error('The server did not return a SQLite backup file.');
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

/** Restores the database from a backup. Requires the caller to type "RESTORE" to confirm. */
export const restoreBackup = async (id: number, input: RestoreBackupInput): Promise<RestoreBackupResult> =>
  (await api.post<RestoreBackupResult>(`${BACKUPS_ENDPOINT}/${id}/restore`, input)).data;

/** Permanently deletes a backup record and its file. */
export const deleteBackup = async (id: number): Promise<void> => {
  await api.post(`${BACKUPS_ENDPOINT}/${id}/archive`);
};

/** Creates a new asset category. */
export const createAssetCategory = async (
  input: CreateAssetCategoryInput,
): Promise<AssetCategory> => {
  const response = await api.post<AssetCategoryApiResponse>(ASSET_CATEGORIES_ENDPOINT, input);
  return mapAssetCategory(response.data);
};

/** Updates an asset category. */
export const updateAssetCategory = async (
  id: number,
  input: UpdateAssetCategoryInput,
): Promise<AssetCategory> => {
  const response = await api.patch<AssetCategoryApiResponse>(`${ASSET_CATEGORIES_ENDPOINT}/${id}`, input);
  return mapAssetCategory(response.data);
};

/** Deactivates an asset category (blocked if assets are still assigned to it). */
export const deactivateAssetCategory = async (id: number): Promise<void> => {
  await api.post(`${ASSET_CATEGORIES_ENDPOINT}/${id}/deactivate`);
};

/** Reactivates a previously deactivated asset category. */
export const activateAssetCategory = async (id: number): Promise<void> => {
  await api.post(`${ASSET_CATEGORIES_ENDPOINT}/${id}/activate`);
};
