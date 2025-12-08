
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
  plannedRevenue: number;
  plannedCost: number;
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

export interface Contract {
  id: string;
  projectId: string;
  code: string;
  name: string;
  type: ContractType;
  categoryId: string; // Tham chiếu đến Category
  value: number;      // Giá trị HĐ (đã gồm VAT hoặc chưa tùy quy định, ở đây giả sử là Gross)
  signedDate: string;
  status: 'PENDING' | 'SIGNED' | 'COMPLETED' | 'CANCELLED';
  partnerName: string; // Tên đối tác ký HĐ (có thể khác đối tác dự án)
  
  // Fields for contract detail
  partyA: string;
  partyB: string;
  effectiveDate: string;
  guaranteeValue: number;
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
  assigneeId: string; // User ID
  status: TaskStatus;
  deadline: string;
  description?: string;
}
