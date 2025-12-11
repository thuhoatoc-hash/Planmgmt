
import { supabase } from '../lib/supabase';
import { Project, Contract, Category, User, Partner, ProjectStatusItem, Task, KPIMonthlyData, EmployeeEvaluation } from '../types';

// Helper: Check if string is valid UUID
function isValidUUID(uuid: string) {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

// Generic helper to fetch data
async function fetchAll<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*');
  if (error) {
    console.error(`Error fetching ${table}:`, JSON.stringify(error, null, 2));
    return [];
  }
  return data as T[];
}

// Generic helper to upsert data
// Modified to handle ID generation logic ROBUSTLY
async function upsert<T extends { id?: string }>(table: string, item: T): Promise<T | null> {
  const payload = { ...item };

  // FIX FOR "null value in column id" ERROR:
  // If the ID is missing, empty, or a temp ID (like 'user_123'), we must ensure
  // a valid UUID is sent to the DB if the DB doesn't have a DEFAULT value set up.
  // We generate a UUID v4 client-side to be safe.
  if (!payload.id || !isValidUUID(payload.id)) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          payload.id = crypto.randomUUID();
      } else {
          // Fallback for older browsers (unlikely with Vite/modern React but safe to have)
          // Simple UUID v4 generator
          payload.id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
      }
  }

  const { data, error } = await supabase.from(table).upsert(payload).select().single();
  
  if (error) {
    console.error(`Error upserting into ${table}:`, JSON.stringify(error, null, 2));
    
    // Provide a more friendly error message based on common issues
    let msg = error.message;
    let title = `Lỗi lưu dữ liệu (${table})`;

    if (msg.includes('Could not find the') && msg.includes('column')) {
        const missingColumn = msg.match(/'([^']+)' column/)?.[1] || 'không xác định';
        title = "LỖI CẤU TRÚC DATABASE";
        msg = `Bảng '${table}' trên Supabase đang thiếu cột '${missingColumn}'.\n\nVui lòng vào Supabase > SQL Editor và chạy lệnh:\nALTER TABLE ${table} ADD COLUMN "${missingColumn}" text; (hoặc jsonb/int tùy loại dữ liệu)`;
    } else if (msg.includes('violates not-null constraint')) {
        title = "LỖI DỮ LIỆU BẮT BUỘC";
        msg = `Dữ liệu gửi lên thiếu trường bắt buộc. Chi tiết: ${error.message}`;
    }

    alert(`${title}:\n${msg}`);
    return null;
  }
  return data as T;
}

// Generic helper to delete data
async function remove(table: string, id: string): Promise<boolean> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) {
    console.error(`Error deleting from ${table}:`, JSON.stringify(error, null, 2));
    alert(`Lỗi xóa dữ liệu: ${error.message}`);
    return false;
  }
  return true;
}

export const api = {
  projects: {
    getAll: () => fetchAll<Project>('projects'),
    save: (p: Project) => upsert<Project>('projects', p),
    delete: (id: string) => remove('projects', id),
  },
  contracts: {
    getAll: () => fetchAll<Contract>('contracts'),
    save: (c: Contract) => upsert<Contract>('contracts', c),
    delete: (id: string) => remove('contracts', id),
  },
  categories: {
    getAll: () => fetchAll<Category>('categories'),
    save: (c: Category) => upsert<Category>('categories', c),
    delete: (id: string) => remove('categories', id),
  },
  users: {
    getAll: () => fetchAll<User>('users'),
    save: (u: User) => upsert<User>('users', u),
    delete: (id: string) => remove('users', id),
    // Simple login check (In production, use supabase.auth)
    login: async (username: string) => {
        const { data, error } = await supabase.from('users').select('*').eq('username', username).single();
        if (error) return null;
        return data as User;
    }
  },
  partners: {
    getAll: () => fetchAll<Partner>('partners'),
    save: (p: Partner) => upsert<Partner>('partners', p),
    delete: (id: string) => remove('partners', id),
  },
  statuses: {
    getAll: () => fetchAll<ProjectStatusItem>('project_statuses'),
    save: (s: ProjectStatusItem) => upsert<ProjectStatusItem>('project_statuses', s),
    delete: (id: string) => remove('project_statuses', id),
  },
  tasks: {
    getAll: () => fetchAll<Task>('tasks'),
    save: (t: Task) => upsert<Task>('tasks', t),
    delete: (id: string) => remove('tasks', id),
  },
  kpi: {
    getAll: () => fetchAll<KPIMonthlyData>('kpi_data'),
    save: (k: KPIMonthlyData) => upsert<KPIMonthlyData>('kpi_data', k),
    delete: (id: string) => remove('kpi_data', id),
  },
  evaluations: {
    getAll: () => fetchAll<EmployeeEvaluation>('employee_evaluations'),
    save: (e: EmployeeEvaluation) => upsert<EmployeeEvaluation>('employee_evaluations', e),
    delete: (id: string) => remove('employee_evaluations', id),
  }
};
