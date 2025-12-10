
import { supabase } from '../lib/supabase';
import { Project, Contract, Category, User, Partner, ProjectStatusItem, Task, KPIMonthlyData } from '../types';

// Generic helper to fetch data
async function fetchAll<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*');
  if (error) {
    console.error(`Error fetching ${table}:`, error);
    return [];
  }
  return data as T[];
}

// Generic helper to upsert data
async function upsert<T extends { id: string }>(table: string, item: T): Promise<T | null> {
  const { data, error } = await supabase.from(table).upsert(item).select().single();
  if (error) {
    console.error(`Error upserting into ${table}:`, error);
    return null;
  }
  return data as T;
}

// Generic helper to delete data
async function remove(table: string, id: string): Promise<boolean> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) {
    console.error(`Error deleting from ${table}:`, error);
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
  }
};
