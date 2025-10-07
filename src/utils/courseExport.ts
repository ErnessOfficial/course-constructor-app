import { Course } from '../types/course';
import { validateCourse } from '../types/course';

export const exportCourse = async (course: Course): Promise<string> => {
  // Validate course before export
  const errors = validateCourse(course);
  if (errors.length > 0) {
    throw new Error(`Cannot export invalid course:\n${errors.join('\n')}`);
  }

  // Convert course to TypeScript code
  const courseCode = `
import { Course } from '../types/course';
import { assetPath } from '../utils/assetPath';

export const ${course.id.replace(/-/g, '_')}: Course = ${JSON.stringify(course, null, 2)}
  .replace(/"assetPath\((.*?)\)"/g, 'assetPath($1)');
`;

  return courseCode;
};

export const saveCourseToFile = async (
  course: Course,
  filename = `${course.id}.ts`
): Promise<void> => {
  try {
    const courseCode = await exportCourse(course);
    
    // In browser environment, create download
    const blob = new Blob([courseCode], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to save course:', error);
    throw error;
  }
};