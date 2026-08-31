import React from 'react';
import {
  Grid3X3,
  Users2,
  TableProperties,
  UserCheck,
  Briefcase,
  BookOpenCheck,
  FileCheck2,
  GraduationCap
} from 'lucide-react';

export type ActiveTabType =
  | 'thpt_official'
  | 'thcs_official'
  | 'matrix'
  | 'workbench'
  | 'summary'
  | 'homeroom'
  | 'teachers'
  | 'curriculum';

interface ViewTabsProps {
  activeTab: ActiveTabType;
  onTabChange: (tab: ActiveTabType) => void;
  unassignedCount: number;
}

export const ViewTabs: React.FC<ViewTabsProps> = ({
  activeTab,
  onTabChange,
  unassignedCount,
}) => {
  const tabs = [
    {
      id: 'thpt_official' as ActiveTabType,
      label: 'Phân Công THPT (Chính Thức)',
      shortLabel: 'Phân Công THPT',
      icon: FileCheck2,
    },
    {
      id: 'thcs_official' as ActiveTabType,
      label: 'Phân Công THCS (Chính Thức)',
      shortLabel: 'Phân Công THCS',
      icon: GraduationCap,
    },
    {
      id: 'matrix' as ActiveTabType,
      label: 'Ma Trận Kéo Thả (Lớp - Môn)',
      shortLabel: 'Kéo Thả Lớp - Môn',
      icon: Grid3X3,
      badge: unassignedCount > 0 ? `${unassignedCount} chưa gán` : undefined,
    },
    {
      id: 'workbench' as ActiveTabType,
      label: 'Bàn Làm Việc Giáo Viên',
      shortLabel: 'Theo Giáo Viên',
      icon: Users2,
    },
    {
      id: 'summary' as ActiveTabType,
      label: 'Bảng Tổng Hợp Toàn Trường',
      shortLabel: 'Tổng Hợp Trường',
      icon: TableProperties,
    },
    {
      id: 'homeroom' as ActiveTabType,
      label: 'Phân Công Chủ Nhiệm',
      shortLabel: 'GV Chủ Nhiệm',
      icon: UserCheck,
    },
    {
      id: 'teachers' as ActiveTabType,
      label: 'Giáo Viên & Định Mức',
      shortLabel: 'Hồ Sơ GV',
      icon: Briefcase,
    },
    {
      id: 'curriculum' as ActiveTabType,
      label: 'Khung Tiết GDPT 2018',
      shortLabel: 'Khung Tiết',
      icon: BookOpenCheck,
    },
  ];

  return (
    <div className="bg-white border-b border-slate-200 shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto scrollbar-none" aria-label="Tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 h-10 px-3 text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-b-2 ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="hidden md:inline">{tab.label}</span>
                <span className="md:hidden">{tab.shortLabel}</span>
                {tab.badge && (
                  <span className="ml-1 text-[10px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
