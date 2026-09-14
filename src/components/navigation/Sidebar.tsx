import React from 'react';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import VyrenLogo from '../brand/VyrenLogo';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Map,
  Bot,
  User,
  PenTool,
  TrendingUp,
  ShieldCheck,
  BookOpen,
  Users,
  Settings,
  LogOut,
  Building2,
} from 'lucide-react';

interface SidebarProps {
  role?: 'learner' | 'trainer' | 'admin';
}

export const Sidebar: React.FC<SidebarProps> = ({ role = 'learner' }) => {
  const { logout } = useAuth();

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 ${
      isActive
        ? 'bg-primary-navy text-on-primary shadow-xs font-bold'
        : 'text-text-secondary hover:text-text-primary hover:bg-surface-alt'
    }`;

  const getIconClass = (isActive: boolean) =>
    `w-4 h-4 shrink-0 transition-transform duration-150 ${
      isActive ? 'text-on-primary scale-105' : 'text-text-secondary group-hover:text-text-primary'
    }`;

  return (
    <aside className="w-64 bg-surface border-r border-border min-h-screen flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="px-2 pt-1">
          <VyrenLogo size="sm" />
          <div className="mt-2 text-[10px] font-mono tracking-wider text-text-secondary/70 uppercase">
            Competency Intelligence Platform
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {role === 'learner' && (
            <>
              <NavLink to={ROUTES.LEARNER.DASHBOARD} className={getNavLinkClass}>
                {({ isActive }) => (
                  <>
                    <LayoutDashboard className={getIconClass(isActive)} />
                    <span>Dashboard</span>
                  </>
                )}
              </NavLink>
              <NavLink to={ROUTES.LEARNER.LEARNING_PATH} className={getNavLinkClass}>
                {({ isActive }) => (
                  <>
                    <Map className={getIconClass(isActive)} />
                    <span>Learning Path</span>
                  </>
                )}
              </NavLink>
              <NavLink to={ROUTES.LEARNER.ASSISTANT} className={getNavLinkClass}>
                {({ isActive }) => (
                  <>
                    <Bot className={getIconClass(isActive)} />
                    <span>AI Assistant</span>
                  </>
                )}
              </NavLink>
              <NavLink to={ROUTES.LEARNER.PROFILE} className={getNavLinkClass}>
                {({ isActive }) => (
                  <>
                    <User className={getIconClass(isActive)} />
                    <span>Official Profile</span>
                  </>
                )}
              </NavLink>
            </>
          )}

          {role === 'trainer' && (
            <>
              <NavLink to={ROUTES.TRAINER.STUDIO} className={getNavLinkClass}>
                {({ isActive }) => (
                  <>
                    <PenTool className={getIconClass(isActive)} />
                    <span>Question Studio</span>
                  </>
                )}
              </NavLink>
              <NavLink to={ROUTES.TRAINER.ANALYTICS} className={getNavLinkClass}>
                {({ isActive }) => (
                  <>
                    <TrendingUp className={getIconClass(isActive)} />
                    <span>Cohort Analytics</span>
                  </>
                )}
              </NavLink>
            </>
          )}

          {role === 'admin' && (
            <>
              <NavLink to={ROUTES.ADMIN.DASHBOARD} className={getNavLinkClass}>
                {({ isActive }) => (
                  <>
                    <ShieldCheck className={getIconClass(isActive)} />
                    <span>System Overview</span>
                  </>
                )}
              </NavLink>
              <NavLink to={ROUTES.ADMIN.TRAINING} className={getNavLinkClass}>
                {({ isActive }) => (
                  <>
                    <BookOpen className={getIconClass(isActive)} />
                    <span>Training Programs</span>
                  </>
                )}
              </NavLink>
              <NavLink to={ROUTES.ADMIN.LEARNERS} className={getNavLinkClass}>
                {({ isActive }) => (
                  <>
                    <Users className={getIconClass(isActive)} />
                    <span>Learner Directory</span>
                  </>
                )}
              </NavLink>
              <NavLink to={ROUTES.ADMIN.SETTINGS} className={getNavLinkClass}>
                {({ isActive }) => (
                  <>
                    <Settings className={getIconClass(isActive)} />
                    <span>System Settings</span>
                  </>
                )}
              </NavLink>
            </>
          )}
        </nav>
      </div>

      {/* Sidebar Footer: Government of India & NSSTA Affiliation */}
      <div className="pt-4 border-t border-border space-y-3">
        <div className="px-2 py-2 rounded-xl bg-surface-alt/70 border border-border/80 text-[11px] space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-text-primary text-[11px]">
            <Building2 className="w-3.5 h-3.5 text-primary-navy shrink-0" />
            <span>NSSTA / MoSPI</span>
          </div>
          <p className="text-[10px] text-text-secondary leading-tight">
            Capacity Building Commission • iGOT Karmayogi Aligned
          </p>
        </div>

        <button
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-red-600 hover:bg-red-500/10 border border-border transition-colors duration-150"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Switch Persona / Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
