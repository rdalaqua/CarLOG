
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Car as CarIcon, 
  Wrench, 
  History, 
  ChevronLeft, 
  Trash2, 
  Info, 
  LayoutGrid,
  Settings as SettingsIcon,
  AlertCircle,
  Calendar as CalendarIcon,
  LogOut,
  Download,
  User as UserIcon,
  Lock,
  Mail,
  BarChart3,
  Upload,
  FileSpreadsheet,
  TrendingUp,
  DollarSign,
  KeyRound,
  CheckCircle2,
  Pencil,
  ChevronDown
} from 'lucide-react';
import { AppView, Car, MaintenanceRecord, ServiceType, User } from './types';
import { getMaintenanceInsights } from './services/geminiService';

// --- LocalStorage Helpers ---
const STORAGE_KEY_USERS = 'carlog_users';
const STORAGE_KEY_CURRENT_USER = 'carlog_active_user';

const getFromStorage = <T,>(key: string, defaultValue: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
};

const saveToStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- Components ---

const Button: React.FC<{ 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; 
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
  type?: 'button' | 'submit';
}> = ({ onClick, variant = 'primary', className = '', disabled, children, type = 'button' }) => {
  const baseStyles = "px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:active:scale-100";
  const variants = {
    primary: "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100"
  };
  
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Input: React.FC<{
  label: string;
  name?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  icon?: React.ReactNode;
  step?: string | number;
}> = ({ label, name, value, defaultValue, onChange, type = 'text', placeholder, required, icon, step }) => (
  <div className="flex flex-col gap-1.5 mb-4">
    <label className="text-sm font-medium text-slate-600 ml-1">{label}</label>
    <div className="relative">
      <input
        type={type}
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        step={step}
        className={`w-full ${icon ? 'pr-12' : 'px-4'} py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm`}
      />
      {icon && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </div>
      )}
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getFromStorage(STORAGE_KEY_CURRENT_USER, null));
  const [isSignup, setIsSignup] = useState(false);
  const [view, setView] = useState<AppView>(currentUser ? 'home' : 'login');
  const [cars, setCars] = useState<Car[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [dashboardYear, setDashboardYear] = useState(new Date().getFullYear());
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    if (currentUser) {
      setCars(getFromStorage(`carlog_cars_${currentUser.id}`, []));
      setRecords(getFromStorage(`carlog_records_${currentUser.id}`, []));
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      saveToStorage(`carlog_cars_${currentUser.id}`, cars);
      saveToStorage(`carlog_records_${currentUser.id}`, records);
    }
  }, [cars, records, currentUser]);

  const selectedCar = useMemo(() => cars.find(c => c.id === selectedCarId), [cars, selectedCarId]);
  const carRecords = useMemo(() => records.filter(r => r.carId === selectedCarId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [records, selectedCarId]);
  const editingRecord = useMemo(() => records.find(r => r.id === editingRecordId), [records, editingRecordId]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    records.forEach(r => {
      const year = new Date(r.date).getFullYear();
      if (!isNaN(year)) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [records]);

  // Auth
  const handleAuth = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    const formData = new FormData(e.currentTarget);
    const username = (formData.get('username') as string).trim();
    const password = formData.get('password') as string;
    const users: User[] = getFromStorage(STORAGE_KEY_USERS, []);

    if (isSignup) {
      const name = formData.get('name') as string;
      if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return setAuthError('Este usuário já existe.');
      }
      const newUser = { id: crypto.randomUUID(), name, username, password };
      const updatedUsers = [...users, newUser];
      saveToStorage(STORAGE_KEY_USERS, updatedUsers);
      setCurrentUser(newUser);
      saveToStorage(STORAGE_KEY_CURRENT_USER, newUser);
      setView('home'); 
    } else {
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
      if (user) { 
        setCurrentUser(user); 
        saveToStorage(STORAGE_KEY_CURRENT_USER, user); 
        setView('home'); 
      }
      else setAuthError('Usuário ou senha inválidos.');
    }
  };

  const handleChangePassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    if (!currentUser) return;

    const formData = new FormData(e.currentTarget);
    const currentPass = formData.get('currentPassword') as string;
    const newPass = formData.get('newPassword') as string;
    const confirmPass = formData.get('confirmPassword') as string;

    if (currentPass !== currentUser.password) {
      return setAuthError('Senha atual incorreta.');
    }

    if (newPass !== confirmPass) {
      return setAuthError('As novas senhas não coincidem.');
    }

    if (newPass.length < 4) {
      return setAuthError('A nova senha deve ter pelo menos 4 caracteres.');
    }

    const users: User[] = getFromStorage(STORAGE_KEY_USERS, []);
    const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, password: newPass } : u);
    
    saveToStorage(STORAGE_KEY_USERS, updatedUsers);
    
    const updatedUser = { ...currentUser, password: newPass };
    setCurrentUser(updatedUser);
    saveToStorage(STORAGE_KEY_CURRENT_USER, updatedUser);
    
    setPasswordChangeSuccess(true);
    setTimeout(() => {
      setPasswordChangeSuccess(false);
      setView('settings');
    }, 2000);
  };

  const handleLogout = () => { 
    setCurrentUser(null); 
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER); 
    setView('login'); 
  };

  // Data Actions
  const handleAddCar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCar: Car = {
      id: crypto.randomUUID(),
      make: formData.get('make') as string,
      model: formData.get('model') as string,
      year: parseInt(formData.get('year') as string),
      plate: (formData.get('plate') as string) || undefined,
      currentMileage: parseInt(formData.get('mileage') as string),
      color: formData.get('color') as string || 'Slate'
    };
    setCars(prev => [...prev, newCar]);
    setView('home');
  };

  /**
   * REFACTORED DELETION: Cascading delete
   * Removes both the car and all its associated maintenance records.
   */
  const deleteCar = (id: string) => {
    if (window.confirm('Atenção: Isso excluirá o veículo e TODO o seu histórico de manutenções. Continuar?')) {
      // Functional update to ensure we always have latest state
      setRecords(prev => prev.filter(r => r.carId !== id));
      setCars(prev => prev.filter(c => c.id !== id));
      
      setSelectedCarId(null);
      setView('home');
    }
  };

  const deleteRecord = (id: string) => {
    if (window.confirm('Excluir este registro permanentemente?')) {
      setRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  const startEditingRecord = (record: MaintenanceRecord) => {
    setEditingRecordId(record.id);
    setView('edit-maintenance');
  };

  // CSV logic
  const exportToCSV = () => {
    if (!currentUser) return;
    let csv = "ID_CARRO,VEICULO,PECA,TIPO,DATA,KM,CUSTO,OBS\n";
    records.forEach(r => {
      const car = cars.find(c => c.id === r.carId);
      csv += `${r.carId},"${car?.model || ''}","${r.partName}",${r.type},${r.date},${r.mileage},${r.cost || 0},"${r.notes || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carlog_${currentUser.username}_${todayStr}.csv`;
    a.click();
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !selectedCarId) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').slice(1); // skip header
      const newRecords: MaintenanceRecord[] = [];
      lines.forEach(line => {
        if (!line.trim()) return;
        const [_, __, partName, type, date, mileage, cost, notes] = line.split(',').map(s => s.replace(/"/g, '').trim());
        newRecords.push({
          id: crypto.randomUUID(),
          carId: selectedCarId,
          partName,
          type: type === 'REVISION' ? ServiceType.REVISION : ServiceType.REPLACEMENT,
          date,
          mileage: parseInt(mileage) || 0,
          cost: parseFloat(cost) || 0,
          notes
        });
      });
      setRecords(prev => [...prev, ...newRecords]);
      window.alert(`${newRecords.length} registros importados.`);
      setView('car-details');
    };
    reader.readAsText(file);
  };

  // Dashboard Stats
  const dashboardStats = useMemo(() => {
    const totalSpent = records.reduce((acc, r) => acc + (r.cost || 0), 0);
    const byMonth: Record<string, number> = {};
    const hasServiceInMonth: Record<number, boolean> = {};
    
    records.forEach(r => {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + (r.cost || 0);
      
      // Filter activity for the specific dashboardYear
      if (d.getFullYear() === dashboardYear) {
        hasServiceInMonth[d.getMonth()] = true;
      }
    });

    return { totalSpent, totalServices: records.length, byMonth, hasServiceInMonth };
  }, [records, dashboardYear]);

  function handleSaveMaintenance(e: React.FormEvent<HTMLFormElement>) {
    if (!selectedCarId) return;
    const formData = new FormData(e.currentTarget);
    const data = {
      partName: formData.get('part') as string,
      type: formData.get('type') as ServiceType,
      date: formData.get('date') as string,
      mileage: parseInt(formData.get('mileage') as string),
      notes: formData.get('notes') as string,
      cost: parseFloat(formData.get('cost') as string) || 0
    };

    if (view === 'edit-maintenance' && editingRecordId) {
      setRecords(prev => prev.map(r => r.id === editingRecordId ? { ...r, ...data } : r));
    } else {
      const newRecord: MaintenanceRecord = {
        id: crypto.randomUUID(),
        carId: selectedCarId,
        ...data
      };
      setRecords(prev => [...prev, newRecord]);
    }

    setCars(prev => prev.map(c => 
      c.id === selectedCarId && data.mileage > c.currentMileage 
        ? { ...c, currentMileage: data.mileage } 
        : c
    ));
    
    setView('car-details');
    setEditingRecordId(null);
  }

  const requestAiInsight = async () => {
    if (!selectedCar) return;
    setLoadingAi(true);
    const insight = await getMaintenanceInsights(selectedCar, carRecords);
    setAiInsight(insight);
    setLoadingAi(false);
  };

  if (view === 'login' || !currentUser) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <div className="w-20 h-20 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center mb-8 shadow-xl shadow-blue-200"><CarIcon size={40} /></div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">Carlog</h1>
        <p className="text-slate-500 mb-8 text-center">{isSignup ? 'Crie sua conta para começar.' : 'Entre com seus dados para acessar sua garagem.'}</p>
        
        <form onSubmit={handleAuth} className="w-full space-y-2">
          {isSignup && <Input label="Nome Completo" name="name" placeholder="Seu Nome" required icon={<UserIcon size={18}/>} />}
          <Input label="Usuário" name="username" placeholder="Seu usuário" required icon={<Mail size={18}/>} />
          <Input label="Senha" name="password" type="password" placeholder="••••••••" required icon={<Lock size={18}/>} />
          {authError && <p className="text-rose-500 text-sm font-bold text-center py-2">{authError}</p>}
          <Button type="submit" className="w-full mt-4">{isSignup ? 'Cadastrar' : 'Entrar'}</Button>
        </form>
        <button onClick={() => { setIsSignup(!isSignup); setAuthError(null); }} className="mt-8 text-sm font-bold text-blue-600">
          {isSignup ? 'Já tem conta? Entre aqui' : 'Não tem conta? Cadastre-se agora'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col relative overflow-x-hidden">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {view !== 'home' && view !== 'settings' && view !== 'dashboard' && (
            <button onClick={() => {
              if (view === 'edit-maintenance' || view === 'add-maintenance' || view === 'import-data') {
                setView('car-details');
                setEditingRecordId(null);
              } else if (view === 'car-details') {
                setView('home');
                setSelectedCarId(null);
              } else {
                setView('home');
              }
            }} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronLeft size={24} className="text-slate-600" />
            </button>
          )}
          {view === 'settings' && (
            <button onClick={() => setView('home')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronLeft size={24} className="text-slate-600" />
            </button>
          )}
          <h1 className="text-xl font-bold text-slate-900 truncate max-w-[180px]">
            {view === 'home' && "Garagem"}
            {view === 'car-details' && selectedCar?.model}
            {view === 'dashboard' && "Estatísticas"}
            {view === 'settings' && "Ajustes"}
            {view === 'add-car' && "Novo Carro"}
            {view === 'import-data' && "Importar CSV"}
            {view === 'change-password' && "Alterar Senha"}
            {view === 'add-maintenance' && "Nova Manutenção"}
            {view === 'edit-maintenance' && "Editar Manutenção"}
          </h1>
        </div>
        {view === 'car-details' && selectedCar && (
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); deleteCar(selectedCar.id); }} 
            className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-full active:scale-90 transition-all bg-rose-50/50"
            title="Excluir Veículo"
          >
            <Trash2 size={20} />
          </button>
        )}
      </header>

      <main className="flex-1 p-6 pb-32">
        {view === 'home' && (
          <div className="space-y-4">
            {cars.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mb-6">
                  <CarIcon size={40} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Garagem vazia</h3>
                <p className="text-slate-500 mb-8">Cadastre seu primeiro carro para começar a registrar manutenções.</p>
                <Button onClick={() => setView('add-car')}><Plus size={20} /> Novo Carro</Button>
              </div>
            ) : (
              cars.map(car => (
                <div key={car.id} onClick={() => { setSelectedCarId(car.id); setView('car-details'); }} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 cursor-pointer active:scale-95 transition-all">
                  <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center"><CarIcon size={28} /></div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900">{car.make} {car.model}</h4>
                    <p className="text-sm text-slate-500">{car.plate || 'S/ Placa'} • {car.year}</p>
                  </div>
                </div>
              ))
            )}
            {cars.length > 0 && (
              <Button variant="secondary" onClick={() => setView('add-car')} className="w-full"><Plus size={18} /> Novo Carro</Button>
            )}
          </div>
        )}

        {view === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-slate-400 text-[10px] font-bold uppercase mb-1 tracking-wider">Total Gasto</p>
                <p className="text-2xl font-black text-blue-600">R$ {dashboardStats.totalSpent.toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-slate-400 text-[10px] font-bold uppercase mb-1 tracking-wider">Serviços</p>
                <p className="text-2xl font-black text-slate-900">{dashboardStats.totalServices}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold flex items-center gap-2"><CalendarIcon size={18} className="text-blue-500"/> Atividade Mensal</h3>
                
                {/* Dashboard Year Selection UI */}
                <div className="relative">
                  <select 
                    value={dashboardYear} 
                    onChange={(e) => setDashboardYear(parseInt(e.target.value))}
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-1.5 pl-3 pr-8 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 12 }).map((_, i) => {
                  const active = dashboardStats.hasServiceInMonth[i];
                  return (
                    <div key={i} className={`flex flex-col items-center justify-center py-3 rounded-2xl border transition-all ${active ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                      <span className="text-[10px] font-bold">{new Date(0, i).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</span>
                      {active && <div className="w-1.5 h-1.5 bg-white rounded-full mt-1.5 animate-pulse"></div>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-500"/> Gastos por Mês</h3>
              <div className="space-y-3">
                {Object.keys(dashboardStats.byMonth).length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Ainda não há dados de gastos.</p>
                ) : (
                  Object.entries(dashboardStats.byMonth).sort().reverse().map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                      <span className="text-sm font-medium text-slate-600">{key}</span>
                      <span className="font-bold text-slate-900">R$ {value.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'car-details' && selectedCar && (
          <div className="space-y-6">
             <div className="bg-blue-600 p-6 rounded-[2.5rem] text-white shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <div><h2 className="text-2xl font-black">{selectedCar.model}</h2><p className="opacity-80 font-medium">{selectedCar.make}</p></div>
                <div className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">{selectedCar.plate || 'S/ PLACA'}</div>
              </div>
              <p className="text-xs uppercase opacity-70 font-bold mb-1 tracking-wider">Km Atual</p>
              <p className="text-3xl font-black">{selectedCar.currentMileage.toLocaleString()}</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setView('add-maintenance')} className="flex-1 text-sm"><Wrench size={16}/> Novo Registro</Button>
              <Button variant="secondary" onClick={() => setView('import-data')} className="flex-1 text-sm"><Upload size={16}/> Importar</Button>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-3xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-indigo-700"><AlertCircle size={20} /><span className="font-bold">Análise Inteligente</span></div>
                {!aiInsight && !loadingAi && <button onClick={requestAiInsight} className="text-indigo-600 text-xs font-bold hover:underline">Gerar agora</button>}
              </div>
              {loadingAi ? <div className="flex items-center gap-3 text-indigo-400 py-2"><div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent"></div><span className="text-sm">Gemini está analisando...</span></div> 
              : aiInsight ? <div className="text-sm text-indigo-900 whitespace-pre-wrap leading-relaxed">{aiInsight}</div> 
              : <p className="text-xs text-indigo-600/70 italic">Toque para receber sugestões baseadas no seu histórico.</p>}
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-800">Histórico de Serviços</h3>
              {carRecords.length === 0 ? (
                 <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center text-slate-400 text-sm">
                  Nenhum registro encontrado.
                </div>
              ) : (
                carRecords.map(record => (
                  <div key={record.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-4 group relative items-start">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${record.type === ServiceType.REPLACEMENT ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-500'}`}>
                      {record.type === ServiceType.REPLACEMENT ? <Wrench size={18} /> : <Info size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-900 truncate pr-2">{record.partName}</h4>
                        <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{new Date(record.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <p className="text-xs text-slate-500">{record.mileage.toLocaleString()} KM • R$ {record.cost?.toLocaleString() || 0}</p>
                    </div>
                    <div className="flex flex-col gap-2 ml-2">
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); startEditingRecord(record); }} 
                        className="p-2.5 text-slate-500 hover:text-blue-600 transition-colors bg-slate-50 rounded-xl active:scale-90"
                        title="Editar"
                      >
                        <Pencil size={18}/>
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deleteRecord(record.id); }} 
                        className="p-2.5 text-slate-400 hover:text-rose-600 transition-colors bg-rose-50/50 rounded-xl active:scale-90"
                        title="Excluir"
                      >
                        <Trash2 size={18}/>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === 'import-data' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100">
              <h3 className="font-bold mb-2 flex items-center gap-2"><FileSpreadsheet size={18}/> Formato do Arquivo</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                O CSV deve conter os seguintes campos na ordem (incluindo cabeçalho):<br/>
                <code className="bg-slate-50 p-1 rounded mt-2 block overflow-x-auto whitespace-nowrap">
                  ID_CARRO,VEICULO,PECA,TIPO,DATA,KM,CUSTO,OBS
                </code>
              </p>
              <div className="bg-slate-900 text-blue-400 p-4 rounded-xl text-[10px] font-mono mb-4">
                ID_CARRO,VEICULO,PECA,TIPO,DATA,KM,CUSTO,OBS<br/>
                {selectedCarId},"{selectedCar?.model}","Óleo Motor",REPLACEMENT,2024-05-15,55000,250.00,"Marca Mobil"
              </div>
              <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} className="w-full"><Upload size={18}/> Selecionar Arquivo .CSV</Button>
              <Button variant="ghost" onClick={() => setView('car-details')} className="w-full mt-2">Cancelar</Button>
            </div>
          </div>
        )}

        {view === 'change-password' && (
          <div className="space-y-6">
            <form onSubmit={handleChangePassword} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              {passwordChangeSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-emerald-600 animate-in zoom-in duration-300">
                  <CheckCircle2 size={48} className="mb-4" />
                  <p className="font-bold text-lg">Senha alterada!</p>
                  <p className="text-sm opacity-70">Redirecionando...</p>
                </div>
              ) : (
                <>
                  <Input label="Senha Atual" name="currentPassword" type="password" required icon={<Lock size={18}/>} />
                  <Input label="Nova Senha" name="newPassword" type="password" required icon={<KeyRound size={18}/>} />
                  <Input label="Confirmar Nova Senha" name="confirmPassword" type="password" required icon={<KeyRound size={18}/>} />
                  
                  {authError && <p className="text-rose-500 text-sm font-bold text-center">{authError}</p>}
                  
                  <div className="pt-4 space-y-2">
                    <Button type="submit" className="w-full">Atualizar Senha</Button>
                    <Button variant="ghost" onClick={() => setView('settings')} className="w-full">Cancelar</Button>
                  </div>
                </>
              )}
            </form>
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4 shadow-sm">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black text-lg">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{currentUser.name}</h3>
                <p className="text-xs text-slate-500">@{currentUser.username}</p>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
              <button onClick={() => setView('change-password')} className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 text-slate-700 font-medium text-left">
                <KeyRound size={20} className="text-blue-500" />
                <span>Alterar Senha</span>
              </button>
              <button onClick={exportToCSV} className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 text-slate-700 font-medium text-left">
                <Download size={20} className="text-blue-500" />
                <span>Exportar Histórico (.CSV)</span>
              </button>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 hover:bg-rose-50 transition-colors text-rose-600 font-medium text-left">
                <LogOut size={20} className="text-rose-500" />
                <span>Sair da Conta</span>
              </button>
            </div>
            
            <p className="text-center text-slate-400 text-xs py-4 uppercase tracking-widest font-bold">Carlog v1.5.0</p>
          </div>
        )}

        {view === 'add-car' && (
          <form onSubmit={handleAddCar} className="space-y-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <Input label="Marca" name="make" placeholder="Ex: Toyota" required />
            <Input label="Modelo" name="model" placeholder="Ex: Corolla" required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Ano" name="year" type="number" required placeholder="2022" />
              <Input label="Placa" name="plate" placeholder="ABC1D23" />
            </div>
            <Input label="KM Atual" name="mileage" type="number" required placeholder="0" />
            <div className="pt-4 space-y-2">
              <Button type="submit" className="w-full">Salvar Veículo</Button>
              <Button variant="ghost" onClick={() => setView('home')} className="w-full">Cancelar</Button>
            </div>
          </form>
        )}

        {(view === 'add-maintenance' || view === 'edit-maintenance') && (
          <form 
            key={view === 'edit-maintenance' ? (editingRecordId || 'edit') : 'add'}
            onSubmit={(e) => { e.preventDefault(); handleSaveMaintenance(e); }} 
            className="space-y-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
          >
            <Input label="Peça / Serviço" name="part" defaultValue={editingRecord?.partName} placeholder="Ex: Filtro de Óleo" required />
            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-sm font-medium text-slate-600 ml-1">Tipo de Serviço</label>
              <select name="type" defaultValue={editingRecord?.type || "REPLACEMENT"} required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                <option value="REPLACEMENT">Troca de Peça</option>
                <option value="REVISION">Revisão Preventiva</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Data" name="date" type="date" defaultValue={editingRecord?.date || todayStr} required icon={<CalendarIcon size={18}/>} />
              <Input label="KM do Carro" name="mileage" type="number" defaultValue={editingRecord?.mileage} required placeholder="0" />
            </div>
            <Input label="Custo (R$)" name="cost" type="number" step="0.01" defaultValue={editingRecord?.cost} placeholder="0.00" icon={<DollarSign size={18}/>} />
            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-sm font-medium text-slate-600 ml-1">Observações</label>
              <textarea name="notes" defaultValue={editingRecord?.notes} placeholder="Marca da peça, oficina, etc..." className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all h-24"></textarea>
            </div>
            <div className="pt-4 space-y-2">
              <Button type="submit" className="w-full">{view === 'edit-maintenance' ? 'Salvar Alterações' : 'Registrar Manutenção'}</Button>
              <Button variant="ghost" onClick={() => { setView('car-details'); setEditingRecordId(null); }} className="w-full">Cancelar</Button>
            </div>
          </form>
        )}
      </main>

      {/* Navigation */}
      {(view === 'home' || view === 'dashboard' || view === 'settings' || view === 'car-details' || view === 'change-password') && (
        <nav className="fixed bottom-6 left-6 right-6 z-30">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-[2rem] p-2 flex items-center justify-around shadow-2xl border border-white/10">
            <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1 p-3 transition-all ${view === 'home' || view === 'car-details' ? 'text-white scale-110' : 'text-slate-400 hover:text-slate-200'}`}>
              <LayoutGrid size={22} /><span className="text-[10px] font-bold uppercase tracking-tight">Garagem</span>
            </button>
            <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 p-3 transition-all ${view === 'dashboard' ? 'text-white scale-110' : 'text-slate-400 hover:text-slate-200'}`}>
              <BarChart3 size={22} /><span className="text-[10px] font-bold uppercase tracking-tight">Resumo</span>
            </button>
            <button onClick={() => setView('add-car')} className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg -mt-10 border-4 border-slate-900 active:scale-90 transition-all">
              <Plus size={28} strokeWidth={3} />
            </button>
            <button onClick={() => setView('settings')} className={`flex flex-col items-center gap-1 p-3 transition-all ${view === 'settings' || view === 'change-password' ? 'text-white scale-110' : 'text-slate-400 hover:text-slate-200'}`}>
              <SettingsIcon size={22} /><span className="text-[10px] font-bold uppercase tracking-tight">Ajustes</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
