import { describe, it, expect } from 'vitest';
import {
  castToString,
  sanitizeString,
  normalizeEmail,
  normalizePhone,
  coerceGender,
  isValidEmail,
  isStandardGradeLevel,
  autoMatchHeaders,
  processAndValidateRow,
  revalidateRemediatedRow,
  applyStrictMigrationMapping,
} from '../utils/dataIngestionEngine';

// ─── castToString ──────────────────────────────────────────────────
describe('castToString', () => {
  it('returns empty string for null/undefined', () => {
    expect(castToString(null)).toBe('');
    expect(castToString(undefined)).toBe('');
  });

  it('converts integers to string without scientific notation', () => {
    expect(castToString(42)).toBe('42');
    expect(castToString(0)).toBe('0');
    expect(castToString(-100)).toBe('-100');
    expect(castToString(9007199254740991)).toBe('9007199254740991');
  });

  it('converts very large integers using en-US locale', () => {
    // Numbers >= 1e21 would normally get scientific notation via String()
    const result = castToString(1e21);
    expect(result).not.toContain('e');
    expect(result).not.toContain('E');
  });

  it('converts floats to string', () => {
    expect(castToString(3.14)).toBe('3.14');
    expect(castToString(0.001)).toBe('0.001');
  });

  it('returns empty string for NaN and Infinity', () => {
    expect(castToString(NaN)).toBe('');
    expect(castToString(Infinity)).toBe('');
    expect(castToString(-Infinity)).toBe('');
  });

  it('converts booleans to string', () => {
    expect(castToString(true)).toBe('true');
    expect(castToString(false)).toBe('false');
  });

  it('converts strings to trimmed string, stripping control characters', () => {
    expect(castToString('  hello  ')).toBe('hello');
    expect(castToString('hello\x00world')).toBe('helloworld');
    expect(castToString('test\x07value')).toBe('testvalue');
  });
});

// ─── sanitizeString ────────────────────────────────────────────────
describe('sanitizeString', () => {
  it('delegates to castToString', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(42)).toBe('42');
  });
});

// ─── normalizeEmail ────────────────────────────────────────────────
describe('normalizeEmail', () => {
  it('lowercases and trims email', () => {
    expect(normalizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeEmail('')).toBe('');
    expect(normalizeEmail(null)).toBe('');
  });
});

// ─── normalizePhone ────────────────────────────────────────────────
describe('normalizePhone', () => {
  it('preserves + prefix', () => {
    expect(normalizePhone('+1234567890')).toBe('+1234567890');
  });

  it('formats 10-digit US numbers', () => {
    expect(normalizePhone('5551234567')).toBe('+1 (555) 123-4567');
  });

  it('formats 11-digit US numbers starting with 1', () => {
    expect(normalizePhone('15551234567')).toBe('+1 (555) 123-4567');
  });

  it('returns digits with + for international numbers', () => {
    expect(normalizePhone('+44 20 7946 0000')).toBe('+442079460000');
  });

  it('returns empty string for no digits', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone('   ')).toBe('');
  });

  it('handles Excel-style number phone values', () => {
    expect(normalizePhone(5551234567)).toBe('+1 (555) 123-4567');
  });
});

// ─── coerceGender ──────────────────────────────────────────────────
describe('coerceGender', () => {
  it('maps common male aliases', () => {
    expect(coerceGender('male').canonical).toBe('Male');
    expect(coerceGender('M').canonical).toBe('Male');
    expect(coerceGender('boy').canonical).toBe('Male');
    expect(coerceGender('1').canonical).toBe('Male');
  });

  it('maps common female aliases', () => {
    expect(coerceGender('female').canonical).toBe('Female');
    expect(coerceGender('F').canonical).toBe('Female');
    expect(coerceGender('girl').canonical).toBe('Female');
    expect(coerceGender('2').canonical).toBe('Female');
  });

  it('maps other gender values', () => {
    expect(coerceGender('other').canonical).toBe('Other');
    expect(coerceGender('non-binary').canonical).toBe('Other');
    expect(coerceGender('nb').canonical).toBe('Other');
  });

  it('maps prefer not to say', () => {
    expect(coerceGender('prefer not to say').canonical).toBe('Prefer not to say');
    expect(coerceGender('unspecified').canonical).toBe('Prefer not to say');
    expect(coerceGender('n/a').canonical).toBe('Prefer not to say');
  });

  it('returns Prefer not to say for empty input', () => {
    expect(coerceGender('').canonical).toBe('Prefer not to say');
    expect(coerceGender(null).canonical).toBe('Prefer not to say');
  });

  it('marks autoCoerced correctly', () => {
    expect(coerceGender('male').autoCoerced).toBe(false); // exact match
    expect(coerceGender('M').autoCoerced).toBe(true); // not exact
    expect(coerceGender('boy').autoCoerced).toBe(true);
  });

  it('handles capitalized input', () => {
    expect(coerceGender('Male').canonical).toBe('Male');
    expect(coerceGender('Female').canonical).toBe('Female');
  });
});

// ─── isValidEmail ──────────────────────────────────────────────────
describe('isValidEmail', () => {
  it('validates correct emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('admin@school.edu')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
  });
});

// ─── isStandardGradeLevel ──────────────────────────────────────────
describe('isStandardGradeLevel', () => {
  it('accepts standard grade formats', () => {
    expect(isStandardGradeLevel('Grade 9')).toBe(true);
    expect(isStandardGradeLevel('grade 12')).toBe(true);
    expect(isStandardGradeLevel('10th')).toBe(true);
    expect(isStandardGradeLevel('1')).toBe(true);
    expect(isStandardGradeLevel('Year 1')).toBe(true);
    expect(isStandardGradeLevel('JSS1')).toBe(true);
    expect(isStandardGradeLevel('SS2')).toBe(true);
  });

  it('rejects non-standard grades', () => {
    expect(isStandardGradeLevel('Custom Elective')).toBe(false);
    expect(isStandardGradeLevel('')).toBe(false);
  });
});

// ─── autoMatchHeaders ──────────────────────────────────────────────
describe('autoMatchHeaders', () => {
  it('maps student headers correctly', () => {
    const headers = ['Student ID', 'First Name', 'Last Name', 'Gender', 'Grade Level', 'Parent Phone'];
    const mapping = autoMatchHeaders(headers, 'students');

    expect(mapping['Student ID']).toBe('student_code');
    expect(mapping['First Name']).toBe('first_name');
    expect(mapping['Last Name']).toBe('last_name');
    expect(mapping['Gender']).toBe('gender');
    expect(mapping['Grade Level']).toBe('grade_level');
    expect(mapping['Parent Phone']).toBe('parent_phone');
  });

  it('maps teacher headers correctly', () => {
    const headers = ['Staff Code', 'First Name', 'Last Name', 'Email', 'Phone'];
    const mapping = autoMatchHeaders(headers, 'teachers');

    expect(mapping['Staff Code']).toBe('staff_code');
    expect(mapping['First Name']).toBe('first_name');
    expect(mapping['Last Name']).toBe('last_name');
    expect(mapping['Email']).toBe('email');
    expect(mapping['Phone']).toBe('phone');
  });

  it('handles aliased headers', () => {
    const headers = ['adm no', 'fname', 'lname', 'sex', 'class', 'telephone'];
    const mapping = autoMatchHeaders(headers, 'students');

    expect(mapping['adm no']).toBe('student_code');
    expect(mapping['fname']).toBe('first_name');
    expect(mapping['lname']).toBe('last_name');
    expect(mapping['sex']).toBe('gender');
    expect(mapping['class']).toBe('grade_level');
    expect(mapping['telephone']).toBe('parent_phone');
  });

  it('unmapped headers get empty string', () => {
    const headers = ['Random Column'];
    const mapping = autoMatchHeaders(headers, 'students');
    expect(mapping['Random Column']).toBe('');
  });
});

// ─── processAndValidateRow (students) ──────────────────────────────
describe('processAndValidateRow - students', () => {
  const studentMapping: Record<string, string> = {
    'ID': 'student_code',
    'Name': 'full_name',
    'Gender': 'gender',
    'Grade': 'grade_level',
    'Phone': 'parent_phone',
  };

  it('validates a correct student row', () => {
    const row = { 'ID': 'STU-001', 'Name': 'John Smith', 'Gender': 'Male', 'Grade': 'Grade 9', 'Phone': '+15551234567' };
    const result = processAndValidateRow(row, 1, studentMapping, 'students');
    expect(result.errors).toHaveLength(0);
    // May have warnings from auto-coercion (name splitting, grade formatting) which is expected
    expect(result.mappedData.student_code).toBe('STU-001');
    expect(result.mappedData.first_name).toBe('John');
    expect(result.mappedData.last_name).toBe('Smith');
    expect(result.mappedData.gender).toBe('Male');
  });

  it('auto-assigns student_code when missing', () => {
    const row = { 'Name': 'Jane Doe', 'Gender': 'Female', 'Grade': '10' };
    const result = processAndValidateRow(row, 5, studentMapping, 'students');
    expect(result.mappedData.student_code).toBe('STU-0005');
  });

  it('splits full_name into first_name and last_name', () => {
    const row = { 'ID': 'STU-002', 'Name': 'Alice Johnson', 'Gender': 'Female', 'Grade': 'Grade 11' };
    const result = processAndValidateRow(row, 1, studentMapping, 'students');
    expect(result.mappedData.first_name).toBe('Alice');
    expect(result.mappedData.last_name).toBe('Johnson');
  });

  it('coerces gender aliases', () => {
    const row = { 'ID': 'STU-003', 'Name': 'Bob Brown', 'Gender': 'M', 'Grade': 'Grade 9' };
    const result = processAndValidateRow(row, 1, studentMapping, 'students');
    expect(result.mappedData.gender).toBe('Male');
    expect(result.warnings.some(w => w.includes('Gender coerced'))).toBe(true);
  });

  it('defaults grade_level to Unassigned when missing', () => {
    const row = { 'ID': 'STU-004', 'Name': 'Sam Wilson', 'Gender': 'Male' };
    const result = processAndValidateRow(row, 1, studentMapping, 'students');
    expect(result.mappedData.grade_level).toBe('Unassigned');
    expect(result.warnings.some(w => w.includes('Grade Level was missing'))).toBe(true);
  });

  it('formats numeric grade levels', () => {
    const row = { 'ID': 'STU-005', 'Name': 'Pat Lee', 'Gender': 'Female', 'Grade': '9' };
    const result = processAndValidateRow(row, 1, studentMapping, 'students');
    expect(result.mappedData.grade_level).toBe('Grade 9');
  });

  it('marks fatal when name is missing', () => {
    const row = { 'ID': 'STU-006', 'Gender': 'Male', 'Grade': 'Grade 9' };
    const result = processAndValidateRow(row, 1, studentMapping, 'students');
    expect(result.status).toBe('fatal');
    expect(result.errors.some(e => e.includes('Missing required student name'))).toBe(true);
  });

  it('warns when parent_phone is empty', () => {
    const row = { 'ID': 'STU-007', 'Name': 'Kim Park', 'Gender': 'Female', 'Grade': 'Grade 10' };
    const result = processAndValidateRow(row, 1, studentMapping, 'students');
    expect(result.warnings.some(w => w.includes('parent contact phone is empty'))).toBe(true);
  });
});

// ─── processAndValidateRow (teachers) ──────────────────────────────
describe('processAndValidateRow - teachers', () => {
  const teacherMapping: Record<string, string> = {
    'Code': 'staff_code',
    'Name': 'full_name',
    'Email': 'email',
    'Phone': 'phone',
  };

  it('validates a correct teacher row', () => {
    const row = { 'Code': 'TCH-001', 'Name': 'Dr. Smith', 'Email': 'smith@school.edu', 'Phone': '+15551234567' };
    const result = processAndValidateRow(row, 1, teacherMapping, 'teachers');
    expect(result.errors).toHaveLength(0);
    // May have warnings from auto-coercion (name splitting) which is expected
    expect(result.mappedData.staff_code).toBe('TCH-001');
    expect(result.mappedData.email).toBe('smith@school.edu');
  });

  it('auto-assigns staff_code when missing', () => {
    const row = { 'Name': 'Ms. Jones', 'Email': 'jones@school.edu' };
    const result = processAndValidateRow(row, 3, teacherMapping, 'teachers');
    expect(result.mappedData.staff_code).toBe('TCH-0003');
  });

  it('marks fatal when email is missing', () => {
    const row = { 'Code': 'TCH-002', 'Name': 'Mr. Lee' };
    const result = processAndValidateRow(row, 1, teacherMapping, 'teachers');
    expect(result.status).toBe('fatal');
    expect(result.errors.some(e => e.includes('Missing required teacher email'))).toBe(true);
  });

  it('marks fatal when email is invalid', () => {
    const row = { 'Code': 'TCH-003', 'Name': 'Mrs. Chen', 'Email': 'not-an-email' };
    const result = processAndValidateRow(row, 1, teacherMapping, 'teachers');
    expect(result.status).toBe('fatal');
    expect(result.errors.some(e => e.includes('Invalid email syntax'))).toBe(true);
  });

  it('warns when phone is empty', () => {
    const row = { 'Code': 'TCH-004', 'Name': 'Dr. Adams', 'Email': 'adams@school.edu' };
    const result = processAndValidateRow(row, 1, teacherMapping, 'teachers');
    expect(result.warnings.some(w => w.includes('teacher contact phone is empty'))).toBe(true);
  });
});

// ─── revalidateRemediatedRow ───────────────────────────────────────
describe('revalidateRemediatedRow', () => {
  it('updates full_name and splits into first/last', () => {
    const current = { first_name: 'Old', last_name: 'Name', full_name: 'Old Name', gender: 'Male', grade_level: 'Grade 9', student_code: 'STU-001' };
    const result = revalidateRemediatedRow(current, 'full_name', 'New Person', 'students', 1);
    expect(result.mappedData.first_name).toBe('New');
    expect(result.mappedData.last_name).toBe('Person');
    expect(result.mappedData.full_name).toBe('New Person');
  });

  it('updates full_name when first_name changes', () => {
    const current = { first_name: 'Alice', last_name: 'Smith', full_name: 'Alice Smith', gender: 'Female', grade_level: 'Grade 10', student_code: 'STU-002' };
    const result = revalidateRemediatedRow(current, 'first_name', 'Bob', 'students', 1);
    expect(result.mappedData.full_name).toBe('Bob Smith');
  });
});

// ─── applyStrictMigrationMapping ───────────────────────────────────
describe('applyStrictMigrationMapping', () => {
  it('handles single legal name (first only)', () => {
    const rawRow = { 'Name': 'Madonna' };
    const mapping = { 'Name': 'full_name' };
    const result = applyStrictMigrationMapping(rawRow, mapping, 'students', 1);
    // fullName is already 'Madonna' from the mapping, so it's not overwritten
    expect(result.mappedData.full_name).toBe('Madonna');
    // first_name and last_name are split/assigned from full_name
    expect(result.mappedData.first_name).toBe('Madonna');
    expect(result.mappedData.last_name).toBe('Madonna');
  });

  it('handles teacher name inference from email', () => {
    const rawRow = { 'Email': 'john.smith@school.edu' };
    const mapping = { 'Email': 'email' };
    const result = applyStrictMigrationMapping(rawRow, mapping, 'teachers', 1);
    expect(result.mappedData.first_name).toBe('John');
    expect(result.mappedData.last_name).toBe('Smith');
    expect(result.mappedData.full_name).toBe('John Smith');
  });
});
