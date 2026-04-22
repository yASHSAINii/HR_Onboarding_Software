import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import myImage from './exit.png';
import dash from './dashb.png';
import hosp from './hospital.png';
import logoImg from './human.png';

const LayoutCandidate = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const fullName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'User';

  return (
    <div className="flex min-h-screen">
      {/* Sidebar – exact original .sidebar */}
      <aside className="w-[260px] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] flex flex-col z-[100]">
        
        {/* Logo – original .logo: font-size 2rem, line-height 2rem, Bowlby One SC */}
        <div className="p-6 flex items-center gap-3 border-b border-[#E5E7EB] font-['Bowlby_One_SC',cursive] pl-8 pr-3 leading-8">
          <img src={logoImg} height={35} alt="logo" className="h-[35px] w-auto" />
          <h2>Day <span className="text-[#4F46E5]">Zero</span></h2>
        </div>

        {/* Navigation – original .nav-item */}
        <nav className="flex-1 py-5">
          <NavLink 
            to="/candidate/dashboard" 
            className={({ isActive }) => `
              flex items-center gap-3 py-[14px] px-6 text-[#6B7280] transition-all duration-300 border-l-[3px] border-transparent
              hover:bg-[#EEF2FF] hover:text-[#4F46E5]
              ${isActive ? 'bg-[#EEF2FF] text-[#4F46E5] border-l-[#4F46E5]' : ''}
            `}
          >
            <img src={dash} height={18} alt="dashboard" className="h-[18px] w-auto" /> Dashboard
          </NavLink>
          <NavLink 
            to="/candidate/HospitalList" 
            className={({ isActive }) => `
              flex items-center gap-3 py-[14px] px-6 text-[#6B7280] transition-all duration-300 border-l-[3px] border-transparent
              hover:bg-[#EEF2FF] hover:text-[#4F46E5]
              ${isActive ? 'bg-[#EEF2FF] text-[#4F46E5] border-l-[#4F46E5]' : ''}
            `}
          >
            <img src={hosp} height={18} alt="hospital" className="h-[18px] w-auto" /> Hospital List
          </NavLink>
        </nav>

        {/* User profile – original .user-profile (no chevron for candidate) */}
        <div className="p-5 flex items-center gap-3 border-t border-[#E5E7EB]">
          <img
            className="w-10 h-10 rounded-full"
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=9F1239&color=fff`}
            alt="User"
          />
          <div className="flex-1">
            <h4 className="text-sm font-semibold">{fullName}</h4>
            <p className="text-xs text-[#6B7280]">Candidate</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="header-left"></div>
          <div className="flex items-center gap-5">
            {/* Logout button – original .btn-secondary with all:unset behaviour */}
            <button 
              onClick={handleLogout} 
              className="
                bg-[#9F1239] text-white border border-[#E5E7EB] 
                py-1.5 px-2.5 rounded-[12px] font-semibold text-base
                transition-all duration-300 hover:bg-[#6c0d28]
                cursor-pointer outline-none ring-0
              "
            >
              <div className='flex text-sm'>
                <span className='m-1.5'><img src={myImage} height={18} alt="logout" className="h-[18px] w-auto" /></span>
                <span className='pt-1 pl-0.5'>Logout</span>
              </div>
            </button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
};

export default LayoutCandidate;