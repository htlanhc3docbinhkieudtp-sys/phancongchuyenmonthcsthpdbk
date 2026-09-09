
import { buildTHPTWeek1Slots } from "./src/data/thptWeek1Timetable";
import { buildTHCSDBKWeek1Slots } from "./src/data/thcsDBKWeek1Timetable";
import { buildTHCSTKWeek1Slots } from "./src/data/thcsTKWeek1Timetable";
import { normalizeTimetableSlots } from "./src/utils/timetableHelper";

const all = normalizeTimetableSlots([
  ...buildTHPTWeek1Slots(),
  ...buildTHCSDBKWeek1Slots(),
  ...buildTHCSTKWeek1Slots()
]);

const satP5 = all.filter(s => s.dayOfWeek === 7 && s.period === 5);
console.log("Total Sat P5 slots:", satP5.length);

const wrongOnSat = satP5.filter(s => s.subjectName !== "Sinh hoạt lớp");
console.log("Wrong slots on Sat P5:", wrongOnSat.length);

const anyHdtnShl = all.filter(s => s.subjectName === "HĐTNHN (Sinh hoạt lớp)");
console.log("Slots with HDTNHN (Sinh hoạt lớp):", anyHdtnShl.length);

const satDistinctSubs = [...new Set(satP5.map(s => s.subjectName))];
console.log("Distinct subjects on Sat P5:", satDistinctSubs);

const allDistinctSubs = [...new Set(all.map(s => s.subjectName))].filter(s => s.includes("Sinh hoạt") || s.includes("HĐ"));
console.log("All distinct HD/SHL subjects:", allDistinctSubs);
