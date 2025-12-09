
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import ProjectDetail from './components/ProjectDetail';
import CategoryManager from './components/CategoryManager';
import UserManager from './components/UserManager';
import PartnerManager from './components/PartnerManager';
import ConfigurationManager from './components/ConfigurationManager';
import UserProfile from './components/UserProfile';
import Reports from './components/Reports';
import KPIManagement from './components/KPIManagement';
import { User, Project, Contract, Category, Partner, ProjectStatusItem, Task, KPIMonthlyData } from './types';
import { MOCK_USERS, MOCK_PROJECTS, MOCK_CONTRACTS, MOCK_CATEGORIES, MOCK_PARTNERS, MOCK_STATUSES, MOCK_TASKS, MOCK_KPI } from './services/mockData';

// Helper to load data from localStorage or fallback to mock
const loadData = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    console.error(`Error loading ${key}`, e);
    return fallback;
  }
};

const SESSION_DURATION = 60 * 60 * 1000; // 60 minutes in ms

const App: React.FC = () => {
  // Global State with Persistence for Session
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      const loginTime = localStorage.getItem('loginTime');
      if (savedUser && loginTime) {
        const now = Date.now();
        if (now - parseInt(loginTime) < SESSION_DURATION) {
          return JSON.parse(savedUser);
        } else {
          // Session expired
          localStorage.removeItem('currentUser');
          localStorage.removeItem('loginTime');
        }
      }
    } catch (e) {
      console.error('Error loading session', e);
    }
    return null;
  });

  const [currentPath, setCurrentPath] = useState('dashboard');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Data State with Persistence
  const [projects, setProjects] = useState<Project[]>(() => loadData('projects', MOCK_PROJECTS));
  const [contracts, setContracts] = useState<Contract[]>(() => loadData('contracts', MOCK_CONTRACTS));
  const [categories, setCategories] = useState<Category[]>(() => loadData('categories', MOCK_CATEGORIES));
  const [users, setUsers] = useState<User[]>(() => loadData('users', MOCK_USERS));
  const [partners, setPartners] = useState<Partner[]>(() => loadData('partners', MOCK_PARTNERS));
  const [statuses, setStatuses] = useState<ProjectStatusItem[]>(() => loadData('statuses', MOCK_STATUSES));
  const [tasks, setTasks] = useState<Task[]>(() => loadData('tasks', MOCK_TASKS));
  const [kpiData, setKpiData] = useState<KPIMonthlyData[]>(() => loadData('kpiData', MOCK_KPI));

  // View State
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => localStorage.setItem('projects', JSON.stringify(projects)), [projects]);
  useEffect(() => localStorage.setItem('contracts', JSON.stringify(contracts)), [contracts]);
  useEffect(() => localStorage.setItem('categories', JSON.stringify(categories)), [categories]);
  useEffect(() => localStorage.setItem('users', JSON.stringify(users)), [users]);
  useEffect(() => localStorage.setItem('partners', JSON.stringify(partners)), [partners]);
  useEffect(() => localStorage.setItem('statuses', JSON.stringify(statuses)), [statuses]);
  useEffect(() => localStorage.setItem('tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem('kpiData', JSON.stringify(kpiData)), [kpiData]);

  // Handle Login
  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('currentUser', JSON.stringify(u));
    localStorage.setItem('loginTime', Date.now().toString());
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Project Handlers
  const handleAddProject = (p: Project) => setProjects([p, ...projects]);
  const handleUpdateProject = (p: Project) => {
    setProjects(projects.map(existing => existing.id === p.id ? p : existing));
    if (selectedProject?.id === p.id) setSelectedProject(p);
  };
  const handleDeleteProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
    if (selectedProject?.id === id) setSelectedProject(null);
  };

  // Contract Handlers
  const handleAddContract = (c: Contract) => setContracts([c, ...contracts]);
  const handleUpdateContract = (c: Contract) => setContracts(contracts.map(existing => existing.id === c.id ? c : existing));
  const handleDeleteContract = (id: string) => setContracts(contracts.filter(c => c.id !== id));
  
  const handleUpdateContractStatus = (id: string, status: Contract['status']) => {
    setContracts(contracts.map(c => c.id === id ? { ...c, status } : c));
  };

  const handleAddCategory = (c: Category) => setCategories([...categories, c]);
  const handleDeleteCategory = (id: string) => setCategories(categories.filter(c => c.id !== id));

  // User Handlers
  const handleAddUser = (u: User) => setUsers([...users, u]);
  const handleUpdateUser = (u: User) => {
    setUsers(users.map(existing => existing.id === u.id ? u : existing));
    if (user.id === u.id) {
        setUser(u);
        localStorage.setItem('currentUser', JSON.stringify(u)); // Update session user data
    }
  };
  const handleDeleteUser = (id: string) => setUsers(users.filter(u => u.id !== id));

  // Partner Handlers
  const handleAddPartner = (p: Partner) => setPartners([...partners, p]);
  const handleUpdatePartner = (p: Partner) => setPartners(partners.map(existing => existing.id === p.id ? p : existing));
  const handleDeletePartner = (id: string) => setPartners(partners.filter(p => p.id !== id));

  // Status Handlers
  const handleAddStatus = (s: ProjectStatusItem) => setStatuses([...statuses, s]);
  const handleUpdateStatus = (s: ProjectStatusItem) => setStatuses(statuses.map(existing => existing.id === s.id ? s : existing));
  const handleDeleteStatus = (id: string) => setStatuses(statuses.filter(s => s.id !== id));

  // Task Handlers
  const handleAddTask = (t: Task) => setTasks([...tasks, t]);
  const handleUpdateTask = (t: Task) => setTasks(tasks.map(existing => existing.id === t.id ? t : existing));
  const handleDeleteTask = (id: string) => setTasks(tasks.filter(t => t.id !== id));

  // KPI Handlers
  const handleUpdateKPI = (data: KPIMonthlyData) => {
    const exists = kpiData.some(d => d.id === data.id);
    if (exists) {
        setKpiData(kpiData.map(d => d.id === data.id ? data : d));
    } else {
        setKpiData([...kpiData, data]);
    }
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
               />;
      case 'kpi':
        return <KPIManagement kpiData={kpiData} onUpdateKPI={handleUpdateKPI} user={user} />;
      case 'reports':
        return <Reports projects={projects} contracts={contracts} categories={categories} users={users} />;
      case 'projects':
        return <ProjectList 
                  projects={projects} 
                  contracts={contracts} // Passed for calculation
                  users={users} 
                  partners={partners}
                  statuses={statuses}
                  onAddProject={handleAddProject} 
                  onUpdateProject={handleUpdateProject}
                  onDeleteProject={handleDeleteProject}
                  onSelectProject={setSelectedProject} 
               />;
      case 'categories':
        return <CategoryManager categories={categories} onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory} />;
      case 'users':
        return <UserManager users={users} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} />;
      case 'partners':
        return <PartnerManager partners={partners} onAdd={handleAddPartner} onUpdate={handleUpdatePartner} onDelete={handleDeletePartner} />;
      case 'settings':
        return <ConfigurationManager statuses={statuses} onAddStatus={handleAddStatus} onUpdateStatus={handleUpdateStatus} onDeleteStatus={handleDeleteStatus} />;
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
