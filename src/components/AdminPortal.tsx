import React, { useState, useEffect } from 'react';
import { Users, BookOpen, ShieldAlert, Trash2, ArrowUpRight, LogOut, Search } from 'lucide-react';
import { User, Quiz } from '../types';

interface AdminPortalProps {
  onLogout: () => void;
}

export default function AdminPortal({ onLogout }: AdminPortalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Initial static users if none exist
    let savedUsersStr = localStorage.getItem('app_users');
    let savedUsers: User[] = savedUsersStr ? JSON.parse(savedUsersStr) : [];
    
    if (savedUsers.length === 0) {
      savedUsers = [
        { id: 'u1', name: 'Dr. Sarah Wilson', email: 'sarah@mekaria.edu.ng', role: 'teacher' },
        { id: 'u2', name: 'John Admin', email: 'admin@mekaria.edu.ng', role: 'admin' },
        { id: 'u3', name: 'Alex Student', email: 'alex@mekaria.edu.ng', role: 'student' }
      ];
      localStorage.setItem('app_users', JSON.stringify(savedUsers));
    }

    setUsers(savedUsers);
    setQuizzes(JSON.parse(localStorage.getItem('quizzes') || '[]'));
  }, []);

  const deleteUser = (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      const updated = users.filter(u => u.id !== id);
      setUsers(updated);
      localStorage.setItem('app_users', JSON.stringify(updated));
    }
  };

  const toggleUserRole = (id: string) => {
    const updated = users.map(u => {
      if (u.id === id) {
        const nextRole: User['role'] = u.role === 'student' ? 'teacher' : u.role === 'teacher' ? 'admin' : 'student';
        return { ...u, role: nextRole };
      }
      return u;
    });
    setUsers(updated);
    localStorage.setItem('app_users', JSON.stringify(updated));
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col gap-8 bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xl">E</div>
          <span className="font-bold text-lg tracking-tight">EduAdmin</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          <NavItem icon={<Users className="w-5 h-5" />} label="User Management" active />
          <NavItem icon={<BookOpen className="w-5 h-5" />} label="Quizzes Active" />
          <NavItem icon={<ShieldAlert className="w-5 h-5" />} label="Security Logs" />
        </nav>

        <button 
          onClick={onLogout}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mt-auto p-2"
        >
          <LogOut className="w-5 h-5" /> Sign Out
        </button>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-4xl font-black mb-2">System Control</h1>
            <p className="text-slate-400">Total Overview of Platform Resources and Users</p>
          </div>
          <div className="flex gap-4">
             <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col min-w-[160px]">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Users</span>
                <span className="text-3xl font-black">{users.length}</span>
             </div>
             <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col min-w-[160px]">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Active Quizzes</span>
                <span className="text-3xl font-black">{quizzes.length}</span>
             </div>
          </div>
        </header>

        {/* User Management Table */}
        <section className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h2 className="text-xl font-bold">Registry</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search users..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/80 text-slate-500 text-xs font-bold uppercase tracking-widest border-b border-slate-800">
                  <th className="px-8 py-5">User Profile</th>
                  <th className="px-8 py-5">Assigned Role</th>
                  <th className="px-8 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center font-bold text-slate-300">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                           <p className="font-bold text-slate-100">{user.name}</p>
                           <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                         user.role === 'admin' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' :
                         user.role === 'teacher' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' :
                         'bg-slate-800 border-slate-700 text-slate-400'
                       }`}>
                         {user.role}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                          <span className="text-xs text-slate-400 font-medium">Active</span>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => toggleUserRole(user.id)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg transition-colors"
                            title="Promote Role"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteUser(user.id)}
                            className="bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-red-400 p-2 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`}>
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
}
