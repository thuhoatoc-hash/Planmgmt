
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import ProjectDetail from './components/ProjectDetail';
import ConfigurationManager from './components/ConfigurationManager';
import UserProfile from './components/UserProfile';
import Reports from './components/Reports';
import KPIManagement from './components/KPIManagement';
import EmployeeEvaluationManager from './components/EmployeeEvaluation';
import TaskManagement from './components/TaskManagement';
import EventManager from './components/EventManager';
import NotificationManager from './components/NotificationManager';
import AttendanceManager from './components/AttendanceManager';
import { User, Project, Contract, Category, Partner, ProjectStatusItem, Task, KPIMonthlyData, EmployeeEvaluation, TaskStatus, BirthdayEvent, Role, UserRole, ResourceType, Notification, AttendanceRecord, AttendanceStatusConfig } from './types';
import { api } from './services/api';
import { Loader2 } from 'lucide-react';

const SHORT_SESSION = 60 * 60 * 1000; // 60 minutes
const LONG_SESSION = 7 * 24 * 60 * 60 * 1000; // 7 days

const App: React.FC = () => {
  // Global State with Persistence for Session
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      const loginTime = localStorage.getItem('loginTime');
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      
      if (savedUser && loginTime) {
        const now = Date.now();
        const duration = rememberMe ? LONG_SESSION : SHORT_SESSION;
        
        if (now - parseInt(loginTime) < duration) {
          return JSON.parse(savedUser);
        } else {
          localStorage.removeItem('currentUser');
          localStorage.removeItem('loginTime');
          localStorage.removeItem('rememberMe');
        }
      }
    } catch (e) {
      console.error('Error loading session', e);
    }
    return null;
  });

  const [currentPath, setCurrentPath] = useState('dashboard');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(false);
  
  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [statuses, setStatuses] = useState<ProjectStatusItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [kpiData, setKpiData] = useState<KPIMonthlyData[]>([]);
  const [evaluations, setEvaluations] = useState<EmployeeEvaluation[]>([]);
  const [events, setEvents] = useState<BirthdayEvent[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceStatuses, setAttendanceStatuses] = useState<AttendanceStatusConfig[]>([]);

  // View State
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // --- FETCH DATA FROM SUPABASE ---
  const fetchAllData = async () => {
    setIsAppLoading(true);
    try {
        const [
            pData, cData, catData, uData, partData, sData, tData, kData, eData, evtData, roleData, notifData, attRecordData, attStatusData
        ] = await Promise.all([
            api.projects.getAll(),
            api.contracts.getAll(),
            api.categories.getAll(),
            api.users.getAll(),
            api.partners.getAll(),
            api.statuses.getAll(),
            api.tasks.getAll(),
            api.kpi.getAll(),
            api.evaluations.getAll(),
            api.events.getAll(),
            api.roles.getAll(),
            api.notifications.getAll(),
            api.attendance.getAll(),
            api.attendanceStatuses.getAll()
        ]);

        setProjects(pData);
        setContracts(cData);
        setCategories(catData);
        setUsers(uData);
        setPartners(partData);
        setStatuses(sData.sort((a,b) => a.order - b.order));
        setTasks(tData);
        setKpiData(kData);
        setEvaluations(eData);
        setEvents(evtData);
        setRoles(roleData);
        setNotifications(notifData);
        setAttendanceRecords(attRecordData);
        setAttendanceStatuses(attStatusData);

        // Check for task reminders after loading
        checkTaskReminders(tData, uData);
    } catch (error) {
        console.error("Failed to fetch initial data", error);
    } finally {
        setIsAppLoading(false);
    }
  };

  const checkTaskReminders = (tasksToCheck: Task[], usersList: User[]) => {
      // Simulate Backend Email Cron Job
      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dueTomorrow = tasksToCheck.filter(t => {
          if (t.status === TaskStatus.COMPLETED || t.status === TaskStatus.CANCELLED) return false;
          const deadline = new Date(t.deadline);
          deadline.setHours(0,0,0,0);
          return deadline.getTime() === tomorrow.getTime();
      });

      if (dueTomorrow.length > 0) {
          console.group('📧 EMAIL REMINDER SYSTEM SIMULATION');
          console.log(`Found ${dueTomorrow.length} tasks due tomorrow (${tomorrow.toLocaleDateString()}). Sending reminders...`);
          dueTomorrow.forEach(task => {
              const assignee = usersList.find(u => u.id === task.assigneeId);
              if (assignee) {
                  console.log(`-> Sending email to ${assignee.email || assignee.username} for task "${task.name}"`);
              }
          });
          console.groupEnd();
      }
  };

  useEffect(() => {
    if (user) {
        fetchAllData();
    }
  }, [user]);

  // Handle Login
  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('currentUser', JSON.stringify(u));
    localStorage.setItem('loginTime', Date.now().toString());
    // rememberMe is handled inside Login.tsx component before calling onLogin
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');
    localStorage.removeItem('rememberMe');
    // Clear data
    setProjects([]);
    setContracts([]);
  };

  // Helper to check permission
  const checkPermission = (resource: ResourceType, action: 'view' | 'edit' | 'delete' = 'view') => {
      if (!user) return false;
      if (user.role === UserRole.ADMIN) return true; // Super Admin bypass
      if (!user.roleId) return true; // Legacy user fallback (optional)
      
      const userRole = roles.find(r => r.id === user.roleId);
      return userRole?.permissions?.[resource]?.[action] || false;
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (isAppLoading && projects.length === 0 && statuses.length === 0) {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
              <Loader2 className="w-10 h-10 text-[#EE0033] animate-spin" />
              <p className="text-slate-500 font-medium">Đang tải dữ liệu từ Cloud...</p>
          </div>
      )
  }

  // Project Handlers
  const handleAddProject = async (p: Project) => {
      const saved = await api.projects.save(p);
      if (saved) setProjects([saved, ...projects]);
  };
  const handleUpdateProject = async (p: Project) => {
      const saved = await api.projects.save(p);
      if (saved) {
          setProjects(projects.map(existing => existing.id === saved.id ? saved : existing));
          if (selectedProject?.id === saved.id) setSelectedProject(saved);
      }
  };
  const handleDeleteProject = async (id: string) => {
      const success = await api.projects.delete(id);
      if (success) {
          setProjects(projects.filter(p => p.id !== id));
          if (selectedProject?.id === id) setSelectedProject(null);
      }
  };

  // Contract Handlers
  const handleAddContract = async (c: Contract) => {
      const saved = await api.contracts.save(c);
      if (saved) setContracts([saved, ...contracts]);
  };
  const handleUpdateContract = async (c: Contract) => {
      const saved = await api.contracts.save(c);
      if (saved) setContracts(contracts.map(existing => existing.id === saved.id ? saved : existing));
  };
  const handleDeleteContract = async (id: string) => {
      const success = await api.contracts.delete(id);
      if (success) setContracts(contracts.filter(c => c.id !== id));
  };
  const handleUpdateContractStatus = async (id: string, status: Contract['status']) => {
      const contract = contracts.find(c => c.id === id);
      if (contract) {
          const updated = { ...contract, status };
          const saved = await api.contracts.save(updated);
          if (saved) setContracts(contracts.map(c => c.id === id ? saved : c));
      }
  };

  // Category Handlers
  const handleAddCategory = async (c: Category) => {
      const saved = await api.categories.save(c);
      if (saved) setCategories([...categories, saved]);
  };
  const handleDeleteCategory = async (id: string) => {
      const success = await api.categories.delete(id);
      if (success) setCategories(categories.filter(c => c.id !== id));
  };

  // User Handlers
  const handleAddUser = async (u: User) => {
      try {
          const saved = await api.users.save(u);
          if (saved) {
              setUsers(prevUsers => [...prevUsers, saved]);
          } else {
              console.warn("User insert returned null, falling back to local state.");
              setUsers(prevUsers => [...prevUsers, u]);
          }
      } catch (error) {
          console.error("Error adding user:", error);
          alert("Lỗi khi thêm người dùng mới.");
      }
  };
  const handleUpdateUser = async (u: User) => {
      const saved = await api.users.save(u);
      if (saved) {
          setUsers(users.map(existing => existing.id === saved.id ? saved : existing));
          // Update current user session if self-update
          if (user.id === saved.id) setUser(saved);
      }
  };
  const handleDeleteUser = async (id: string) => {
      const success = await api.users.delete(id);
      if (success) setUsers(users.filter(u => u.id !== id));
  };

  // Partner Handlers
  const handleAddPartner = async (p: Partner) => {
      const saved = await api.partners.save(p);
      if (saved) setPartners([...partners, saved]);
  };
  const handleUpdatePartner = async (p: Partner) => {
      const saved = await api.partners.save(p);
      if (saved) setPartners(partners.map(existing => existing.id === saved.id ? saved : existing));
  };
  const handleDeletePartner = async (id: string) => {
      const success = await api.partners.delete(id);
      if (success) setPartners(partners.filter(p => p.id !== id));
  };

  // Status Handlers
  const handleAddStatus = async (s: ProjectStatusItem) => {
      const saved = await api.statuses.save(s);
      if (saved) setStatuses([...statuses, saved]);
  };
  const handleUpdateStatus = async (s: ProjectStatusItem) => {
      const saved = await api.statuses.save(s);
      if (saved) setStatuses(statuses.map(existing => existing.id === saved.id ? saved : existing));
  };
  const handleDeleteStatus = async (id: string) => {
      const success = await api.statuses.delete(id);
      if (success) setStatuses(statuses.filter(s => s.id !== id));
  };

  // Task Handlers
  const handleAddTask = async (t: Task) => {
      const saved = await api.tasks.save(t);
      if (saved) setTasks([...tasks, saved]);
  };
  const handleUpdateTask = async (t: Task) => {
      const saved = await api.tasks.save(t);
      if (saved) setTasks(tasks.map(existing => existing.id === saved.id ? saved : existing));
  };
  const handleDeleteTask = async (id: string) => {
      const success = await api.tasks.delete(id);
      if (success) setTasks(tasks.filter(t => t.id !== id));
  };

  // KPI Handlers
  const handleUpdateKPI = async (k: KPIMonthlyData) => {
      const saved = await api.kpi.save(k);
      if (saved) {
          setKpiData(prev => {
              const others = prev.filter(item => item.id !== saved.id);
              return [...others, saved];
          });
      }
  };

  // Event Handlers
  const handleAddEvent = async (e: BirthdayEvent) => {
      const saved = await api.events.save(e);
      if (saved) setEvents([...events, saved]);
  }
  const handleUpdateEvent = async (e: BirthdayEvent) => {
      const saved = await api.events.save(e);
      if (saved) setEvents(events.map(ev => ev.id === saved.id ? saved : ev));
  }
  const handleDeleteEvent = async (id: string) => {
      const success = await api.events.delete(id);
      if (success) setEvents(events.filter(e => e.id !== id));
  }

  // Notification Handlers
  const handleAddNotification = async (n: Notification) => {
      const saved = await api.notifications.save(n);
      if (saved) setNotifications([saved, ...notifications]);
  };
  const handleUpdateNotification = async (n: Notification) => {
      const saved = await api.notifications.save(n);
      if (saved) setNotifications(notifications.map(existing => existing.id === saved.id ? saved : existing));
  };
  const handleDeleteNotification = async (id: string) => {
      const success = await api.notifications.delete(id);
      if (success) setNotifications(notifications.filter(n => n.id !== id));
  };

  // Attendance Handlers
  const handleAddAttendanceRecord = async (r: AttendanceRecord) => {
      const saved = await api.attendance.save(r);
      if (saved) {
          // Replace if exists (based on API upsert logic), or add
          setAttendanceRecords(prev => {
              const filtered = prev.filter(item => item.userId !== saved.userId || item.date !== saved.date);
              return [...filtered, saved];
          });
      }
  };
  const handleUpdateAttendanceRecord = async (r: AttendanceRecord) => {
      const saved = await api.attendance.save(r);
      if (saved) {
          setAttendanceRecords(prev => prev.map(item => item.id === saved.id ? saved : item));
      }
  };

  // Attendance Status Config Handlers
  const handleAddAttendanceStatus = async (s: AttendanceStatusConfig) => {
      const saved = await api.attendanceStatuses.save(s);
      if (saved) setAttendanceStatuses([...attendanceStatuses, saved]);
  };
  const handleUpdateAttendanceStatus = async (s: AttendanceStatusConfig) => {
      const saved = await api.attendanceStatuses.save(s);
      if (saved) setAttendanceStatuses(attendanceStatuses.map(existing => existing.id === saved.id ? saved : existing));
  };
  const handleDeleteAttendanceStatus = async (id: string) => {
      const success = await api.attendanceStatuses.delete(id);
      if (success) setAttendanceStatuses(attendanceStatuses.filter(s => s.id !== id));
  };

  // Navigation Helper
  const navigateTo = (path: string, id?: string) => {
      if (path === 'projects' && id) {
          const project = projects.find(p => p.id === id);
          if (project) {
              setSelectedProject(project);
              setCurrentPath('projects');
          }
      } else if (path === 'events' && id) {
          setSelectedEventId(id);
          setCurrentPath('events');
      } else {
          setCurrentPath(path);
      }
  };

  return (
    <Layout 
        user={user} 
        roles={roles}
        onLogout={handleLogout} 
        currentPath={currentPath} 
        onNavigate={navigateTo}
        onOpenProfile={() => setIsProfileOpen(true)}
    >
      {selectedProject ? (
        <ProjectDetail 
          project={selectedProject}
          contracts={contracts}
          categories={categories}
          user={user}
          partners={partners}
          users={users}
          statuses={statuses}
          tasks={tasks}
          onBack={() => setSelectedProject(null)}
          onAddContract={handleAddContract}
          onUpdateContract={handleUpdateContract}
          onDeleteContract={handleDeleteContract}
          onUpdateContractStatus={handleUpdateContractStatus}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
        />
      ) : (
        <>
          {currentPath === 'dashboard' && (
            <Dashboard 
              currentUser={user}
              projects={projects} 
              contracts={contracts} 
              categories={categories} 
              kpiData={kpiData}
              tasks={tasks}
              users={users}
              evaluations={evaluations}
              events={events}
              roles={roles}
              notifications={notifications}
              attendanceRecords={attendanceRecords}
              attendanceStatuses={attendanceStatuses}
              onUpdateAttendanceRecord={handleUpdateAttendanceRecord}
              onNavigate={navigateTo}
            />
          )}
          {currentPath === 'attendance' && (
              <AttendanceManager 
                  currentUser={user}
                  users={users}
                  records={attendanceRecords}
                  statuses={attendanceStatuses}
                  onAddRecord={handleAddAttendanceRecord}
                  onUpdateRecord={handleUpdateAttendanceRecord}
              />
          )}
          {currentPath === 'tasks' && (
              <TaskManagement 
                  tasks={tasks} 
                  projects={projects} 
                  users={users} 
                  currentUser={user}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
              />
          )}
          {currentPath === 'projects' && (
            <ProjectList 
              projects={projects} 
              contracts={contracts}
              users={users}
              partners={partners}
              statuses={statuses}
              onAddProject={handleAddProject}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onSelectProject={setSelectedProject}
            />
          )}
          {currentPath === 'reports' && (
            <Reports 
              projects={projects} 
              contracts={contracts} 
              categories={categories}
              users={users}
              tasks={tasks}
              attendanceRecords={attendanceRecords}
              attendanceStatuses={attendanceStatuses}
            />
          )}
          {currentPath === 'kpi' && (
            <KPIManagement 
              kpiData={kpiData}
              onUpdateKPI={handleUpdateKPI}
              user={user}
            />
          )}
          {currentPath === 'evaluation' && (
              <EmployeeEvaluationManager 
                  users={users}
                  currentUser={user}
              />
          )}
          {currentPath === 'events' && (
              <EventManager 
                  events={events}
                  initialSelectedId={selectedEventId}
                  onClearSelection={() => setSelectedEventId(null)}
                  onAddEvent={handleAddEvent}
                  onUpdateEvent={handleUpdateEvent}
                  onDeleteEvent={handleDeleteEvent}
              />
          )}
          {currentPath === 'notifications' && (
              <NotificationManager 
                  notifications={notifications}
                  currentUser={user}
                  onAdd={handleAddNotification}
                  onUpdate={handleUpdateNotification}
                  onDelete={handleDeleteNotification}
              />
          )}
          {currentPath === 'settings' && checkPermission('CONFIG') && (
            <ConfigurationManager 
              currentUser={user}
              statuses={statuses}
              users={users}
              partners={partners}
              categories={categories}
              projects={projects}
              contracts={contracts}
              attendanceStatuses={attendanceStatuses}
              onAddStatus={handleAddStatus}
              onUpdateStatus={handleUpdateStatus}
              onDeleteStatus={handleDeleteStatus}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onAddPartner={handleAddPartner}
              onUpdatePartner={handleUpdatePartner}
              onDeletePartner={handleDeletePartner}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
              onAddAttendanceStatus={handleAddAttendanceStatus}
              onUpdateAttendanceStatus={handleUpdateAttendanceStatus}
              onDeleteAttendanceStatus={handleDeleteAttendanceStatus}
            />
          )}
        </>
      )}

      {isProfileOpen && (
          <UserProfile 
              user={user} 
              onUpdate={handleUpdateUser} 
              onClose={() => setIsProfileOpen(false)} 
          />
      )}
    </Layout>
  );
};

export default App;
