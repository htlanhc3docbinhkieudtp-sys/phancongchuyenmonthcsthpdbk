import React, { useRef, useState, useEffect } from 'react';
import {
  TableProperties,
  BookOpenCheck,
  CalendarRange,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';

export type ActiveTabType =
  | 'timetable'
  | 'weekly_schedule'
  | 'weekly_log'
  | 'summary'
  | 'curriculum';

interface ViewTabsProps {
  activeTab: ActiveTabType;
  onTabChange: (tab: ActiveTabType) => void;
  unassignedCount?: number;
  userRole?: 'guest' | 'teacher' | 'admin';
  teacherUser?: string;
  isAdmin?: boolean;
  onPromptLogin?: (reason?: string) => void;
}

export const ViewTabs: React.FC<ViewTabsProps> = ({
  activeTab,
  onTabChange,
  userRole = 'guest',
  isAdmin = false,
  onPromptLogin,
}) => {
  const navRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const allTabs: Array<{
    id: ActiveTabType;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    isPublic?: boolean;
  }> = [
    {
      id: 'timetable',
      label: 'Thời Khóa Biểu Toàn Trường',
      shortLabel: 'Thời Khóa Biểu',
      icon: CalendarRange,
      isPublic: true,
    },
    {
      id: 'weekly_log',
      label: 'Số Tiết Thực Dạy',
      shortLabel: 'Số Tiết Thực Dạy',
      icon: TrendingUp,
      isPublic: false,
    },
    {
      id: 'summary',
      label: 'Bảng Tổng Hợp Toàn Trường',
      shortLabel: 'Tổng Hợp Trường',
      icon: TableProperties,
      isPublic: false,
    },
    {
      id: 'curriculum',
      label: 'Khung Tiết GDPT 2018',
      shortLabel: 'Khung Tiết',
      icon: BookOpenCheck,
      isPublic: false,
    },
  ];

  // If guest, show only timetable or locked internal items
  const isGuest = userRole === 'guest';
  const visibleTabs = isGuest ? allTabs.filter((t) => t.isPublic) : allTabs;

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
          className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none py-1.5 w-full"
          aria-label="Tabs"
        >
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            const handleClick = () => {
              onTabChange(tab.id);
            };

            return (
              <button
                key={tab.id}
                onClick={handleClick}
                title={tab.label}
                className={`flex items-center gap-1.5 h-9 px-3.5 text-xs font-bold transition-all whitespace-nowrap rounded-lg cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}
                />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>

                {tab.badge && (
                  <span
                    className={`ml-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white text-indigo-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* If Guest: Show a locked prompt button to access internal school tabs */}
          {isGuest && (
            <button
              type="button"
              onClick={() =>
                onPromptLogin?.(
                  'Vui lòng đăng nhập với tài khoản Giáo viên hoặc Quản trị viên để xem chi tiết công việc nội bộ của nhà trường (Số tiết thực dạy, Tổng hợp, Khung tiết).'
                )
              }
              className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-slate-500 hover:text-indigo-700 bg-slate-50 hover:bg-indigo-50/70 border border-dashed border-slate-300 hover:border-indigo-300 rounded-lg cursor-pointer transition-all shrink-0 ml-1"
              title="Đăng nhập tài khoản Giáo viên để xem các mục nội bộ"
            >
              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden md:inline">Chi tiết công việc nội bộ trường (Cần đăng nhập GV)</span>
              <span className="md:hidden">Nội bộ trường (Khóa)</span>
            </button>
          )}
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
