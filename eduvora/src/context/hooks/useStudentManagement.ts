import { Student } from '../../types';
import { generateId } from '../../utils/id';
import { StudentState } from './types';

export function useStudentManagement(state: StudentState) {
  const { students, setStudents, currentTenant } = state;

  const addStudent = (studentData: Omit<Student, 'id' | 'school_id' | 'created_at'>) => {
    const newStudent: Student = {
      ...studentData,
      id: generateId('stu'),
      school_id: currentTenant?.id || '',
      created_at: new Date().toISOString(),
    };
    setStudents((prev) => [newStudent, ...prev]);
  };

  const updateStudent = (studentId: string, data: Partial<Student>) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, ...data } : s))
    );
  };

  const deleteStudent = (studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  return { addStudent, updateStudent, deleteStudent };
}
