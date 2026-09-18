import * as XLSX from 'xlsx';

export const parseExcel = async (file: File): Promise<XLSX.WorkBook> => {
  const data = await file.arrayBuffer();
  return XLSX.read(data, { type: 'array' });
};

export const extractSheetData = (workbook: XLSX.WorkBook, sheetName: string): any[] => {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return [];
  return XLSX.utils.sheet_to_json(worksheet, { defval: "" });
};

export const autoMapColumns = (headers: string[], type: 'student' | 'teacher') => {
  const mapping: Record<string, string> = {};
  
  headers.forEach(h => {
    const lower = h.toLowerCase().trim();
    if (lower.includes('first') || lower === 'fname' || lower === 'given name') {
      mapping[h] = 'first_name';
    }
    else if (lower.includes('last') || lower.includes('surname') || lower === 'lname' || lower === 'family name') {
      mapping[h] = 'last_name';
    }
    else if (lower === 'name' || lower === 'full name' || lower === 'student name' || lower === 'teacher name') {
      // Standalone or full name column
      mapping[h] = 'first_name'; 
    }
    else if (lower.includes('code') || lower.includes('id') || lower === 'student no' || lower === 'staff no') {
      mapping[h] = type === 'student' ? 'student_code' : 'staff_code';
    }
    else if (type === 'student') {
      if (lower.includes('grade') || lower.includes('class')) mapping[h] = 'grade_level';
      else if (lower.includes('phone') || lower.includes('parent') || lower.includes('mobile')) mapping[h] = 'parent_phone';
      else if (lower.includes('gender') || lower.includes('sex')) mapping[h] = 'gender';
    }
    else if (type === 'teacher') {
      if (lower.includes('email') || lower.includes('mail')) mapping[h] = 'email';
      else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('contact')) mapping[h] = 'phone';
    }
  });
  
  return mapping;
};
