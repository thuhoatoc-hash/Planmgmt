
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  password?: string;
  phoneNumber?: string;
  avatarUrl?: string;
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

export interface Partner {
  id: string;
  name: string;
  code: string;
  contactInfo: string;
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
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  LATE = 'LATE'
}

export interface Task {
    id: string;
    projectId: string;
    name: string;
    assigneeId: string;
    status: TaskStatus;
    deadline: string;
}

// --- KPI Types ---

export interface KPIItem {
  id: string;
  name: string;
  unit: string; // Đơn vị tính (Tr.đồng, %, DA...)
  target: number; // Mục tiêu
  weight: number; // Tỷ trọng (%)
  actual: number; // Kết quả thực hiện
}

export interface KPIGroup {
  id: string;
  name: string;
  unit?: string;
  target?: number; // Optional: for groups that act as summary rows
  weight?: number; // Optional: for groups that have a weight
  actual?: number; // Optional: calculated actual for group
  autoCalculate?: boolean; // If true, target/actual is sum of children
  items: KPIItem[];
}

export interface KPIMonthlyData {
  id: string;
  month: string; // YYYY-MM
  groups: KPIGroup[];
}
