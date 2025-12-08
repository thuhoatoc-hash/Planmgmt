export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  password?: string; // For mock login/update
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

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  statusId: string; // Link to ProjectStatusItem
  startDate: string;
  endDate: string;
  budget: number;
  amId?: string; // Account Manager (User ID)
  pmId?: string; // Project Manager (User ID)
  partnerId?: string; // Partner ID
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
  categoryId: string; // Link to specific Revenue/Cost category
  value: number;
  signedDate: string;
  status: 'PENDING' | 'SIGNED' | 'COMPLETED' | 'CANCELLED';
  partnerName: string;
}

// Helper interface for Dashboard
export interface FinancialSummary {
  totalRevenue: number;
  totalCost: number;
  profit: number;
  roi: number;
}