
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
// Modified to handle ID generation logic
async function upsert<T extends { id?: string }>(table: string, item: T): Promise<T | null> {
  const payload = { ...item };

  // CRITICAL FIX: If ID is present but looks like a temp ID (e.g. 'task_123') or empty, 
  // remove it so Supabase/Postgres generates a real UUID.
  if (payload.id && !isValidUUID(payload.id)) {
      delete payload.id;
  }
  if (payload.id === '') {
      delete payload.id;
  }

  const { data, error } = await supabase.from(table).upsert(payload).select().single();
  
  if (error) {
    console.error(`Error upserting into ${table}:`, JSON.stringify(error, null, 2));
    // Optional: Throw error to let UI know
    alert(`Lỗi lưu dữ liệu (${table}): ${error.message}`);
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
