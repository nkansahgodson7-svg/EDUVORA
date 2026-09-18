/**
 * Core Data Ingestion & Sanitization Engine
 * Handles client-side sanitization, enum coercion, dynamic column matching,
 * row validation (Fatal vs Warning vs Valid), and error export.
 */

export type IngestionEntityType = 'students' | 'teachers';
export type CanonicalGender = 'Male' | 'Female' | 'Other' | 'Prefer not to say';

export interface DatabaseStudentRecord {
  student_code: string;
  first_name: string;
  last_name: string;
  gender: CanonicalGender;
  grade_level: string;
  parent_phone: string | null;
  full_name: string;
}

export interface DatabaseTeacherRecord {
  staff_code: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  full_name: string;
}

export interface FieldDefinition {
  key: string;
  label: string;
  required: boolean;
  type: 'text' | 'email' | 'phone' | 'enum';
  description: string;
  enumValues?: string[];
  aliases: string[];
}

export const STUDENT_FIELDS: FieldDefinition[] = [
  {
    key: 'student_code',
    label: 'Student Code / ID',
    required: true,
    type: 'text',
    description: 'Unique student identification code (e.g., STU-10023)',
    aliases: ['student_code', 'student code', 'student_id', 'student id', 'studentid', 'admission_no', 'admission number', 'admission_number', 'admission no', 'adm no', 'adm_no', 'reg no', 'reg_no', 'matric no', 'matric_no', 'roll no', 'roll_no', 'student no', 'student_number', 'std_id', 'sid', 'index number', 'student registration number', 'id', 'code'],
  },
  {
    key: 'first_name',
    label: 'First Name',
    required: false,
    type: 'text',
    description: 'Student legal given name',
    aliases: ['first_name', 'first name', 'firstname', 'given name', 'forename', 'learner first name', 'student first name', 'fname'],
  },
  {
    key: 'last_name',
    label: 'Last Name',
    required: false,
    type: 'text',
    description: 'Student surname or family name',
    aliases: ['last_name', 'last name', 'lastname', 'surname', 'family name', 'learner last name', 'student last name', 'lname'],
  },
  {
    key: 'full_name',
    label: 'Full Name',
    required: false,
    type: 'text',
    description: 'Student full legal name (e.g., Alexander Smith)',
    aliases: ['full_name', 'full name', 'fullname', 'student name', 'learner name', 'student_name', 'pupil name', 'candidate name', 'names', 'name'],
  },
  {
    key: 'gender',
    label: 'Gender',
    required: false,
    type: 'enum',
    description: 'Canonical gender (Male, Female, Other, Prefer not to say)',
    enumValues: ['Male', 'Female', 'Other', 'Prefer not to say'],
    aliases: ['gender', 'sex', 'gender identity', 'm/f', 'gender_identity'],
  },
  {
    key: 'grade_level',
    label: 'Grade Level',
    required: false,
    type: 'text',
    description: 'Academic grade/class level (e.g. Grade 9, 10th, Year 1)',
    aliases: ['grade_level', 'grade level', 'grade', 'class', 'class id', 'class_id', 'classroom', 'grade_id', 'class/grade', 'form', 'year', 'level', 'standard', 'current grade', 'arm'],
  },
  {
    key: 'parent_phone',
    label: 'Parent Phone',
    required: false,
    type: 'phone',
    description: 'Emergency/parent contact telephone number',
    aliases: ['parent_phone', 'parent phone', 'guardian_phone', 'guardian phone', 'parent mobile', 'guardian mobile', 'parent contact', 'contact number', 'phone number', 'telephone', 'mobile', 'cell', 'phone', 'tel', 'phone_number'],
  },
];

export const TEACHER_FIELDS: FieldDefinition[] = [
  {
    key: 'staff_code',
    label: 'Staff Code / ID',
    required: true,
    type: 'text',
    description: 'Unique teacher/staff identification code (e.g., TCH-041)',
    aliases: ['staff_code', 'staff code', 'teacher_code', 'teacher code', 'employee_id', 'employee id', 'staff id', 'teacher id', 'emp id', 'staff_no', 'staff number', 'staffid', 'id', 'code'],
  },
  {
    key: 'first_name',
    label: 'First Name',
    required: false,
    type: 'text',
    description: 'Teacher legal given name',
    aliases: ['first_name', 'first name', 'firstname', 'given name', 'staff first name', 'teacher first name', 'fname'],
  },
  {
    key: 'last_name',
    label: 'Last Name',
    required: false,
    type: 'text',
    description: 'Teacher surname or family name',
    aliases: ['last_name', 'last name', 'lastname', 'surname', 'family name', 'staff last name', 'teacher last name', 'lname'],
  },
  {
    key: 'full_name',
    label: 'Full Name',
    required: false,
    type: 'text',
    description: 'Teacher full legal name',
    aliases: ['full_name', 'full name', 'fullname', 'teacher name', 'staff name', 'faculty name', 'employee name', 'names', 'name'],
  },
  {
    key: 'email',
    label: 'Email Address',
    required: true,
    type: 'email',
    description: 'Institutional or personal staff email address',
    aliases: ['email', 'email address', 'email_address', 'mail', 'work email', 'official email', 'contact email', 'e-mail'],
  },
  {
    key: 'phone',
    label: 'Phone Number',
    required: false,
    type: 'phone',
    description: 'Staff contact telephone number',
    aliases: ['phone', 'phone number', 'mobile', 'contact', 'telephone', 'cell', 'work phone', 'mobile phone'],
  },
];

// ---------------------------------------------------------------------------
// Sanitization & Normalization Helpers
// ---------------------------------------------------------------------------

/**
 * Safely casts unknown primitive / Excel values to trimmed strings.
 * Handles integer/float formatting, prevents scientific notation, and strips control characters.
 */
export const castToString = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) return '';
    if (Number.isInteger(val)) {
      return val.toLocaleString('fullwide', { useGrouping: false });
    }
    return String(val);
  }
  if (typeof val === 'boolean') return String(val);
  return String(val)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
};

/**
 * Strips leading/trailing whitespace recursively from strings
 */
export const sanitizeString = (val: any): string => {
  return castToString(val);
};

/**
 * Normalizes email address to lower-case with whitespace trimmed
 */
export const normalizeEmail = (val: any): string => {
  return castToString(val).toLowerCase();
};

/**
 * Normalizes phone numbers:
 * Strips non-digit chars (except leading +), handles Excel numbers without exponential notation
 */
export const normalizePhone = (val: any): string => {
  const str = castToString(val);
  if (!str) return '';
  
  const hasPlus = str.startsWith('+');
  const digits = str.replace(/\D/g, '');
  if (!digits) return '';

  if (hasPlus) {
    return `+${digits}`;
  }
  // Standard 10-digit US/North American or international format
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return digits.length >= 7 ? `+${digits}` : digits;
};

/**
 * Coerces gender aliases to canonical Enum defined in migration schema:
 * CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say'))
 */
export const coerceGender = (val: any): { canonical: CanonicalGender; autoCoerced: boolean } => {
  const raw = castToString(val).toLowerCase();
  if (!raw) return { canonical: 'Prefer not to say', autoCoerced: false };

  if (['m', 'male', 'boy', 'man', 'masculine', '1'].includes(raw)) {
    return { canonical: 'Male', autoCoerced: raw !== 'male' };
  }
  if (['f', 'female', 'girl', 'woman', 'feminine', '2'].includes(raw)) {
    return { canonical: 'Female', autoCoerced: raw !== 'female' };
  }
  if (['other', 'non-binary', 'nb', 'o', 'diverse'].includes(raw)) {
    return { canonical: 'Other', autoCoerced: true };
  }
  if (['prefer not to say', 'pnts', 'unspecified', 'not specified', 'n/a', 'none', 'unknown'].includes(raw)) {
    return { canonical: 'Prefer not to say', autoCoerced: raw !== 'prefer not to say' };
  }

  // Capitalize first letter fallback if it matches a valid canonical choice
  const capital = (raw.charAt(0).toUpperCase() + raw.slice(1)) as any;
  if (['Male', 'Female', 'Other', 'Prefer not to say'].includes(capital)) {
    return { canonical: capital, autoCoerced: false };
  }

  // Guaranteed safe fallback satisfying DB CHECK constraint
  return { canonical: 'Prefer not to say', autoCoerced: true };
};

export const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const KNOWN_GRADES = [
  'kindergarten', 'k', 'pre-k', 'nursery', 'reception',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
  'grade 1', 'grade 2', 'grade 3', 'grade 4', 'grade 5', 'grade 6', 
  'grade 7', 'grade 8', 'grade 9', 'grade 10', 'grade 11', 'grade 12',
  '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th',
  'year 1', 'year 2', 'year 3', 'year 4', 'year 5', 'year 6', 'year 7', 'year 8', 'year 9', 'year 10', 'year 11', 'year 12',
  'ss1', 'ss2', 'ss3', 'jss1', 'jss2', 'jss3'
];

export const isStandardGradeLevel = (grade: string): boolean => {
  if (!grade) return false;
  const clean = grade.toLowerCase().trim();
  return KNOWN_GRADES.includes(clean) || /^grade\s*\d{1,2}$/i.test(clean) || /^\d{1,2}(th|st|nd|rd)?(\s*grade)?$/i.test(clean);
};

// ---------------------------------------------------------------------------
// Auto-Mapping Engine (Multi-Pass Matching Without Column Clobbering)
// ---------------------------------------------------------------------------

export const autoMatchHeaders = (
  rawHeaders: string[],
  entityType: IngestionEntityType
): Record<string, string> => {
  const fields = entityType === 'students' ? STUDENT_FIELDS : TEACHER_FIELDS;
  const mapping: Record<string, string> = {};
  const mappedTargetKeys = new Set<string>();

  const cleanItems = rawHeaders.map((h) => ({
    raw: h,
    clean: h.toLowerCase().trim().replace(/[-_]/g, ' '),
  }));

  // Pass 1: Direct exact match against field key or label
  cleanItems.forEach(({ raw, clean }) => {
    if (mapping[raw]) return;
    const match = fields.find((f) => {
      if (mappedTargetKeys.has(f.key)) return false;
      const fKeyClean = f.key.toLowerCase().replace(/[-_]/g, ' ');
      const fLabelClean = f.label.toLowerCase().replace(/[-_]/g, ' ');
      return clean === fKeyClean || clean === fLabelClean;
    });
    if (match) {
      mapping[raw] = match.key;
      mappedTargetKeys.add(match.key);
    }
  });

  // Pass 2: Direct exact match against aliases
  cleanItems.forEach(({ raw, clean }) => {
    if (mapping[raw]) return;
    const match = fields.find((f) => {
      if (mappedTargetKeys.has(f.key)) return false;
      return f.aliases.some((alias) => clean === alias);
    });
    if (match) {
      mapping[raw] = match.key;
      mappedTargetKeys.add(match.key);
    }
  });

  // Pass 3: Word boundary matching on specific multi-word aliases
  // (Excludes generic short words like 'id', 'code', 'name' to prevent false positive collisions)
  cleanItems.forEach(({ raw, clean }) => {
    if (mapping[raw]) return;
    const match = fields.find((f) => {
      if (mappedTargetKeys.has(f.key)) return false;
      return f.aliases.some((alias) => {
        if (['id', 'code', 'name', 'phone', 'names'].includes(alias)) return false;
        const regex = new RegExp(`(^|\\s)${alias}(\\s|$)`, 'i');
        return regex.test(clean);
      });
    });
    if (match) {
      mapping[raw] = match.key;
      mappedTargetKeys.add(match.key);
    }
  });

  // Default unmapped
  rawHeaders.forEach((h) => {
    if (!mapping[h]) mapping[h] = '';
  });

  return mapping;
};

// ---------------------------------------------------------------------------
// Strict Migration Schema Mapping & Type Casting Layer
// ---------------------------------------------------------------------------

export interface StrictMappingResult {
  mappedData: Record<string, any>;
  autoCoercedFields: string[];
  warnings: string[];
}

/**
 * Strict mapping layer:
 * Forces raw input keys to match the exact database table structures defined in the migration phase,
 * casts primitive types (e.g. guaranteeing student_code / staff_code as string), decomposes names,
 * coerces enums, and sanitizes values before the validation loop begins.
 */
export const applyStrictMigrationMapping = (
  rawRow: Record<string, any>,
  mapping: Record<string, string>,
  entityType: IngestionEntityType,
  rowNumber: number
): StrictMappingResult => {
  const autoCoercedFields: string[] = [];
  const warnings: string[] = [];
  const extracted: Record<string, string> = {};

  // Extract and stringify mapped values
  Object.entries(mapping).forEach(([rawHeader, targetKey]) => {
    if (!targetKey) return;
    const cleanVal = castToString(rawRow[rawHeader]);
    if (!extracted[targetKey] || (cleanVal && !extracted[targetKey])) {
      extracted[targetKey] = cleanVal;
    }
  });

  if (entityType === 'students') {
    // 1. student_code: string (NOT NULL)
    let studentCode = castToString(extracted['student_code']);
    if (!studentCode) {
      studentCode = `STU-${String(rowNumber).padStart(4, '0')}`;
      warnings.push(`Student Code was missing; auto-assigned "${studentCode}"`);
      autoCoercedFields.push(`Auto-assigned student code "${studentCode}"`);
    }

    // 2. Names: first_name & last_name (both NOT NULL in migration schema)
    let fullName = castToString(extracted['full_name']);
    let firstName = castToString(extracted['first_name']);
    let lastName = castToString(extracted['last_name']);

    if (fullName && (!firstName || !lastName)) {
      const parts = fullName.split(/\s+/).filter(Boolean);
      if (!firstName && parts.length > 0) {
        firstName = parts[0];
      }
      if (!lastName) {
        lastName = parts.slice(1).join(' ') || parts[0] || '';
      }
      autoCoercedFields.push(`Split full name into "${firstName}" "${lastName}"`);
    }

    // Handle single legal names so Postgres NOT NULL is satisfied
    if (firstName && !lastName) {
      lastName = firstName;
      autoCoercedFields.push(`Assigned last name as "${firstName}" for single legal name`);
    } else if (!firstName && lastName) {
      firstName = lastName;
      autoCoercedFields.push(`Assigned first name as "${lastName}" for single legal name`);
    }

    if ((firstName || lastName) && !fullName) {
      fullName = `${firstName} ${lastName}`.trim();
    }

    // 3. gender: strictly constrained by CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say'))
    const genderCoerced = coerceGender(extracted['gender']);
    if (genderCoerced.autoCoerced && extracted['gender']) {
      autoCoercedFields.push(`Gender coerced to "${genderCoerced.canonical}"`);
    }

    // 4. grade_level: string (NOT NULL in migration schema)
    let gradeLevel = castToString(extracted['grade_level']);
    if (!gradeLevel) {
      gradeLevel = 'Unassigned';
      warnings.push('Grade Level was missing; defaulted to "Unassigned"');
      autoCoercedFields.push('Defaulted grade level to "Unassigned"');
    } else if (/^\d{1,2}$/.test(gradeLevel)) {
      const formatted = `Grade ${gradeLevel}`;
      autoCoercedFields.push(`Formatted grade level to "${formatted}"`);
      gradeLevel = formatted;
    }

    // 5. parent_phone: string | null
    const rawPhone = extracted['parent_phone'];
    const parentPhone = rawPhone ? normalizePhone(rawPhone) || null : null;

    const schemaRecord: DatabaseStudentRecord = {
      student_code: studentCode,
      first_name: firstName,
      last_name: lastName,
      gender: genderCoerced.canonical,
      grade_level: gradeLevel,
      parent_phone: parentPhone,
      full_name: fullName || `${firstName} ${lastName}`.trim(),
    };

    return { mappedData: schemaRecord, autoCoercedFields, warnings };
  } else {
    // Teachers
    // 1. staff_code: string (NOT NULL)
    let staffCode = castToString(extracted['staff_code']);
    if (!staffCode) {
      staffCode = `TCH-${String(rowNumber).padStart(4, '0')}`;
      warnings.push(`Staff Code was missing; auto-assigned "${staffCode}"`);
      autoCoercedFields.push(`Auto-assigned staff code "${staffCode}"`);
    }

    // 2. email: string | null
    const rawEmail = extracted['email'];
    const email = rawEmail ? normalizeEmail(rawEmail) : null;

    // 3. Names: first_name & last_name (both NOT NULL in migration schema)
    let fullName = castToString(extracted['full_name']);
    let firstName = castToString(extracted['first_name']);
    let lastName = castToString(extracted['last_name']);

    if (fullName && (!firstName || !lastName)) {
      const parts = fullName.split(/\s+/).filter(Boolean);
      if (!firstName && parts.length > 0) {
        firstName = parts[0];
      }
      if (!lastName) {
        lastName = parts.slice(1).join(' ') || parts[0] || '';
      }
      autoCoercedFields.push(`Split full name into "${firstName}" "${lastName}"`);
    }

    // Infer from email if both names missing
    if (!firstName && !lastName && email) {
      const emailPrefix = email.split('@')[0];
      const emailParts = emailPrefix.split(/[\._\-]/).filter(Boolean);
      if (emailParts.length > 0) {
        firstName = emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1);
        lastName = emailParts.length > 1 ? (emailParts[1].charAt(0).toUpperCase() + emailParts[1].slice(1)) : firstName;
        fullName = `${firstName} ${lastName}`.trim();
        autoCoercedFields.push(`Inferred name "${fullName}" from email`);
      }
    }

    if (firstName && !lastName) {
      lastName = firstName;
      autoCoercedFields.push(`Assigned last name as "${firstName}" for single legal name`);
    } else if (!firstName && lastName) {
      firstName = lastName;
      autoCoercedFields.push(`Assigned first name as "${lastName}" for single legal name`);
    }

    if ((firstName || lastName) && !fullName) {
      fullName = `${firstName} ${lastName}`.trim();
    }

    // 4. phone: string | null
    const rawPhone = extracted['phone'];
    const phone = rawPhone ? normalizePhone(rawPhone) || null : null;

    const schemaRecord: DatabaseTeacherRecord = {
      staff_code: staffCode,
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      full_name: fullName || `${firstName} ${lastName}`.trim(),
    };

    return { mappedData: schemaRecord, autoCoercedFields, warnings };
  }
};

// ---------------------------------------------------------------------------
// Row Processing & Validation Engine
// ---------------------------------------------------------------------------

export interface ProcessedRow {
  rowNumber: number;
  originalRaw: Record<string, any>;
  mappedData: Record<string, any>;
  status: 'valid' | 'warning' | 'fatal';
  errors: string[];
  warnings: string[];
  autoCoercedFields: string[];
}

export const processAndValidateRow = (
  rawRow: Record<string, any>,
  rowNumber: number,
  mapping: Record<string, string>,
  entityType: IngestionEntityType
): ProcessedRow => {
  // 1. Strict Migration Schema Mapping & Type Casting Layer (Pre-Validation)
  const { mappedData, autoCoercedFields, warnings } = applyStrictMigrationMapping(
    rawRow,
    mapping,
    entityType,
    rowNumber
  );

  const errors: string[] = [];

  // 2. Strict Validation Loop
  if (entityType === 'students') {
    const s = mappedData as DatabaseStudentRecord;

    // Validate Name requirement
    if (!s.first_name && !s.last_name) {
      errors.push('Missing required student name');
    }

    // Grade level validation (Warning)
    if (s.grade_level && s.grade_level !== 'Unassigned' && !isStandardGradeLevel(s.grade_level)) {
      warnings.push(`Non-standard grade level format: "${s.grade_level}"`);
    }

    // Parent phone check (Warning)
    if (!s.parent_phone) {
      warnings.push('Optional parent contact phone is empty');
    }
  } else {
    const t = mappedData as DatabaseTeacherRecord;

    // Validate Name requirement
    if (!t.first_name && !t.last_name) {
      errors.push('Missing required teacher name');
    }

    // Email format validation (Fatal for teachers)
    if (!t.email || t.email.trim() === '') {
      errors.push('Missing required teacher email address');
    } else if (!isValidEmail(t.email)) {
      errors.push(`Invalid email syntax: "${t.email}"`);
    }

    // Teacher phone check (Warning)
    if (!t.phone) {
      warnings.push('Optional teacher contact phone is empty');
    }
  }

  // Status computation
  let status: 'valid' | 'warning' | 'fatal' = 'valid';
  if (errors.length > 0) {
    status = 'fatal';
  } else if (warnings.length > 0 || autoCoercedFields.length > 0) {
    status = 'warning';
  }

  return {
    rowNumber,
    originalRaw: rawRow,
    mappedData,
    status,
    errors,
    warnings: [...warnings, ...autoCoercedFields],
    autoCoercedFields,
  };
};

/**
 * Re-validates a single row after manual inline remediation in the UI grid
 */
export const revalidateRemediatedRow = (
  currentMapped: Record<string, any>,
  fieldKey: string,
  newValue: string,
  entityType: IngestionEntityType,
  rowNumber: number
): ProcessedRow => {
  const updated = { ...currentMapped, [fieldKey]: newValue };

  if (fieldKey === 'full_name') {
    const parts = newValue.trim().split(/\s+/).filter(Boolean);
    updated.first_name = parts[0] || '';
    updated.last_name = parts.slice(1).join(' ') || parts[0] || '';
  } else if (fieldKey === 'first_name' || fieldKey === 'last_name') {
    updated.full_name = `${updated.first_name || ''} ${updated.last_name || ''}`.trim();
  }

  const syntheticMapping: Record<string, string> = {};
  Object.keys(updated).forEach((k) => {
    syntheticMapping[k] = k;
  });

  return processAndValidateRow(updated, rowNumber, syntheticMapping, entityType);
};

/**
 * Assembles and triggers download of a .csv error log file
 */
export const exportErrorLogCsv = (
  failedRows: ProcessedRow[],
  entityType: IngestionEntityType,
  schoolName: string
) => {
  if (failedRows.length === 0) return;

  const fields = entityType === 'students' ? STUDENT_FIELDS : TEACHER_FIELDS;
  const headers = ['Row Number', ...fields.map((f) => f.label), 'Failure Reasons', 'Warnings'];

  const rows = failedRows.map((item) => {
    const rowValues = fields.map((f) => {
      const val = item.mappedData[f.key] || '';
      return `"${String(val).replace(/"/g, '""')}"`;
    });

    const errorReasons = `"${item.errors.join('; ').replace(/"/g, '""')}"`;
    const warningReasons = `"${item.warnings.join('; ').replace(/"/g, '""')}"`;

    return [item.rowNumber, ...rowValues, errorReasons, warningReasons].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${schoolName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${entityType}_ingestion_errors.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generates sample CSV template for admins to test with
 */
export const downloadSampleTemplate = (entityType: IngestionEntityType) => {
  let headers: string[];
  let sampleRows: string[][];

  if (entityType === 'students') {
    headers = ['Student ID', 'Learner First Name', 'Last Name', 'Gender', 'Grade Level', 'Parent Mobile'];
    sampleRows = [
      ['STU-2026-001', 'Alexander', 'Smith', 'Male', 'Grade 9', '+1 (555) 349-2910'],
      ['STU-2026-002', 'Sophia', 'Chen', 'Female', 'Grade 10', '+1 (555) 839-1122'],
      ['STU-2026-003', 'Liam', 'O\'Connor', 'boy', 'Grade 9', '+1 (555) 902-3341'],
      ['STU-2026-004', 'Amara', 'Okafor', 'F', '11th', '+1 (555) 201-9883'],
      ['STU-2026-005', 'Jayden', '', 'Male', 'Custom Elective', ''], // Deliberate test row with missing first name
    ];
  } else {
    headers = ['Staff Code', 'Teacher First Name', 'Surname', 'Email Address', 'Mobile Phone'];
    sampleRows = [
      ['TCH-081', 'Margaret', 'Thatcher', 'm.thatcher@institution.edu', '+1 (555) 123-4567'],
      ['TCH-082', 'Alan', 'Turing', 'a.turing@institution.edu', '+1 (555) 987-6543'],
      ['TCH-083', 'Rosalind', 'Franklin', 'r.franklin@institution.edu', '+1 (555) 456-7890'],
      ['TCH-084', 'Ada', 'Lovelace', 'invalid-email-address', '+1 (555) 222-3333'], // Deliberate invalid email
    ];
  }

  const csvContent = [
    headers.join(','),
    ...sampleRows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `sample_${entityType}_template.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
