
import { supabase } from '../lib/supabase';
import { Project, Contract, Category, User, Partner, ProjectStatusItem, Task, KPIMonthlyData, EmployeeEvaluation, BirthdayEvent, Role, UserFieldDefinition, BannerConfig, Notification, ActivityLog, AttendanceRecord, AttendanceStatusConfig, AttendanceSystemConfig, SavedReport } from '../types';

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
async function upsert<T extends { id?: string }>(table: string, item: T): Promise<T | null> {
  const payload = { ...item };

  if (!payload.id) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          payload.id = crypto.randomUUID();
      } else {
          // Fallback for older browsers
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

// --- LOGGING HELPER ---
const getDeviceName = () => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'Android';
    if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
    if (/windows phone/i.test(ua)) return 'Windows Phone';
    if (/windows/i.test(ua)) return 'Windows PC';
    if (/macintosh|mac os/i.test(ua)) return 'MacOS';
    if (/linux/i.test(ua)) return 'Linux';
    return 'Unknown Device';
};

export const logActivity = async (user: User, action: string, target: string, details?: string) => {
    try {
        const log: ActivityLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            userId: user.id,
            userName: user.fullName,
            action,
            target,
            timestamp: new Date().toISOString(),
            device: getDeviceName(),
            details
        };
        await supabase.from('activity_logs').insert(log);
    } catch (e) {
        console.error('Failed to save log', e);
    }
};

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
  roles: {
      getAll: () => fetchAll<Role>('roles'),
      save: (r: Role) => upsert<Role>('roles', r),
      delete: (id: string) => remove('roles', id),
  },
  fieldDefinitions: {
      getAll: () => fetchAll<UserFieldDefinition>('user_field_definitions'),
      save: (f: UserFieldDefinition) => upsert<UserFieldDefinition>('user_field_definitions', f),
      delete: (id: string) => remove('user_field_definitions', id),
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
  },
  events: {
    getAll: () => fetchAll<BirthdayEvent>('birthday_events'),
    save: (e: BirthdayEvent) => upsert<BirthdayEvent>('birthday_events', e),
    delete: (id: string) => remove('birthday_events', id),
  },
  notifications: {
    getAll: () => fetchAll<Notification>('notifications'),
    save: (n: Notification) => upsert<Notification>('notifications', n),
    delete: (id: string) => remove('notifications', id),
  },
  attendance: {
      getAll: () => fetchAll<AttendanceRecord>('attendance_records'),
      save: (r: AttendanceRecord) => upsert<AttendanceRecord>('attendance_records', r),
      delete: (id: string) => remove('attendance_records', id),
  },
  attendanceStatuses: {
      getAll: () => fetchAll<AttendanceStatusConfig>('attendance_statuses'),
      save: (s: AttendanceStatusConfig) => upsert<AttendanceStatusConfig>('attendance_statuses', s),
      delete: (id: string) => remove('attendance_statuses', id),
  },
  savedReports: {
      // Map Snake_case (DB) <-> CamelCase (App) manually for this table due to mixed conventions
      getAll: async () => {
          const { data, error } = await supabase.from('saved_reports').select('*');
          if (error) {
              console.error("Error fetching saved_reports:", error);
              return [];
          }
          return data.map((r: any) => ({
              id: r.id,
              title: r.title,
              periodType: r.period_type,
              startDate: r.start_date,
              endDate: r.end_date,
              content: r.content,
              createdAt: r.createdAt || r.created_at, 
              updatedAt: r.updatedAt || r.updated_at
          })) as SavedReport[];
      },
      save: async (r: SavedReport) => {
          const payload = {
              id: r.id,
              title: r.title,
              period_type: r.periodType,
              start_date: r.startDate,
              end_date: r.endDate,
              content: r.content,
              "createdAt": r.createdAt, // Case-sensitive column added manually
              "updatedAt": r.updatedAt
          };
          
          const { data, error } = await supabase.from('saved_reports').upsert(payload).select().single();
          
          if (error) {
              console.error(`Error saving report:`, error);
              let msg = error.message;
              if (msg.includes('violates not-null constraint')) {
                  msg = `Dữ liệu thiếu trường bắt buộc: ${msg}`;
              }
              alert(`Lỗi lưu dữ liệu: ${msg}`);
              return null;
          }
          
          const res = data as any;
          return {
              id: res.id,
              title: res.title,
              periodType: res.period_type,
              startDate: res.start_date,
              endDate: res.end_date,
              content: res.content,
              createdAt: res.createdAt || res.created_at,
              updatedAt: res.updatedAt || res.updated_at
          } as SavedReport;
      },
      delete: (id: string) => remove('saved_reports', id),
  },
  logs: {
      getAll: () => fetchAll<ActivityLog>('activity_logs'),
  },
  settings: {
      getBannerConfig: async (): Promise<BannerConfig | null> => {
          const { data, error } = await supabase.from('system_settings').select('value').eq('id', 'BANNER_CONFIG').single();
          if (error || !data) return null;
          return data.value as BannerConfig;
      },
      saveBannerConfig: async (config: BannerConfig) => {
          const { error } = await supabase.from('system_settings').upsert({ id: 'BANNER_CONFIG', value: config });
          if (error) return false;
          return true;
      },
      getAttendanceConfig: async (): Promise<AttendanceSystemConfig | null> => {
          const { data, error } = await supabase.from('system_settings').select('value').eq('id', 'ATTENDANCE_CONFIG').single();
          if (error || !data) return null;
          return data.value as AttendanceSystemConfig;
      },
      saveAttendanceConfig: async (config: AttendanceSystemConfig) => {
          const { error } = await supabase.from('system_settings').upsert({ id: 'ATTENDANCE_CONFIG', value: config });
          if (error) return false;
          return true;
      }
  }
};
