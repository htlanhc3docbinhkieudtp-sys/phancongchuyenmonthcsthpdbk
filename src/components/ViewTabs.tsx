import React, { useRef, useState, useEffect } from 'react';
import {
  Grid3X3,
  Users2,
  TableProperties,
  UserCheck,
  Briefcase,
  BookOpenCheck,
  FileCheck2,
  CalendarRange,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export type ActiveTabType =
  | 'official'
  | 'weekly_schedule'
  | 'weekly_log'
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
  const navRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const tabs = [
    {
      id: 'official' as ActiveTabType,
      label: 'Phân Công Chính Thức (3 Điểm Trường)',
      shortLabel: 'Phân Công Chính Thức',
      icon: FileCheck2,
    },
    {
      id: 'weekly_schedule' as ActiveTabType,
      label: 'Phân Công Tuần (TKB)',
      shortLabel: 'Phân Công Tuần',
      icon: CalendarRange,
    },
    {
      id: 'weekly_log' as ActiveTabType,
      label: 'Sổ Tiết Thực Dạy',
      shortLabel: 'Sổ Tiết Thực Dạy',
      icon: TrendingUp,
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

  const checkScroll = () => {
    if (navRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scrollNav = (direction: 'left' | 'right') => {
    if (navRef.current) {
      const amount = direction === 'left' ? -240 : 240;
      navRef.current.scrollBy({ left: amount, behavior: 'smooth' });
      setTimeout(checkScroll, 250);
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 shrink-0 sticky top-0 z-20 shadow-2xs">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 relative flex items-center">
        {/* Left Scroll Button if overflowing */}
        {canScrollLeft && (
          <button
            onClick={() => scrollNav('left')}
            className="absolute left-0 z-30 p-1 bg-white/95 hover:bg-slate-100 text-slate-700 shadow-md rounded-r-md border-y border-r border-slate-200 cursor-pointer hidden sm:flex items-center"
            title="Cuộn sang trái"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Tab List */}
        <nav
          ref={navRef}
          onScroll={checkScroll}
          className="flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none py-1 w-full"
          aria-label="Tabs"
        >
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 h-9 px-3 text-xs font-bold transition-all whitespace-nowrap rounded-lg cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="hidden lg:inline">{tab.label}</span>
                <span className="lg:hidden">{tab.shortLabel}</span>
                {tab.badge && (
                  <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white text-indigo-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Scroll Button if overflowing */}
        {canScrollRight && (
          <button
            onClick={() => scrollNav('right')}
            className="absolute right-0 z-30 p-1 bg-white/95 hover:bg-slate-100 text-slate-700 shadow-md rounded-l-md border-y border-l border-slate-200 cursor-pointer hidden sm:flex items-center"
            title="Cuộn sang phải"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
