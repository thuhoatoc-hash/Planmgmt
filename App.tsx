
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
import { User, Project, Contract, Category, Partner, ProjectStatusItem, Task, KPIMonthlyData, EmployeeEvaluation, TaskStatus, BirthdayEvent } from './types';
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

  // View State
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // --- FETCH DATA FROM SUPABASE ---
  const fetchAllData = async () => {
    setIsAppLoading(true);
    try {
        const [
            pData, cData, catData, uData, partData, sData, tData, kData, eData, evtData
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
            api.events.getAll()
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
          console.error("Add user failed:", error);
          setUsers(prevUsers => [...prevUsers, u]);
      }
  };
  const handleUpdateUser = async (u: User) => {
      const saved = await api.users.save(u);
      if (saved) {
          setUsers(prevUsers => prevUsers.map(existing => existing.id === saved.id ? saved : existing));
          if (user.id === saved.id) {
              setUser(saved);
              localStorage.setItem('currentUser', JSON.stringify(saved));
          }
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
  const handleUpdateKPI = async (data: KPIMonthlyData) => {
      const saved = await api.kpi.save(data);
      if (saved) {
          const exists = kpiData.some(d => d.id === saved.id);
          if (exists) {
              setKpiData(kpiData.map(d => d.id === saved.id ? saved : d));
          } else {
              setKpiData([...kpiData, saved]);
          }
      }
  };

  // Event Handlers
  const handleAddEvent = async (e: BirthdayEvent) => {
      const saved = await api.events.save(e);
      if (saved) setEvents([...events, saved]);
  };
  const handleUpdateEvent = async (e: BirthdayEvent) => {
      const saved = await api.events.save(e);
      if (saved) setEvents(events.map(existing => existing.id === saved.id ? saved : existing));
  };
  const handleDeleteEvent = async (id: string) => {
      const success = await api.events.delete(id);
      if (success) setEvents(events.filter(e => e.id !== id));
  };

  // Navigation Logic
  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    if (path !== 'projects') {
      setSelectedProject(null);
    }
  };

  const renderContent = () => {
    // Detail View Override
    if (currentPath === 'projects' && selectedProject) {
      return (
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
      );
    }

    switch (currentPath) {
      case 'dashboard':
        return <Dashboard 
                  projects={projects} 
                  contracts={contracts} 
                  categories={categories} 
                  kpiData={kpiData} 
                  tasks={tasks}
                  users={users}
                  evaluations={evaluations}
                  events={events}
               />;
      case 'kpi':
        return <KPIManagement kpiData={kpiData} onUpdateKPI={handleUpdateKPI} user={user} />;
      case 'evaluation':
        return <EmployeeEvaluationManager users={users} currentUser={user} />;
      case 'tasks':
        return <TaskManagement 
                  tasks={tasks}
                  projects={projects}
                  users={users}
                  currentUser={user}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
               />;
      case 'events':
        return <EventManager 
                  events={events}
                  onAddEvent={handleAddEvent}
                  onUpdateEvent={handleUpdateEvent}
                  onDeleteEvent={handleDeleteEvent}
               />;
      case 'reports':
        return <Reports projects={projects} contracts={contracts} categories={categories} users={users} />;
      case 'projects':
        return <ProjectList 
                  projects={projects} 
                  contracts={contracts} 
                  users={users} 
                  partners={partners}
                  statuses={statuses}
                  onAddProject={handleAddProject} 
                  onUpdateProject={handleUpdateProject}
                  onDeleteProject={handleDeleteProject}
                  onSelectProject={setSelectedProject} 
               />;
      // Consolidated Settings Route
      case 'settings':
        return <ConfigurationManager 
                  currentUser={user}
                  statuses={statuses}
                  users={users}
                  partners={partners}
                  categories={categories}
                  projects={projects}
                  contracts={contracts}
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
               />;
      default:
        return <div>Not found</div>;
    }
  };

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      currentPath={currentPath} 
      onNavigate={handleNavigate}
      onOpenProfile={() => setIsProfileOpen(true)}
    >
      {renderContent()}
      {isProfileOpen && (
        <UserProfile 
            user={user} 
            onClose={() => setIsProfileOpen(false)}
            onUpdate={handleUpdateUser}
        />
      )}
    </Layout>
  );
};

export default App;
