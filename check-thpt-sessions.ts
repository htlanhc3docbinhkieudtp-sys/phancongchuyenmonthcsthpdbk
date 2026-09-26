import { OFFICIAL_WEEK_2_SLOTS } from './src/data/officialWeek2Timetable';

const grade10Slots = OFFICIAL_WEEK_2_SLOTS.filter(s => s.className.startsWith('10'));
const sessions = new Set(grade10Slots.map(s => s.session));
console.log('Grade 10 slot count:', grade10Slots.length);
console.log('Grade 10 sessions:', Array.from(sessions));

const nonMorningTHPT = OFFICIAL_WEEK_2_SLOTS.filter(s =>
  (s.className.startsWith('10') || s.className.startsWith('11') || s.className.startsWith('12')) && s.session !== 'SANG'
);
console.log('Non-morning THPT slots:', nonMorningTHPT.length);
