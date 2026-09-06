import fs from 'fs';
import { initialClasses, initialSubjects } from '../src/data/initialData';
import { officialStaffList } from '../src/data/schoolStaffData';
import { parseVietSchoolTimetable } from '../src/utils/vietSchoolImportHelper';

const rawMarkdown = fs.readFileSync('scripts/user_raw_tkb.md', 'utf8');

console.log('Testing current parseVietSchoolTimetable with raw markdown:');
const result = parseVietSchoolTimetable(rawMarkdown, initialClasses, initialSubjects, officialStaffList);
console.log('Detected format:', result.detectedFormat);
console.log('Success count:', result.successCount);
console.log('Errors:', result.errors);
