import React, { useState } from 'react';
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
import { User, Project, Contract, Category, Partner, ProjectStatusItem } from './types';
import { MOCK_USERS, MOCK_PROJECTS, MOCK_CONTRACTS, MOCK_CATEGORIES, MOCK_PARTNERS, MOCK_STATUSES } from './services/mockData';

const App: React.FC = () => {
  // Global State
  const [user, setUser] = useState<User | null>(null);
  const [currentPath, setCurrentPath] = useState('dashboard');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Data State
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [contracts, setContracts] = useState<Contract[]>(MOCK_CONTRACTS);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [partners, setPartners] = useState<Partner[]>(MOCK_PARTNERS);
  const [statuses, setStatuses] = useState<ProjectStatusItem[]>(MOCK_STATUSES);

  // View State
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Handle Login
  if (!user) {
    return <Login onLogin={setUser} />;
  }

  // Data Handlers
  const handleAddProject = (p: Project) => setProjects([p, ...projects]);
  const handleAddContract = (c: Contract) => setContracts([c, ...contracts]);
  const handleUpdateContractStatus = (id: string, status: Contract['status']) => {
    setContracts(contracts.map(c => c.id === id ? { ...c, status } : c));
  };
  const handleAddCategory = (c: Category) => setCategories([...categories, c]);
  const handleDeleteCategory = (id: string) => setCategories(categories.filter(c => c.id !== id));

  // User Handlers
  const handleAddUser = (u: User) => setUsers([...users, u]);
  const handleUpdateUser = (u: User) => {
    setUsers(users.map(existing => existing.id === u.id ? u : existing));
    if (user.id === u.id) setUser(u); // Update current session if self-update
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
          onBack={() => setSelectedProject(null)}
          onAddContract={handleAddContract}
          onUpdateContractStatus={handleUpdateContractStatus}
        />
      );
    }

    switch (currentPath) {
      case 'dashboard':
        return <Dashboard projects={projects} contracts={contracts} categories={categories} />;
      case 'projects':
        return <ProjectList 
                  projects={projects} 
                  users={users} 
                  partners={partners}
                  statuses={statuses}
                  onAddProject={handleAddProject} 
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
      onLogout={() => setUser(null)} 
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