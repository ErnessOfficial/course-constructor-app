// Course type definitions and validation
export type BroadCategory = 'Autoconocimiento' | 'Gestión Emocional' | 'Habilidades Sociales';

export interface Instructor {
  name: string;
  avatarUrl: string; // Must use assetPath
}

export interface QuizOption {
  text: string;
  feedback: string;
}

export interface QuizQuestion {
  question: string;
  options: QuizOption[];
}

export interface BaseActivity {
  id: string;      // Format: m1a1, m1a2, etc.
  type: string;
  title: string;
  description: string;
}

export interface VideoActivity extends BaseActivity {
  type: 'video';
  videoSrc: string; // Must use assetPath for local videos
}

export interface YouTubeActivity extends BaseActivity {
  type: 'youtube';
  videoSrc: string; // Direct YouTube URL
}

export interface IframeActivity extends BaseActivity {
  type: 'iframe';
  content?: string[]; // Pure HTML, no markdown fences
  videoSrc?: string;  // External URL or Google Drive /preview
  hideHeader?: boolean;
}

export interface TextActivity extends BaseActivity {
  type: 'text';
  content: string[];    // Plain text only
  imageSrc?: string;    // Must use assetPath
  imageAltSrc?: string;
}

export interface QuizActivity extends BaseActivity {
  type: 'quiz';
  questions: QuizQuestion[];
}

export interface AudioActivity extends BaseActivity {
  type: 'audio';
  audioSrc: string; // Must use assetPath
}

export type Activity = 
  | VideoActivity 
  | YouTubeActivity 
  | IframeActivity 
  | TextActivity 
  | QuizActivity 
  | AudioActivity;

export interface Module {
  id: string;     // Format: m1, m2, etc.
  title: string;
  activities: Activity[];
}

export interface Course {
  id: string;                    // kebab-case
  title: string;
  subtitle: string;
  description: string;
  category: string;
  broadCategories: BroadCategory[];
  coverImage: string;            // Must use assetPath
  instructor: Instructor;
  learningObjectives: string[];
  modules: Module[];
}

// Validation helpers
export const assetPath = (path: string) => `/public/${path}`;

export const isValidCourseId = (id: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);

export const isValidActivityId = (id: string) => /^m\d+a\d+$/.test(id);

export const isValidModuleId = (id: string) => /^m\d+$/.test(id);

export const validateActivity = (activity: Activity): string[] => {
  const errors: string[] = [];

  if (!isValidActivityId(activity.id)) {
    errors.push(`Invalid activity ID format: ${activity.id}. Use format m1a1, m1a2, etc.`);
  }

  switch (activity.type) {
    case 'video':
      if (!activity.videoSrc.startsWith('/public/')) {
        errors.push(`Video source must use assetPath: ${activity.id}`);
      }
      break;
    case 'text':
      if (activity.content.some(c => /<[^>]+>/.test(c))) {
        errors.push(`Text content cannot contain HTML: ${activity.id}`);
      }
      if (activity.imageSrc && !activity.imageSrc.startsWith('/public/')) {
        errors.push(`Image source must use assetPath: ${activity.id}`);
      }
      break;
    case 'iframe':
      if (activity.content?.some(c => c.includes('```'))) {
        errors.push(`Iframe content cannot contain markdown fences: ${activity.id}`);
      }
      break;
    case 'quiz':
      if (activity.questions.some(q => q.options.some(o => 'correct' in o))) {
        errors.push(`Quiz options cannot have 'correct' property: ${activity.id}`);
      }
      break;
    case 'audio':
      if (!activity.audioSrc.startsWith('/public/')) {
        errors.push(`Audio source must use assetPath: ${activity.id}`);
      }
      break;
  }

  return errors;
};

export const validateCourse = (course: Course): string[] => {
  const errors: string[] = [];

  if (!isValidCourseId(course.id)) {
    errors.push('Invalid course ID format. Use kebab-case.');
  }

  if (!course.broadCategories.length) {
    errors.push('Course must have at least one broad category.');
  }

  if (!course.coverImage.startsWith('/public/')) {
    errors.push('Cover image must use assetPath.');
  }

  if (!course.instructor.avatarUrl.startsWith('/public/')) {
    errors.push('Instructor avatar must use assetPath.');
  }

  if (course.learningObjectives.length < 5 || course.learningObjectives.length > 7) {
    errors.push('Course must have 5-7 learning objectives.');
  }

  course.modules.forEach(module => {
    if (!isValidModuleId(module.id)) {
      errors.push(`Invalid module ID format: ${module.id}. Use format m1, m2, etc.`);
    }

    module.activities.forEach(activity => {
      errors.push(...validateActivity(activity));
    });
  });

  return errors;
};