

import { Category, CategoryType, Contract, ContractType, Project, Partner, ProjectStatusItem, User, UserRole, ProjectType, ProductType, Task, TaskStatus, InstallmentStatus, KPIMonthlyData, TaskType, PartnerType } from '../types';

export const MOCK_USERS: User[] = [
  { id: '1', username: 'admin', password: '123', fullName: 'Quản trị viên', role: UserRole.ADMIN, phoneNumber: '0901234567', avatarUrl: '' },
  { id: '2', username: 'user', password: '123', fullName: 'Nhân viên Kinh doanh', role: UserRole.USER, phoneNumber: '0909876543', avatarUrl: '' },
  { id: '3', username: 'am_hieu', password: '123', fullName: 'Nguyễn Văn Hiếu (AM)', role: UserRole.USER, phoneNumber: '0912345678', avatarUrl: '' },
  { id: '4', username: 'pm_tuan', password: '123', fullName: 'Trần Minh Tuấn (PM)', role: UserRole.USER, phoneNumber: '0987654321', avatarUrl: '' },
];

export const MOCK_PARTNERS: Partner[] = [
  { id: 'p1', name: 'Công ty Bất Động Sản Á Châu', code: 'ACHAU', contactInfo: '0243.555.888', type: PartnerType.CUSTOMER },
  { id: 'p2', name: 'Tập đoàn Xây dựng Delta', code: 'DELTA', contactInfo: 'contact@delta.com', type: PartnerType.CUSTOMER },
];

export const MOCK_STATUSES: ProjectStatusItem[] = [
  { id: 'st1', name: 'Đang xây dựng hồ sơ', color: 'bg-slate-100 text-slate-700', order: 1 },
  { id: 'st2', name: 'Đang đấu thầu', color: 'bg-blue-100 text-blue-700', order: 2 },
  { id: 'st3', name: 'Đang phê duyệt PAKD', color: 'bg-indigo-100 text-indigo-700', order: 3 },
  { id: 'st4', name: 'Đang ký Hợp đồng', color: 'bg-purple-100 text-purple-700', order: 4 },
  { id: 'st5', name: 'Đang triển khai', color: 'bg-amber-100 text-amber-700', order: 5 },
  { id: 'st6', name: 'Đang nghiệm thu xuất HĐ', color: 'bg-orange-100 text-orange-700', order: 6 },
  { id: 'st7', name: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700', order: 7 },
];

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat_r1', name: 'Doanh thu Bán hàng', type: CategoryType.REVENUE, parentId: null, code: 'DT-BH' },
  { id: 'cat_r1_1', name: 'Bán lẻ', type: CategoryType.REVENUE, parentId: 'cat_r1', code: 'DT-BH-BL' },
  { id: 'cat_r1_2', name: 'Bán buôn', type: CategoryType.REVENUE, parentId: 'cat_r1', code: 'DT-BH-BB' },
  { id: 'cat_r2', name: 'Doanh thu Dịch vụ', type: CategoryType.REVENUE, parentId: null, code: 'DT-DV' },
  { id: 'cat_c1', name: 'Chi phí Trực tiếp', type: CategoryType.COST, parentId: null, code: 'CP-TT' },
  { id: 'cat_c1_1', name: 'Nguyên vật liệu', type: CategoryType.COST, parentId: 'cat_c1', code: 'CP-NVL' },
  { id: 'cat_c1_2', name: 'Nhân công', type: CategoryType.COST, parentId: 'cat_c1', code: 'CP-NC' },
  { id: 'cat_c2', name: 'Chi phí Quản lý', type: CategoryType.COST, parentId: null, code: 'CP-QL' },
];

export const MOCK_PROJECTS: Project[] = [
  { 
    id: 'prj_1', name: 'Chung cư Blue Sky', code: 'BS-2024', 
    description: 'Dự án xây dựng khu chung cư cao cấp tại Quận 7', 
    statusId: 'st5', startDate: '2024-01-01', endDate: '2025-12-31', 
    plannedSales: 60000000000, plannedRevenue: 50000000000, plannedCost: 40000000000,
    projectType: ProjectType.OUTRIGHT_SALE, productType: ProductType.HYBRID,
    amId: '3', pmId: '4', partnerId: 'p1'
  },
  { 
    id: 'prj_2', name: 'Khu dân cư Green Valley', code: 'GV-2024', 
    description: 'Dự án đất nền phân lô', 
    statusId: 'st1', startDate: '2024-06-01', endDate: '2025-06-01', 
    plannedSales: 25000000000, plannedRevenue: 20000000000, plannedCost: 15000000000,
    projectType: ProjectType.SERVICE_LEASE, productType: ProductType.INTERNAL_SOFTWARE,
    amId: '3', pmId: '4', partnerId: 'p2'
  },
];

export const MOCK_CONTRACTS: Contract[] = [
  { 
    id: 'ctr_1', projectId: 'prj_1', code: 'HD-BAN-001', name: 'Hợp đồng bán căn hộ A1', 
    type: ContractType.OUTPUT, categoryId: 'cat_r1_1', value: 3000000000, signedDate: '2024-02-15', 
    status: 'SIGNED', partnerName: 'Nguyễn Văn A',
    partyA: 'Viettel Hà Nội', partyB: 'Nguyễn Văn A', effectiveDate: '2024-02-15', guaranteeValue: 0,
    installments: [
        { id: 'ins_1', name: 'Tạm ứng đợt 1', value: 1000000000, status: InstallmentStatus.PAID, date: '2024-02-15' },
        { id: 'ins_2', name: 'Thanh toán đợt 2', value: 1000000000, status: InstallmentStatus.INVOICED, date: '2024-06-15' },
        { id: 'ins_3', name: 'Nghiệm thu bàn giao', value: 1000000000, status: InstallmentStatus.PLANNING, date: '2024-12-15' },
    ]
  },
  { 
    id: 'ctr_2', projectId: 'prj_1', code: 'HD-MUA-001', name: 'Mua thép Hòa Phát', 
    type: ContractType.INPUT, categoryId: 'cat_c1_1', value: 500000000, signedDate: '2024-01-10', 
    status: 'COMPLETED', partnerName: 'Cty Thép HP',
    partyA: 'Cty Thép HP', partyB: 'Viettel Hà Nội', effectiveDate: '2024-01-10', guaranteeValue: 50000000,
    installments: []
  },
  { 
    id: 'ctr_3', projectId: 'prj_1', code: 'HD-NC-001', name: 'Nhân công xây dựng T1', 
    type: ContractType.INPUT, categoryId: 'cat_c1_2', value: 200000000, signedDate: '2024-01-20', 
    status: 'SIGNED', partnerName: 'Nhà thầu XYZ',
    partyA: 'Nhà thầu XYZ', partyB: 'Viettel Hà Nội', effectiveDate: '2024-01-20', guaranteeValue: 20000000,
    installments: []
  },
  { 
    id: 'ctr_4', projectId: 'prj_2', code: 'HD-TK-001', name: 'Thiết kế quy hoạch', 
    type: ContractType.INPUT, categoryId: 'cat_c2', value: 150000000, signedDate: '2024-05-01', 
    status: 'PENDING', partnerName: 'Cty Kiến Trúc Á Đông',
    partyA: 'Cty Kiến Trúc Á Đông', partyB: 'Viettel Hà Nội', effectiveDate: '2024-05-01', guaranteeValue: 0,
    installments: []
  },
];

export const MOCK_TASKS: Task[] = [
    { id: 't1', projectId: 'prj_1', taskType: TaskType.PROJECT, name: 'Khảo sát hiện trường đợt 1', assigneeId: '4', assignerId: '1', status: TaskStatus.COMPLETED, deadline: '2024-01-15' },
    { id: 't2', projectId: 'prj_1', taskType: TaskType.PROJECT, name: 'Lên phương án thiết kế sơ bộ', assigneeId: '4', assignerId: '1', status: TaskStatus.IN_PROGRESS, deadline: '2024-02-28' },
    { id: 't3', projectId: 'prj_2', taskType: TaskType.PROJECT, name: 'Gặp gỡ chủ đầu tư', assigneeId: '3', assignerId: '1', status: TaskStatus.IN_PROGRESS, deadline: '2024-05-10' },
];

export const MOCK_KPI: KPIMonthlyData[] = [
  {
    id: 'kpi_2025_12',
    month: '2025-12',
    groups: [
      {
        id: 'g1',
        name: 'DOANH THU DỊCH VỤ',
        autoCalculate: true, // Auto sum children
        weight: 10,
        unit: 'Tr.đồng',
        items: [
          { id: 'k1_1', name: 'DT GPCNTT đại trà (Giáo dục+ y tế+ Bulk SMS)', unit: 'Tr.đồng', target: 6228, weight: 0, actual: 200 },
          { id: 'k1_2', name: 'DTDV Dự án GPCNTT', unit: 'Tr.đồng', target: 1133, weight: 0, actual: 233 },
          { id: 'k1_3', name: 'DT Kênh truyền', unit: 'Tr.đồng', target: 1708, weight: 0, actual: 480 },
        ]
      },
      {
        id: 'g2',
        name: 'TỔNG DOANH THU (= DTDV + DT THIẾT BỊ)',
        autoCalculate: true, // Auto sum children
        weight: 15,
        unit: 'Tr.đồng',
        items: [
          { id: 'k2_1', name: 'Doanh thu bán hàng Chính quyền', unit: 'Tr.đồng', target: 15302, weight: 10, actual: 233 },
          { id: 'k2_2', name: 'Doanh thu BulkSMS', unit: 'Tr.đồng', target: 1728, weight: 0, actual: 180 },
          { id: 'k2_3', name: 'Doanh thu bán hàng kênh truyền', unit: 'Tr.đồng', target: 1722, weight: 5, actual: 480 },
          { id: 'k2_4', name: 'Doanh thu bán hàng Y tế- Giáo dục', unit: 'Tr.đồng', target: 5663, weight: 10, actual: 20 },
        ]
      },
      {
        id: 'g3',
        name: 'CHƯƠNG TRÌNH HÀNH ĐỘNG',
        autoCalculate: false,
        weight: 0, // Header doesn't have weight, children do
        unit: '',
        items: [
          { id: 'k3_1', name: 'Hiệu quả dự án', unit: 'DA', target: 3, weight: 5, actual: 3 },
          { id: 'k3_2', name: 'Thu cước (kênh truyền)', unit: 'Tr.đồng', target: 98, weight: 5, actual: 65 },
          { id: 'k3_3', name: 'Phát triển doanh số bán mới (kênh truyền)', unit: 'Tr.đồng', target: 300, weight: 3, actual: 400 },
          { id: 'k3_4', name: 'Thâm nhập DN mới (Kênh truyền)', unit: 'DN', target: 10, weight: 2, actual: 1 },
          { id: 'k3_5', name: 'CTHĐ Lĩnh vực Giáo Dục', unit: 'DT', target: 2300, weight: 5, actual: 1300 },
          { id: 'k3_6', name: 'CTHĐ Lĩnh vực Y tế', unit: 'Tr.đồng', target: 1000, weight: 5, actual: 4200 },
          { id: 'k3_7', name: 'Thu hồi công nợ', unit: 'Tr.đồng', target: 98, weight: 5, actual: 8 },
          { id: 'k3_8', name: 'CTHĐ lĩnh vực chính quyền', unit: 'DS', target: 18000, weight: 20, actual: 27900 },
          { id: 'k3_9', name: 'CTHĐ lĩnh vực KHDN', unit: 'Tr.đồng', target: 0, weight: 0, actual: 0 },
        ]
      }
    ]
  }
];
