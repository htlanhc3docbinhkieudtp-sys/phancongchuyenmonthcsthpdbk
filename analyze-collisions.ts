import * as fs from 'fs';

// Let us inspect the 6 collisions reported in the database and why they occurred:
// The 6 collisions are:
// 1. Lê Ngọc Ẩn (Thứ 4 SANG Tiết 2): 10CB2 GDTC vs 7A4 HĐTN-HN
// 2. Phạm Nguyễn Văn Trường (Thứ 6 SANG Tiết 3): 10CB3 Toán vs 12CB5 GDKTPL
// 3. Phạm Nguyễn Văn Trường (Thứ 6 SANG Tiết 5): 10CB2 Toán vs 11CB4 GDKTPL
// 4. Trần Thị Cẩm (Thứ 6 CHIEU Tiết 1): 7A2 Công nghệ vs 7A6 HĐTNHN (Quy mô lớp)
// 5. Trần Thị Cẩm (Thứ 6 CHIEU Tiết 2): 7A1 Công nghệ vs 7A6 HĐTNHN (Chuyên đề)
// 6. Nguyễn Thị Kim Xoa (Thứ 7 CHIEU Tiết 2): 7A4 Ngữ văn vs 7A5 Ngữ văn

console.log("Analyzing 6 collisions...");
