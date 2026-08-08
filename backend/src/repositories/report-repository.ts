import type Database from 'better-sqlite3';
import type { ReportFilter, ReportRow, ReportSummary, ReportType } from 'shared';
import { getCurrentDb } from '../database/connection';

type DbValue = string | number | null;
type DbRow = Record<string, DbValue>;
type Query = { sql: string; params: Record<string, DbValue> };

export interface IReportRepository {
  summary(): Promise<ReportSummary>;
  run(type: ReportType, filter: ReportFilter): Promise<{ rows: ReportRow[]; total: number }>;
}

const activeAssignment = `LEFT JOIN asset_assignments aa ON aa.asset_id=a.id
  AND aa.status='ACTIVE' AND aa.archived_at IS NULL
  LEFT JOIN people p ON p.id=aa.person_id
  LEFT JOIN departments d ON d.id=COALESCE(aa.department_id,p.department_id)
  LEFT JOIN locations l ON l.id=aa.location_id`;

const sortColumns: Record<ReportType, Record<string, string>> = {
  ASSET_REGISTER: { assetTag: 'assetTag', category: 'category', status: 'status', updatedDate: 'updatedDate' },
  ASSIGNED_ASSETS: { assetTag: 'assetTag', category: 'category', status: 'status', updatedDate: 'updatedDate' },
  UNASSIGNED_ASSETS: { assetTag: 'assetTag', category: 'category', status: 'status', updatedDate: 'updatedDate' },
  ASSETS_BY_STATUS: { status: 'status', totalAssets: 'totalAssets' },
  ASSETS_BY_CATEGORY: { category: 'category', totalAssets: 'totalAssets' },
  ASSETS_BY_DEPARTMENT: { department: 'department', totalAssignedAssets: 'totalAssignedAssets' },
  DEPARTMENT_INVENTORY: { department: 'department', totalAssignedAssets: 'totalAssignedAssets' },
  ASSETS_BY_LOCATION: { location: 'location', deployedAssets: 'deployedAssets' },
  LOCATION_INVENTORY: { location: 'location', deployedAssets: 'deployedAssets' },
  PERSON_ASSET_HOLDINGS: { staffId: 'staffId', person: 'person', activeAssignedAssets: 'activeAssignedAssets' },
  ASSIGNMENT_HISTORY: { assignedDate: 'assignedDate', asset: 'asset', status: 'status' },
  OVERDUE_RETURNS: { assignedDate: 'assignedDate', expectedReturn: 'expectedReturn', asset: 'asset' },
  MAINTENANCE_SUMMARY: { reportedDate: 'reportedDate', maintenanceNumber: 'maintenanceNumber', status: 'status', cost: 'cost' },
  MAINTENANCE_COST: { month: 'month', type: 'type', cost: 'cost' },
  REPAIR_SUMMARY: { reportedDate: 'reportedDate', repairNumber: 'repairNumber', status: 'status', finalCost: 'finalCost' },
  REPAIR_COST: { month: 'month', vendor: 'vendor', cost: 'cost' },
  WARRANTY_EXPIRY: { warrantyExpiry: 'warrantyExpiry', assetTag: 'assetTag' },
  AUDIT_ACTIVITY: { performedAt: 'performedAt', entityType: 'entityType', action: 'action' },
};

const defaultSort: Record<ReportType, string> = {
  ASSET_REGISTER: 'assetTag', ASSIGNED_ASSETS: 'assetTag', UNASSIGNED_ASSETS: 'assetTag',
  ASSETS_BY_STATUS: 'status', ASSETS_BY_CATEGORY: 'category', ASSETS_BY_DEPARTMENT: 'department',
  DEPARTMENT_INVENTORY: 'department', ASSETS_BY_LOCATION: 'location', LOCATION_INVENTORY: 'location',
  PERSON_ASSET_HOLDINGS: 'person', ASSIGNMENT_HISTORY: 'assignedDate', OVERDUE_RETURNS: 'expectedReturn',
  MAINTENANCE_SUMMARY: 'reportedDate', MAINTENANCE_COST: 'month', REPAIR_SUMMARY: 'reportedDate',
  REPAIR_COST: 'month', WARRANTY_EXPIRY: 'warrantyExpiry', AUDIT_ACTIVITY: 'performedAt',
};

const descendingByDefault = new Set<ReportType>([
  'ASSIGNMENT_HISTORY', 'OVERDUE_RETURNS', 'MAINTENANCE_SUMMARY', 'MAINTENANCE_COST',
  'REPAIR_SUMMARY', 'REPAIR_COST', 'AUDIT_ACTIVITY',
]);

const numericKeys = new Set([
  'totalAssets', 'assigned', 'available', 'underRepair', 'retired', 'totalAssignedAssets',
  'activePeople', 'openAssignments', 'openMaintenance', 'repairCost', 'deployedAssets',
  'networkEquipment', 'projectors', 'otherEquipment', 'activeAssignedAssets', 'overdueCount',
  'records', 'cost', 'downtime', 'finalCost',
]);

/** Database-backed report queries with safe sorting, paging, and null-safe mapping. */
export class ReportRepository implements IReportRepository {
  constructor(private readonly db: Database.Database = getCurrentDb()) {}

  async summary(): Promise<ReportSummary> {
    return this.db.prepare(`SELECT
      (SELECT COUNT(*) FROM assets WHERE archived_at IS NULL) totalAssets,
      (SELECT COUNT(*) FROM assets WHERE archived_at IS NULL AND status IN ('ASSIGNED','DEPLOYED')) assignedAssets,
      (SELECT COUNT(*) FROM assets WHERE archived_at IS NULL AND status='IN_STOCK') availableAssets,
      (SELECT COUNT(*) FROM assets WHERE archived_at IS NULL AND status='UNDER_REPAIR') assetsUnderRepair,
      (SELECT COUNT(*) FROM assets WHERE archived_at IS NULL AND status='RETIRED') retiredAssets,
      (SELECT COUNT(*) FROM departments WHERE archived_at IS NULL) totalDepartments,
      (SELECT COUNT(*) FROM people WHERE archived_at IS NULL AND is_active=1) totalActivePeople,
      (SELECT COUNT(*) FROM locations WHERE archived_at IS NULL AND is_active=1) totalActiveLocations,
      (SELECT COUNT(*) FROM asset_assignments WHERE archived_at IS NULL AND status='ACTIVE') activeAssignments,
      (SELECT COUNT(*) FROM asset_assignments WHERE archived_at IS NULL AND status='ACTIVE' AND expected_return_date<date('now')) overdueAssignments,
      (SELECT COUNT(*) FROM maintenance_records WHERE archived_at IS NULL AND status NOT IN ('COMPLETED','CANCELLED','BEYOND_REPAIR')) openMaintenance,
      (SELECT COUNT(*) FROM repair_jobs WHERE archived_at IS NULL AND status NOT IN ('RETURNED','CANCELLED','BEYOND_REPAIR')) openRepairs,
      (SELECT COUNT(*) FROM assets WHERE archived_at IS NULL AND warranty_expiry_date BETWEEN date('now') AND date('now','+30 days')) warrantyExpiring30Days,
      (SELECT COALESCE(SUM(maintenance_cost),0) FROM maintenance_records WHERE archived_at IS NULL AND substr(completed_date,1,7)=strftime('%Y-%m','now')) maintenanceCostThisMonth,
      (SELECT COALESCE(SUM(final_cost),0) FROM repair_jobs WHERE archived_at IS NULL AND substr(completed_date,1,7)=strftime('%Y-%m','now')) repairCostThisMonth,
      (SELECT COUNT(*) FROM audit_logs WHERE date(performed_at)=date('now')) auditEventsToday`).get() as ReportSummary;
  }

  async run(type: ReportType, filter: ReportFilter) {
    const query = this.build(type, filter);
    const count = this.db.prepare(`SELECT COUNT(*) total FROM (${query.sql}) report`).get(query.params) as { total: number };
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const requestedSort = filter.sortBy ?? defaultSort[type];
    const sort = sortColumns[type][requestedSort] ?? sortColumns[type][defaultSort[type]];
    const direction = filter.sortOrder
      ? filter.sortOrder.toUpperCase()
      : descendingByDefault.has(type) ? 'DESC' : 'ASC';
    const rows = this.db.prepare(
      `SELECT * FROM (${query.sql}) report ORDER BY "${sort}" ${direction} LIMIT @limit OFFSET @offset`,
    ).all({ ...query.params, limit: pageSize, offset: (page - 1) * pageSize }) as DbRow[];
    return { rows: rows.map((row) => this.mapRow(row)) as ReportRow[], total: count.total };
  }

  private mapRow(row: DbRow): Record<string, string | number | boolean | null> {
    return Object.fromEntries(Object.entries(row).map(([key, value]) => {
      if (key === 'success') return [key, value === 1];
      if (numericKeys.has(key)) return [key, Number(value ?? 0)];
      return [key, value];
    }));
  }

  private build(type: ReportType, filter: ReportFilter): Query {
    const params: Record<string, DbValue> = {};
    const dates = (column: string) => {
      const conditions: string[] = [];
      if (filter.dateFrom) { params.dateFrom = filter.dateFrom; conditions.push(`${column} >= @dateFrom`); }
      if (filter.dateTo) { params.dateTo = filter.dateTo; conditions.push(`${column} <= @dateTo`); }
      return conditions;
    };
    const search = (columns: string[]) => {
      if (!filter.search) return [];
      params.search = `%${filter.search}%`;
      return [`(${columns.map((column) => `${column} LIKE @search`).join(' OR ')})`];
    };
    const where = (conditions: string[]) => conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

    if (['ASSET_REGISTER', 'ASSIGNED_ASSETS', 'UNASSIGNED_ASSETS'].includes(type)) {
      const conditions = ['a.archived_at IS NULL', ...search(['a.asset_tag','a.manufacturer','a.model','a.serial_number'])];
      if (type === 'ASSIGNED_ASSETS') conditions.push("a.status IN ('ASSIGNED','DEPLOYED')");
      if (type === 'UNASSIGNED_ASSETS') conditions.push("a.status = 'IN_STOCK'");
      if (filter.categoryId) { params.categoryId = filter.categoryId; conditions.push('a.category_id = @categoryId'); }
      if (filter.departmentId) { params.departmentId = filter.departmentId; conditions.push('d.id = @departmentId'); }
      if (filter.locationId) { params.locationId = filter.locationId; conditions.push('l.id = @locationId'); }
      if (filter.assetStatus) { params.assetStatus = filter.assetStatus; conditions.push('a.status = @assetStatus'); }
      return { params, sql: `SELECT a.asset_tag assetTag,c.name category,a.manufacturer,a.model,a.serial_number serialNumber,a.status,a.condition,d.name department,COALESCE(p.first_name||' '||p.last_name,d.name,l.name) currentHolder,COALESCE(l.name,a.current_location) currentLocation,a.purchase_date purchaseDate,a.purchase_cost purchaseCost,a.warranty_expiry_date warrantyExpiry,a.updated_at updatedDate FROM assets a JOIN asset_categories c ON c.id=a.category_id ${activeAssignment}${where(conditions)}` };
    }
    if (type === 'ASSETS_BY_STATUS') { const conditions=['archived_at IS NULL']; if(filter.assetStatus){params.assetStatus=filter.assetStatus;conditions.push('status=@assetStatus');} return { params, sql: `SELECT status,COUNT(*) totalAssets FROM assets${where(conditions)} GROUP BY status` }; }
    if (type === 'ASSETS_BY_CATEGORY') return { params, sql: "SELECT c.name category,COUNT(a.id) totalAssets,COALESCE(SUM(a.status IN('ASSIGNED','DEPLOYED')),0) assigned,COALESCE(SUM(a.status='IN_STOCK'),0) available,COALESCE(SUM(a.status='UNDER_REPAIR'),0) underRepair,COALESCE(SUM(a.status='RETIRED'),0) retired FROM asset_categories c LEFT JOIN assets a ON a.category_id=c.id AND a.archived_at IS NULL GROUP BY c.id,c.name" };
    if (['ASSETS_BY_DEPARTMENT','DEPARTMENT_INVENTORY'].includes(type)) return { params, sql: "SELECT d.name department,COUNT(DISTINCT aa.asset_id) totalAssignedAssets,COUNT(DISTINCT p.id) activePeople,COUNT(DISTINCT aa.id) openAssignments,(SELECT COUNT(*) FROM maintenance_records m JOIN asset_assignments maa ON maa.asset_id=m.asset_id AND maa.status='ACTIVE' LEFT JOIN people mp ON mp.id=maa.person_id WHERE COALESCE(maa.department_id,mp.department_id)=d.id AND m.archived_at IS NULL AND m.status NOT IN('COMPLETED','CANCELLED','BEYOND_REPAIR')) openMaintenance,COALESCE((SELECT SUM(r.final_cost) FROM repair_jobs r JOIN asset_assignments raa ON raa.asset_id=r.asset_id AND raa.status='ACTIVE' LEFT JOIN people rp ON rp.id=raa.person_id WHERE COALESCE(raa.department_id,rp.department_id)=d.id AND r.archived_at IS NULL),0) repairCost FROM departments d LEFT JOIN people p ON p.department_id=d.id AND p.is_active=1 AND p.archived_at IS NULL LEFT JOIN asset_assignments aa ON (aa.department_id=d.id OR aa.person_id=p.id) AND aa.status='ACTIVE' AND aa.archived_at IS NULL WHERE d.archived_at IS NULL GROUP BY d.id,d.name" };
    if (['ASSETS_BY_LOCATION','LOCATION_INVENTORY'].includes(type)) return { params, sql: "SELECT l.name location,l.building,COUNT(DISTINCT aa.asset_id) deployedAssets,COALESCE(SUM(c.name IN('Network Switch','Router','Access Point')),0) networkEquipment,COALESCE(SUM(c.name='Projector'),0) projectors,COALESCE(SUM(c.name NOT IN('Network Switch','Router','Access Point','Projector')),0) otherEquipment FROM locations l LEFT JOIN asset_assignments aa ON aa.location_id=l.id AND aa.status='ACTIVE' AND aa.archived_at IS NULL LEFT JOIN assets a ON a.id=aa.asset_id LEFT JOIN asset_categories c ON c.id=a.category_id WHERE l.archived_at IS NULL GROUP BY l.id,l.name,l.building" };
    if (type === 'PERSON_ASSET_HOLDINGS') { const conditions=['p.archived_at IS NULL']; if(filter.personId){params.personId=filter.personId;conditions.push('p.id=@personId');} return { params, sql: `SELECT p.staff_id staffId,p.first_name||' '||p.last_name person,d.name department,COUNT(aa.id) activeAssignedAssets,GROUP_CONCAT(aa.assigned_date) assignmentDates,GROUP_CONCAT(aa.expected_return_date) expectedReturns,COALESCE(SUM(aa.expected_return_date<date('now')),0) overdueCount FROM people p LEFT JOIN departments d ON d.id=p.department_id LEFT JOIN asset_assignments aa ON aa.person_id=p.id AND aa.status='ACTIVE' AND aa.archived_at IS NULL${where(conditions)} GROUP BY p.id` }; }
    if (['ASSIGNMENT_HISTORY','OVERDUE_RETURNS'].includes(type)) { const conditions=['aa.archived_at IS NULL',...dates('aa.assigned_date')]; if(type==='OVERDUE_RETURNS')conditions.push("aa.status='ACTIVE'", "aa.expected_return_date<date('now')"); if(filter.assignmentStatus){params.assignmentStatus=filter.assignmentStatus;conditions.push('aa.status=@assignmentStatus');} if(filter.personId){params.personId=filter.personId;conditions.push('aa.person_id=@personId');} return { params, sql: `SELECT a.asset_tag||' - '||a.manufacturer||' '||a.model asset,aa.assignment_type assignmentType,COALESCE(p.first_name||' '||p.last_name,d.name,l.name) assignedTo,aa.assigned_date assignedDate,aa.expected_return_date expectedReturn,aa.returned_date returnedDate,aa.status FROM asset_assignments aa JOIN assets a ON a.id=aa.asset_id LEFT JOIN people p ON p.id=aa.person_id LEFT JOIN departments d ON d.id=aa.department_id LEFT JOIN locations l ON l.id=aa.location_id${where(conditions)}` }; }
    if (type === 'MAINTENANCE_SUMMARY') { const conditions=['m.archived_at IS NULL',...dates('m.reported_date')]; if(filter.maintenanceStatus){params.maintenanceStatus=filter.maintenanceStatus;conditions.push('m.status=@maintenanceStatus');} return { params, sql: `SELECT m.maintenance_number maintenanceNumber,a.asset_tag asset,m.maintenance_type type,m.priority,m.status,m.reported_date reportedDate,m.assigned_technician technician,m.maintenance_cost cost,m.downtime_hours downtime,m.resolution outcome FROM maintenance_records m JOIN assets a ON a.id=m.asset_id${where(conditions)}` }; }
    if (type === 'MAINTENANCE_COST') return { params, sql: `SELECT substr(completed_date,1,7) month,maintenance_type type,COUNT(*) records,COALESCE(SUM(maintenance_cost),0) cost FROM maintenance_records${where(['archived_at IS NULL','completed_date IS NOT NULL',...dates('completed_date')])} GROUP BY month,maintenance_type` };
    if (type === 'REPAIR_SUMMARY') { const conditions=['r.archived_at IS NULL',...dates('r.reported_date')]; if(filter.repairStatus){params.repairStatus=filter.repairStatus;conditions.push('r.status=@repairStatus');} return { params, sql: `SELECT r.repair_number repairNumber,a.asset_tag asset,r.repair_type type,r.vendor_name vendor,r.status,r.approval_status approvalStatus,r.outcome,r.final_cost finalCost,r.reported_date reportedDate FROM repair_jobs r JOIN assets a ON a.id=r.asset_id${where(conditions)}` }; }
    if (type === 'REPAIR_COST') return { params, sql: `SELECT substr(completed_date,1,7) month,COALESCE(vendor_name,'Internal') vendor,COUNT(*) records,COALESCE(SUM(final_cost),0) cost FROM repair_jobs${where(['archived_at IS NULL','completed_date IS NOT NULL',...dates('completed_date')])} GROUP BY month,vendor` };
    if (type === 'WARRANTY_EXPIRY') { params.days=filter.warrantyDays??30; return { params, sql: "SELECT asset_tag assetTag,manufacturer,model,warranty_expiry_date warrantyExpiry,CASE WHEN warranty_expiry_date<date('now') THEN 'EXPIRED' ELSE 'EXPIRING' END warrantyStatus FROM assets WHERE archived_at IS NULL AND warranty_expiry_date IS NOT NULL AND warranty_expiry_date<=date('now','+'||@days||' days')" }; }
    if (type === 'AUDIT_ACTIVITY') return { params, sql: `SELECT performed_at performedAt,entity_type entityType,entity_id entityId,action,performed_by_name performedBy,summary,success FROM audit_logs${where([...dates('date(performed_at)')])}` };
    throw new Error('Unsupported report type');
  }
}

/** Creates a report repository using the supplied or active database. */
export const createReportRepository = (db?: Database.Database): IReportRepository => new ReportRepository(db);
