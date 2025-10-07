import { 
  Activity,
  AudioActivity,
  BroadCategory,
  Course,
  IframeActivity,
  Module,
  QuizActivity,
  TextActivity,
  VideoActivity,
  YouTubeActivity,
  assetPath,
  validateCourse
} from '../types/course';

export class CourseBuilder {
  private course: Partial<Course> = {
    modules: []
  };

  private currentModuleIndex = 0;
  private currentActivityIndex = 0;

  // Basic course info
  setId(id: string) {
    this.course.id = id;
    return this;
  }

  setTitle(title: string) {
    this.course.title = title;
    return this;
  }

  setSubtitle(subtitle: string) {
    this.course.subtitle = subtitle;
    return this;
  }

  setDescription(description: string) {
    this.course.description = description;
    return this;
  }

  setCategory(category: string) {
    this.course.category = category;
    return this;
  }

  setBroadCategories(categories: BroadCategory[]) {
    this.course.broadCategories = categories;
    return this;
  }

  setCoverImage(imagePath: string) {
    this.course.coverImage = assetPath(imagePath);
    return this;
  }

  setInstructor(name: string, avatarPath: string) {
    this.course.instructor = {
      name,
      avatarUrl: assetPath(avatarPath)
    };
    return this;
  }

  setLearningObjectives(objectives: string[]) {
    this.course.learningObjectives = objectives;
    return this;
  }

  // Module management
  addModule(title: string) {
    this.currentModuleIndex++;
    this.currentActivityIndex = 0;
    const module: Module = {
      id: `m${this.currentModuleIndex}`,
      title,
      activities: []
    };
    this.course.modules?.push(module);
    return this;
  }

  // Activity builders
  addVideoActivity(title: string, description: string, videoPath: string): CourseBuilder {
    const activity: VideoActivity = {
      id: this.getNextActivityId(),
      type: 'video',
      title,
      description,
      videoSrc: assetPath(videoPath)
    };
    return this.addActivity(activity);
  }

  addYouTubeActivity(title: string, description: string, youtubeUrl: string): CourseBuilder {
    const activity: YouTubeActivity = {
      id: this.getNextActivityId(),
      type: 'youtube',
      title,
      description,
      videoSrc: youtubeUrl
    };
    return this.addActivity(activity);
  }

  addIframeActivity(
    title: string, 
    description: string, 
    options: {
      content?: string[];
      videoSrc?: string;
      hideHeader?: boolean;
    }
  ): CourseBuilder {
    const activity: IframeActivity = {
      id: this.getNextActivityId(),
      type: 'iframe',
      title,
      description,
      ...options
    };
    return this.addActivity(activity);
  }

  addTextActivity(
    title: string,
    description: string,
    content: string[],
    options?: {
      imagePath?: string;
      altImagePath?: string;
    }
  ): CourseBuilder {
    const activity: TextActivity = {
      id: this.getNextActivityId(),
      type: 'text',
      title,
      description,
      content,
      ...(options?.imagePath && { imageSrc: assetPath(options.imagePath) }),
      ...(options?.altImagePath && { imageAltSrc: assetPath(options.altImagePath) })
    };
    return this.addActivity(activity);
  }

  addQuizActivity(
    title: string,
    description: string,
    questions: Array<{
      question: string;
      options: Array<{
        text: string;
        feedback: string;
      }>;
    }>
  ): CourseBuilder {
    const activity: QuizActivity = {
      id: this.getNextActivityId(),
      type: 'quiz',
      title,
      description,
      questions
    };
    return this.addActivity(activity);
  }

  addAudioActivity(title: string, description: string, audioPath: string): CourseBuilder {
    const activity: AudioActivity = {
      id: this.getNextActivityId(),
      type: 'audio',
      title,
      description,
      audioSrc: assetPath(audioPath)
    };
    return this.addActivity(activity);
  }

  // Build and validate
  build(): Course {
    const course = this.course as Course;
    const errors = validateCourse(course);
    
    if (errors.length > 0) {
      throw new Error(`Invalid course configuration:\n${errors.join('\n')}`);
    }

    return course;
  }

  // Helpers
  private getNextActivityId(): string {
    this.currentActivityIndex++;
    return `m${this.currentModuleIndex}a${this.currentActivityIndex}`;
  }

  private addActivity(activity: Activity): CourseBuilder {
    if (!this.course.modules?.length) {
      throw new Error('No module exists. Call addModule() first.');
    }
    
    const currentModule = this.course.modules[this.course.modules.length - 1];
    currentModule.activities.push(activity);
    return this;
  }
}