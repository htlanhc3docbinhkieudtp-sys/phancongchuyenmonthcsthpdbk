import React from 'react';
import { ConcurrentDutiesView } from './ConcurrentDutiesView';
import {
  Teacher,
  ClassGroup,
  Department,
  SchoolConfig,
  WorkloadStats
} from '../types';

interface HomeroomViewProps {
  classes: ClassGroup[];
  teachers: Teacher[];
  departments: Department[];
  workloads: WorkloadStats[];
  config?: SchoolConfig;
  isAdmin?: boolean;
  onPromptAdminLogin?: () => void;
  onAssignHomeroom?: (classId: string, teacherId: string | undefined) => void;
}

export const HomeroomView: React.FC<HomeroomViewProps> = (props) => {
  const fallbackConfig: SchoolConfig = props.config || {
    schoolName: 'TRƯỜNG THCS VÀ THPT ĐỐC BINH KIỀU',
    subTitle: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ĐỒNG THÁP',
    academicYear: '2026 - 2027',
    semester: 'HK1',
    principalName: 'Lê Thanh Cường',
    vicePrincipalName: 'Nguyễn Minh Trí',
    standardThptPeriods: 17,
    standardThcsPeriods: 19,
    homeroomReduction: 4,
  };

  return (
    <ConcurrentDutiesView
      teachers={props.teachers}
      classes={props.classes}
      departments={props.departments}
      config={fallbackConfig}
      workloads={props.workloads}
    />
  );
};
