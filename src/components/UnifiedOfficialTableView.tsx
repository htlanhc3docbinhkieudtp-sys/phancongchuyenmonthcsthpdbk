import React, { useState } from 'react';
import {
  Teacher,
  Assignment,
  ClassGroup,
  Subject,
  SchoolConfig,
  WorkloadStats
} from '../types';
import {
  Search,
  Printer,
  FileSpreadsheet,
  Building2,
  BookOpen,
  GraduationCap,
  Sparkles,
  School,
  Filter
} from 'lucide-react';
import { ThptOfficialTableView } from './ThptOfficialTableView';
import { ThcsOfficialTableView } from './ThcsOfficialTableView';

export type UnifiedCampusFilter = 'ALL' | 'THPT' | 'DBK' | 'TK';

interface UnifiedOfficialTableViewProps {
  config: SchoolConfig;
  classes: ClassGroup[];
  subjects: Subject[];
  teachers: Teacher[];
  assignments: Assignment[];
  workloads: WorkloadStats[];
  isAdmin?: boolean;
  onPromptAdminLogin?: () => void;
  onAssignTeacher: (classId: string, subjectId: string, teacherId: string) => void;
  onAssignHomeroom?: (classId: string, teacherId: string | undefined) => void;
  onUpdateClassSpecialTopic: (classId: string, topicKey: 'cd1' | 'cd2' | 'cd3', title: string, teacherId: string) => void;
  onExportExcel: () => void;
  initialCampus?: UnifiedCampusFilter;
}

export const UnifiedOfficialTableView: React.FC<UnifiedOfficialTableViewProps> = ({
  config,
  classes,
  subjects,
  teachers,
  assignments,
  workloads,
  isAdmin = false,
  onPromptAdminLogin,
  onAssignTeacher,
  onAssignHomeroom,
  onUpdateClassSpecialTopic,
  onExportExcel,
  initialCampus = 'ALL'
}) => {
  const [selectedCampus, setSelectedCampus] = useState<UnifiedCampusFilter>(initialCampus);

  return (
    <div className="space-y-4">
      {/* Unified Campus Switcher Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 print:hidden">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-white/10 rounded-lg text-indigo-300 border border-white/10">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-white">
                Bảng Phân Công Chuyên Môn Chính Thức - 3 Điểm Trường
              </h2>
              <p className="text-xs text-indigo-200/80 font-medium mt-0.5">
                Trường THCS & THPT Đốc Binh Kiều • Năm học {config.academicYear || '2026 - 2027'}
              </p>
            </div>
          </div>

          {/* 4 Campus Segmented Buttons */}
          <div className="flex flex-wrap items-center bg-white/10 p-1 rounded-xl border border-white/15 gap-1">
            <button
              onClick={() => setSelectedCampus('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCampus === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs scale-102'
                  : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Tất cả 3 Điểm Trường</span>
            </button>

            <button
              onClick={() => setSelectedCampus('THPT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCampus === 'THPT'
                  ? 'bg-indigo-600 text-white shadow-xs scale-102'
                  : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Khối THPT (14 lớp)</span>
            </button>

            <button
              onClick={() => setSelectedCampus('DBK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCampus === 'DBK'
                  ? 'bg-indigo-600 text-white shadow-xs scale-102'
                  : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>THCS Đốc Binh Kiều</span>
            </button>

            <button
              onClick={() => setSelectedCampus('TK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCampus === 'TK'
                  ? 'bg-indigo-600 text-white shadow-xs scale-102'
                  : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <School className="w-3.5 h-3.5" />
              <span>THCS Tân Kiều</span>
            </button>
          </div>
        </div>
      </div>

      {/* Render Component according to Selected Campus */}
      {selectedCampus === 'ALL' && (
        <div className="space-y-8">
          {/* Section 1: THPT */}
          <div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
              <h3 className="text-xs font-black uppercase text-indigo-900 tracking-wider">
                Phần 1: Khối Trung Học Phổ Thông (Khối 10, 11, 12)
              </h3>
            </div>
            <ThptOfficialTableView
              config={config}
              classes={classes}
              subjects={subjects}
              teachers={teachers}
              assignments={assignments}
              workloads={workloads}
              isAdmin={isAdmin}
              onPromptAdminLogin={onPromptAdminLogin}
              onAssignTeacher={onAssignTeacher}
              onUpdateClassSpecialTopic={onUpdateClassSpecialTopic}
              onExportExcel={onExportExcel}
            />
          </div>

          {/* Section 2: THCS (Cả ĐBK & TK) */}
          <div className="pt-4 border-t border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
              <h3 className="text-xs font-black uppercase text-indigo-900 tracking-wider">
                Phần 2: Khối Trung Học Cơ Sở (Điểm Đốc Binh Kiều & Tân Kiều)
              </h3>
            </div>
            <ThcsOfficialTableView
              config={config}
              classes={classes}
              subjects={subjects}
              teachers={teachers}
              assignments={assignments}
              workloads={workloads}
              isAdmin={isAdmin}
              onPromptAdminLogin={onPromptAdminLogin}
              onAssignTeacher={onAssignTeacher}
              onAssignHomeroom={onAssignHomeroom}
              onExportExcel={onExportExcel}
              campusFilter="ALL"
              onCampusFilterChange={(c) => {
                if (c === 'DBK') setSelectedCampus('DBK');
                else if (c === 'TK') setSelectedCampus('TK');
              }}
            />
          </div>
        </div>
      )}

      {selectedCampus === 'THPT' && (
        <ThptOfficialTableView
          config={config}
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          assignments={assignments}
          workloads={workloads}
          isAdmin={isAdmin}
          onPromptAdminLogin={onPromptAdminLogin}
          onAssignTeacher={onAssignTeacher}
          onUpdateClassSpecialTopic={onUpdateClassSpecialTopic}
          onExportExcel={onExportExcel}
        />
      )}

      {selectedCampus === 'DBK' && (
        <ThcsOfficialTableView
          config={config}
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          assignments={assignments}
          workloads={workloads}
          isAdmin={isAdmin}
          onPromptAdminLogin={onPromptAdminLogin}
          onAssignTeacher={onAssignTeacher}
          onAssignHomeroom={onAssignHomeroom}
          onExportExcel={onExportExcel}
          campusFilter="DBK"
          onCampusFilterChange={(c) => {
            if (c === 'ALL') setSelectedCampus('ALL');
            else if (c === 'TK') setSelectedCampus('TK');
          }}
        />
      )}

      {selectedCampus === 'TK' && (
        <ThcsOfficialTableView
          config={config}
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          assignments={assignments}
          workloads={workloads}
          isAdmin={isAdmin}
          onPromptAdminLogin={onPromptAdminLogin}
          onAssignTeacher={onAssignTeacher}
          onAssignHomeroom={onAssignHomeroom}
          onExportExcel={onExportExcel}
          campusFilter="TK"
          onCampusFilterChange={(c) => {
            if (c === 'ALL') setSelectedCampus('ALL');
            else if (c === 'DBK') setSelectedCampus('DBK');
          }}
        />
      )}
    </div>
  );
};
