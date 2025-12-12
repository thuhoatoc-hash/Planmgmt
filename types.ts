
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER', // General User (fallback)
  AM = 'AM',     // Nhân viên Kinh doanh
  PM = 'PM',     // Tư vấn Giải pháp
}

// --- NEW PERMISSION TYPES ---
export type ResourceType = 'PROJECTS' | 'CONTRACTS' | 'TASKS' | 'KPI' | 'EVALUATION' | 'EVENTS' | 'USERS' | 'CONFIG' | 'REPORTS';
export type ActionType = 'view' | 'edit' | 'delete';

export interface Permission {
    view: boolean;
    edit: boolean;
    delete: boolean;
}

export interface Role {
    id: string;
    name: string;
    description?: string;
    permissions: Record<string, Permission>; // Key is ResourceType
}

// --- NEW CUSTOM FIELD TYPES ---
export type FieldType = 'text' | 'number' | 'date' | 'select' | 'image';

export interface UserFieldDefinition {
    id: string;
    key: string; // e.g. "gender"
    label: string; // e.g. "Giới tính"
    type: FieldType;
    options?: string; // Comma separated for select
    required?: boolean;
    order?: number;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole; // Legacy role enum (kept for fallback)
  roleId?: string; // New Dynamic Role ID
  password?: string;
  phoneNumber?: string;
  email?: string;
  avatarUrl?: string;
  extendedInfo?: Record<string, any>; // Stores values for custom fields
}

export enum CategoryType {
  REVENUE = 'REVENUE', // Doanh thu
  COST = 'COST',       // Chi phí
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  parentId: string | null;
  code: string;
}

export interface ProjectStatusItem {
  id: string;
  name: string;
  color: string;
  order: number;
}

export enum PartnerType {
  CUSTOMER = 'CUSTOMER', // Khách hàng (Đầu ra)
  SUPPLIER = 'SUPPLIER'  // Đối tác/Nhà thầu (Đầu vào)
}

export interface Partner {
  id: string;
  name: string;
  code: string;
  contactInfo: string;
  type: PartnerType; 
}

export enum ProjectType {
  OUTRIGHT_SALE = 'OUTRIGHT_SALE', // Bán đứt
  SERVICE_LEASE = 'SERVICE_LEASE', // Thuê dịch vụ
}

export enum ProductType {
  HARDWARE = 'HARDWARE', // Phần cứng
  INTERNAL_SOFTWARE = 'INTERNAL_SOFTWARE', // Phần mềm nội bộ
  HYBRID = 'HYBRID', // Hỗn hợp
}

// --- Customer Obligation Types ---
export enum ObligationStatus {
  NO_SOURCE = 'NO_SOURCE',         // Chưa có nguồn
  SOURCE_RECEIVED = 'SOURCE_RECEIVED', // Nguồn đã về
  PAID = 'PAID',                   // Đã chi
  NOT_PAID = 'NOT_PAID',           // Không chi
}

export enum FundingSourceStatus {
  RECEIVED = 'RECEIVED', // Đã về
  PENDING = 'PENDING',   // Chưa về
}

export interface FundingSource {
  id: string;
  name: string; // Tên nguồn (VD: Từ đối tác A)
  value: number; // Số tiền
  status: FundingSourceStatus;
}

export interface CustomerObligation {
  percentage: number; // Tỷ lệ % / Doanh thu
  value: number;      // Giá trị tiền
  status: ObligationStatus; // Hiện trạng
  deadline?: string; // Thời gian thực hiện (YYYY-MM-DD)
  sources: FundingSource[]; // Danh sách nguồn tiền
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  statusId: string;
  startDate: string;
  endDate: string;
  plannedSales?: number;   // Doanh số ký dự kiến
  plannedRevenue: number;  // Doanh thu nghiệm thu dự kiến
  plannedCost: number;     // Chi phí dự kiến
  projectType: ProjectType;
  productType: ProductType;
  amId?: string;
  pmId?: string;
  partnerId?: string;
  customerObligation?: CustomerObligation; 
}

export enum ContractType {
  INPUT = 'INPUT',   // Đầu vào (Chi phí)
  OUTPUT = 'OUTPUT', // Đầu ra (Doanh thu)
}

// Trạng thái của từng lần nghiệm thu/thanh toán
export enum InstallmentStatus {
  PLANNING = 'PLANNING',     // Kế hoạch
  INVOICED = 'INVOICED',     // Đã xuất hóa đơn (hoặc Đã nhận hóa đơn đầu vào)
  PAID = 'PAID',             // Đã thanh toán (Tiền về hoặc Tiền đi)
}

export interface ContractInstallment {
  id: string;
  name: string;       // Tên đợt (VD: Nghiệm thu đợt 1, Tạm ứng 30%)
  value: number;      // Giá trị
  status: InstallmentStatus;
  date: string;       // Ngày dự kiến hoặc thực tế
  revenueMonth?: string; // UPDATE: Tháng ghi nhận doanh thu (YYYY-MM)
  note?: string;
}

export interface Contract {
  id: string;
  projectId: string;
  code: string;
  name: string;
  type: ContractType;
  categoryId: string; // Tham chiếu đến Category
  value: number;      // Giá trị HĐ (Tổng của installments nếu có)
  signedDate: string;
  status: 'PENDING' | 'SIGNED' | 'COMPLETED' | 'CANCELLED';
  partnerName: string; // Tên đối tác ký HĐ (có thể khác đối tác dự án)
  
  // Fields for contract detail
  partyA: string;
  partyB: string;
  effectiveDate: string;
  guaranteeValue: number;

  // Danh sách các lần nghiệm thu (doanh thu) hoặc các hạng mục chi phí (đầu vào)
  installments: ContractInstallment[];
}

export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED', // Chưa bắt đầu
  IN_PROGRESS = 'IN_PROGRESS', // Đang thực hiện
  COMPLETED = 'COMPLETED',     // Hoàn thành
  EXTENSION_REQUESTED = 'EXTENSION_REQUESTED', // Đề xuất gia hạn
  CANCELLED = 'CANCELLED'      // Hủy
}

export enum TaskType {
  PROJECT = 'PROJECT', // Nhiệm vụ thuộc dự án
  ADHOC = 'ADHOC',     // Giao việc / Sự vụ
}

export interface Task {
    id: string;
    projectId?: string; // Optional: only if type is PROJECT
    taskType: TaskType;
    name: string;
    description?: string; // Nội dung, mô tả
    outputStandard?: string; // Kết quả đầu ra
    assignerId: string; // Người giao
    assigneeId: string; // Người chủ trì
    collaboratorIds?: string[]; // Người phối
    status: TaskStatus;
    deadline: string;
}

export interface KPIGroup {
  id: string;
  name: string;
  unit: string;
  weight: number; // Tỷ trọng nhóm
  autoCalculate?: boolean; // Tự động cộng tổng từ items
  target?: number; // Mục tiêu nhóm (nếu không auto)
  actual?: number; // Thực hiện nhóm (nếu không auto)
  items: KPIItem[];
}

export interface KPIItem {
  id: string;
  name: string;
  unit: string;
  target: number;
  weight: number; // Tỷ trọng trong nhóm
  actual: number;
}

export interface KPIMonthlyData {
  id: string;
  month: string; // YYYY-MM
  groups: KPIGroup[];
}

export interface KICriterium {
    id: string;
    name: string;
    unit: string;
    weight: number;
    target: number;
    actual: number;
    score: number;
}

export interface EmployeeEvaluation {
    id: string;
    userId: string;
    month: string; // YYYY-MM
    role: string; // AM or PM
    criteria: KICriterium[];
    totalScore: number;
    grade: string; // A, B, C...
    note?: string;
}

export enum EventType {
  INTERNAL = 'INTERNAL', // Nội bộ
  CUSTOMER = 'CUSTOMER'  // Khách hàng
}

export interface BirthdayEvent {
    id: string;
    fullName: string;
    title: string;
    date: string; // YYYY-MM-DD
    phoneNumber?: string;
    type?: EventType;
}

export interface BannerConfig {
    images: string[];
    interval: number;
    enabled?: boolean;
}
