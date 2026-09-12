import { initialClasses, initialTeachers, initialSubjects } from './src/data/initialData';
import { parseTeacherCentricFromMarkdown } from './src/utils/vietSchoolImportHelper';
import * as fs from 'fs';

// Let's read the user input from a file or directly test it.
console.log('Classes count:', initialClasses.length);
console.log('Teachers count:', initialTeachers.length);
