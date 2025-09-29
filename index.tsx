import React, { useState, useCallback, useMemo, FC, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
// Gemini calls are proxied via our backend at /api/generate

// --- TYPE DEFINITIONS (as per project structure) ---
type BroadCategory = 'Autoconocimiento' | 'Gestión Emocional' | 'Habilidades Sociales';
interface Instructor { name: string; title: string; avatarUrl: string; bio: string; }
type ActivityType = 'text' | 'video' | 'audio' | 'quiz' | 'iframe' | 'image';
interface BaseActivity { id: string; title: string; description: string; type: ActivityType; }
interface TextActivity extends BaseActivity { type: 'text'; content: string[]; }
interface VideoActivity extends BaseActivity { type: 'video'; videoSrc: string; }
interface AudioActivity extends BaseActivity { type: 'audio'; audioSrc: string; }
interface ImageActivity extends BaseActivity { type: 'image'; imageSrc: string; }
interface QuizQuestion { question: string; options: { text: string; feedback: string; }[]; }
interface QuizActivity extends BaseActivity { type: 'quiz'; questions: QuizQuestion[]; }
interface IFrameActivity extends BaseActivity { type: 'iframe'; html: string; }
type Activity = TextActivity | VideoActivity | AudioActivity | QuizActivity | IFrameActivity | ImageActivity;
interface Module { id: string; title: string; activities: Activity[]; }
interface Course { id: string; title: string; subtitle: string; description: string; category: string; broadCategories: BroadCategory[]; coverImage: string; instructor: Instructor; learningObjectives: string[]; modules: Module[]; }

// --- STYLES OBJECT ---
const styles: { [key: string]: React.CSSProperties } = {
    appContainer: { padding: '2rem', maxWidth: '1200px', margin: 'auto' },
    header: { textAlign: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' },
    h1: { color: 'var(--primary-color)', margin: '0' },
    h2: { color: 'var(--text-color)', borderBottom: '2px solid var(--secondary-color)', paddingBottom: '0.5rem', marginTop: '2.5rem' },
    button: { backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 'var(--border-radius)', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, transition: 'background-color 0.3s, transform 0.1s', display: 'inline-flex', alignItems: 'center', gap: '8px' },
    buttonSecondary: { backgroundColor: '#6c757d', color: 'white' },
    buttonDanger: { backgroundColor: 'var(--danger-color)', color: 'white' },
    buttonAi: { backgroundColor: '#8a42e2', color: 'white'},
    card: { backgroundColor: 'var(--surface-color)', borderRadius: 'var(--border-radius)', padding: '2rem', boxShadow: 'var(--shadow-md)', marginBottom: '1.5rem' },
    inputGroup: { marginBottom: '1.5rem' },
    label: { display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-color)' },
    input: { width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', fontSize: '1rem' },
    textarea: { width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', fontSize: '1rem', minHeight: '120px', resize: 'vertical' },
    select: { width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', fontSize: '1rem', backgroundColor: 'white' },
    tag: { display: 'inline-block', backgroundColor: 'var(--secondary-color)', color: 'var(--text-color)', padding: '5px 10px', borderRadius: '15px', marginRight: '5px', marginBottom: '5px', fontSize: '0.9rem' },
    tabs: { display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' },
    tab: { padding: '1rem 1.5rem', cursor: 'pointer', borderBottom: '3px solid transparent', fontWeight: 500, color: 'var(--muted-color)' },
    activeTab: { borderBottom: '3px solid var(--primary-color)', color: 'var(--primary-color)', fontWeight: 600 },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--border-radius)', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-md)' },
    generatedCode: { backgroundColor: '#2d2d2d', color: '#f8f8f2', padding: '1rem', borderRadius: 'var(--border-radius)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: '400px', overflowY: 'auto' },
    assetList: { listStyle: 'none', padding: 0 },
    assetItem: { backgroundColor: '#e9ecef', padding: '10px', borderRadius: 'var(--border-radius)', marginBottom: '8px', fontFamily: 'monospace' },
    categoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' },
    categoryCard: { border: '2px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: '1rem', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.3s, box-shadow 0.3s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '120px' },
    categoryCardSelected: { borderColor: 'var(--primary-color)', boxShadow: '0 0 0 3px rgba(74, 144, 226, 0.3)', color: 'var(--primary-color)', fontWeight: 600 },
    categoryIcon: { fontSize: '2rem', marginBottom: '0.75rem' },
};

// --- UTILITY FUNCTIONS ---
const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
const sanitizeForPath = (text: string) => {
    if (!text) return '';
    const name = text.substring(0, text.lastIndexOf('.')) || text;
    const extension = text.substring(text.lastIndexOf('.'));
    return slugify(name) + extension;
}

const initialCourseState: Course = {
    id: '', title: '', subtitle: '', description: '', category: 'Autoconciencia & Regulación emocional (núcleo formativo)', broadCategories: [], coverImage: '',
    instructor: { name: 'Admin', title: 'Instructor', avatarUrl: '/images/avatars/default.png', bio: 'Bio del instructor.' },
    learningObjectives: [], modules: []
};

// --- MAIN APP COMPONENT ---
const App: FC = () => {
    const [view, setView] = useState<'list' | 'create'>('list');
    const [courses, setCourses] = useState<Course[]>([]);
    const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
    const [step, setStep] = useState(1);
    const [testingAI, setTestingAI] = useState(false);

    const handleTestAI = async () => {
        try {
            setTestingAI(true);
            const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';
            const res = await fetch(`${API_BASE}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'Responde exactamente: PONG' })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const txt: string = data?.text || '';
            if (txt.trim().toUpperCase().includes('PONG')) {
                alert('Conexión a IA OK (respuesta contiene PONG).');
            } else {
                alert('Conexión a IA respondió, pero el contenido no coincide (revisa la clave o el modelo).');
            }
        } catch (e: any) {
            alert(`Error probando conexión a IA: ${e?.message || e}`);
        } finally {
            setTestingAI(false);
        }
    };

    const handleCreateNew = () => {
        setCurrentCourse(JSON.parse(JSON.stringify(initialCourseState)));
        setStep(1);
        setView('create');
    };

    const handleBackToList = () => {
        setView('list');
        setCurrentCourse(null);
    };

    const handleFormSubmit = (courseData: Course) => {
        const slug = slugify(courseData.title);
        const finalCourseData: Course = {
            ...courseData,
            id: slug || `curso-${Date.now()}`,
            coverImage: `${slug || 'curso'}_portada.png`,
            modules: courseData.modules.map((m, i) => ({ id: `m${i + 1}`, title: m.title, activities: [] })),
        };
        setCurrentCourse(finalCourseData);
        setStep(2);
    };

    const handleFinishEditing = (finalCourse: Course) => {
        setCurrentCourse(finalCourse);
        setStep(3);
    };

    return (
        <div style={styles.appContainer}>
            <header style={styles.header}>
                <h1 style={styles.h1}><i className="fas fa-brain"></i> AI Course Creator</h1>
                <p style={styles.mutedColor}>Diseña cursos de bienestar emocional con asistencia de IA</p>
                <div style={{ marginTop: '0.75rem' }}>
                    <button style={{...styles.button, ...styles.buttonAi}}
                            onClick={handleTestAI}
                            disabled={testingAI}>
                        {testingAI ? 'Probando conexión...' : 'Probar conexión a IA'}
                    </button>
                </div>
            </header>
            
            {view === 'list' && <CourseList courses={courses} onCreateNew={handleCreateNew} />}
            
            {view === 'create' && currentCourse && (
                <>
                    {step === 1 && <CourseForm course={currentCourse} onSubmit={handleFormSubmit} onCancel={handleBackToList} />}
                    {step === 2 && <ModuleEditor course={currentCourse} onFinish={handleFinishEditing} />}
                    {step === 3 && <GeneratedCourseView course={currentCourse} onRestart={handleCreateNew} />}
                </>
            )}
        </div>
    );
};

// --- SUB-COMPONENTS ---

const CourseList: FC<{ courses: Course[], onCreateNew: () => void }> = ({ courses, onCreateNew }) => (
    <div style={styles.card}>
        <h2 style={styles.h2}>Mis Cursos</h2>
        {courses.length === 0 ? (
            <p>Aún no has creado ningún curso.</p>
        ) : (
            <ul>{courses.map(c => <li key={c.id}>{c.title}</li>)}</ul>
        )}
        <button style={styles.button} onClick={onCreateNew}>
            <i className="fas fa-plus"></i> Crear Nuevo Curso
        </button>
    </div>
);

const CourseForm: FC<{ course: Course, onSubmit: (data: Course) => void, onCancel: () => void }> = ({ course, onSubmit, onCancel }) => {
    const [data, setData] = useState(course);
    const [tagInput, setTagInput] = useState('');
    
    const validTags: Record<string, BroadCategory> = {
      'autoconocimiento': 'Autoconocimiento',
      'gestion emocional': 'Gestión Emocional',
      'habilidades sociales': 'Habilidades Sociales'
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handleCategorySelect = (categoryName: string) => {
        setData(prev => ({ ...prev, category: categoryName }));
    };
    
    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim() !== '' && data.broadCategories.length < 4) {
            e.preventDefault();
            const cleanInput = tagInput.trim().toLowerCase();
            const newTag = validTags[cleanInput];
            
            if (newTag && !data.broadCategories.includes(newTag)) {
                setData(prev => ({...prev, broadCategories: [...prev.broadCategories, newTag]}));
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: BroadCategory) => {
        setData(prev => ({ ...prev, broadCategories: prev.broadCategories.filter(tag => tag !== tagToRemove)}));
    };
    
    const handleAddModule = () => {
        if (data.modules.length < 6) {
            setData(prev => ({
                ...prev,
                modules: [...prev.modules, { id: '', title: `Módulo ${prev.modules.length + 1}`, activities: [] }],
                learningObjectives: [...prev.learningObjectives, `Objetivo del módulo ${prev.modules.length + 1}`]
            }));
        }
    };

    const handleModuleChange = (index: number, value: string) => {
        const newModules = [...data.modules];
        newModules[index].title = value;
        setData(prev => ({ ...prev, modules: newModules }));
    };

    const handleObjectiveChange = (index: number, value: string) => {
        const newObjectives = [...data.learningObjectives];
        newObjectives[index] = value;
        setData(prev => ({...prev, learningObjectives: newObjectives }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(data);
    };

    const categoryOptions = [
        { name: "Autoconciencia & Regulación emocional (núcleo formativo)", icon: "fa-brain" },
        { name: "Ansiedad, Estrés y Calma", icon: "fa-wind" },
        { name: "Sueño & Descanso consciente", icon: "fa-moon" },
        { name: "Relaciones & Comunicación con Criterio", icon: "fa-users" },
        { name: "Familia, Crianza & Adolescencia", icon: "fa-baby-carriage" },
        { name: "Bienestar en el Trabajo & Burnout", icon: "fa-briefcase" },
        { name: "Mujer & Hombre - Etapas vitales", icon: "fa-venus-mars" },
        { name: "Migración & Cambio de vida", icon: "fa-globe-americas" },
        { name: "Duelo, Pérdida & Crisis", icon: "fa-heart-crack" },
        { name: "Autocuidado y Bienestar Digital", icon: "fa-spa" }
    ];

    return (
        <form onSubmit={handleSubmit} style={styles.card}>
            <h2 style={styles.h2}>Ficha del Curso</h2>
            <div style={styles.inputGroup}>
                <label style={styles.label} htmlFor="title">Nombre del Curso</label>
                <input style={styles.input} type="text" name="title" value={data.title} onChange={handleChange} required />
            </div>
            <div style={styles.inputGroup}>
                <label style={styles.label} htmlFor="subtitle">Subtítulo</label>
                <input style={styles.input} type="text" name="subtitle" value={data.subtitle} onChange={handleChange} required />
            </div>
            <div style={styles.inputGroup}>
                <label style={styles.label} htmlFor="description">Descripción</label>
                <textarea style={styles.textarea} name="description" value={data.description} onChange={handleChange} required />
            </div>
            <div style={styles.inputGroup}>
                <label style={styles.label}>Categoría</label>
                <div style={styles.categoryGrid}>
                    {categoryOptions.map(cat => (
                        <div
                            key={cat.name}
                            style={data.category === cat.name ? { ...styles.categoryCard, ...styles.categoryCardSelected } : styles.categoryCard}
                            onClick={() => handleCategorySelect(cat.name)}
                            role="button"
                            tabIndex={0}
                            aria-pressed={data.category === cat.name}
                        >
                            <i className={`fas ${cat.icon}`} style={styles.categoryIcon}></i>
                            <span style={{ fontSize: '0.9rem' }}>{cat.name.split(' (')[0]}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div style={styles.inputGroup}>
                <label style={styles.label}>Etiquetas (máx. 4)</label>
                <div>
                    {data.broadCategories.map(tag => 
                      <span key={tag} style={styles.tag}>
                        {tag} <i className="fas fa-times" style={{cursor: 'pointer', marginLeft: '5px'}} onClick={() => removeTag(tag)}></i>
                      </span>
                    )}
                </div>
                <input style={styles.input} type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="Escribe y presiona Enter..." />
                 <small style={{ color: 'var(--muted-color)', marginTop: '5px', display: 'block' }}>
                    Valores permitidos: Autoconocimiento, Gestión Emocional, Habilidades Sociales.
                </small>
            </div>
            <div style={styles.inputGroup}>
                <label style={styles.label}>Módulos y Objetivos de Aprendizaje</label>
                {data.modules.map((mod, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                        <input style={styles.input} value={mod.title} onChange={e => handleModuleChange(i, e.target.value)} placeholder={`Nombre del Módulo ${i + 1}`} />
                        <input style={styles.input} value={data.learningObjectives[i]} onChange={e => handleObjectiveChange(i, e.target.value)} placeholder={`Objetivo de aprendizaje para el Módulo ${i+1}`} />
                    </div>
                ))}
                {data.modules.length < 6 && <button type="button" style={{...styles.button, ...styles.buttonSecondary, padding:'8px 16px'}} onClick={handleAddModule}><i className="fas fa-plus"></i> Añadir Módulo</button>}
            </div>
            
            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '2rem'}}>
                <button type="button" style={{...styles.button, ...styles.buttonSecondary}} onClick={onCancel}>Cancelar</button>
                <button type="submit" style={styles.button}>Guardar y Continuar <i className="fas fa-arrow-right"></i></button>
            </div>
        </form>
    );
};

const ModuleEditor: FC<{ course: Course, onFinish: (data: Course) => void }> = ({ course, onFinish }) => {
    const [currentCourse, setCurrentCourse] = useState(course);
    const [activeModuleIndex, setActiveModuleIndex] = useState(0);
    const [geminiTarget, setGeminiTarget] = useState<{ modIndex: number, actIndex: number } | null>(null);

    const updateActivity = (modIndex: number, actIndex: number, updatedActivity: Activity) => {
        const newCourse = { ...currentCourse };
        newCourse.modules[modIndex].activities[actIndex] = updatedActivity;
        setCurrentCourse(newCourse);
    };

    const addActivity = (type: ActivityType, openAiModal: boolean = false) => {
        const modIndex = activeModuleIndex;
        const activities = currentCourse.modules[modIndex].activities;
        const newActivity: Activity = {
            id: `m${modIndex + 1}a${activities.length + 1}`,
            title: `Nueva Actividad (${type})`,
            description: 'Descripción de la actividad',
            type: type,
            ...(type === 'text' && { content: ['Escribe aquí tu contenido.'] }),
            ...(type === 'video' && { videoSrc: 'nombre_video.mp4' }),
            ...(type === 'audio' && { audioSrc: 'nombre_audio.mp3' }),
            ...(type === 'image' && { imageSrc: 'nombre_imagen.png' }),
            ...(type === 'quiz' && { questions: [] }),
            ...(type === 'iframe' && { html: '<!-- Pega tu código HTML aquí -->' }),
        };
        const newCourse = { ...currentCourse };
        newCourse.modules[modIndex].activities.push(newActivity);
        setCurrentCourse(newCourse);

        if (openAiModal) {
            setGeminiTarget({ modIndex, actIndex: activities.length });
        }
    };
    
    const handleGeminiInsert = (content: string) => {
        if (!geminiTarget) return;
        
        const { modIndex, actIndex } = geminiTarget;
        const activity = currentCourse.modules[modIndex].activities[actIndex];

        if (activity.type === 'quiz') {
            try {
                // Sanitize content before parsing
                const sanitizedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
                const questions = JSON.parse(sanitizedContent);
                if (Array.isArray(questions) && questions.length > 0) {
                    updateActivity(modIndex, actIndex, { ...activity, questions });
                } else {
                    alert("La IA no generó preguntas válidas. Inténtalo de nuevo.");
                }
            } catch (e) {
                alert("Error al procesar el JSON del Quiz. Revisa el formato.");
            }
        } else if (activity.type === 'iframe') {
            updateActivity(modIndex, actIndex, { ...activity, html: content });
        }
        setGeminiTarget(null);
    };

    return (
        <div style={styles.card}>
            <h2 style={styles.h2}>{course.title} - Editor de Contenido</h2>
            <div style={styles.tabs}>
                {currentCourse.modules.map((mod, index) => (
                    <div key={mod.id} style={index === activeModuleIndex ? {...styles.tab, ...styles.activeTab} : styles.tab} onClick={() => setActiveModuleIndex(index)}>
                        {mod.title}
                    </div>
                ))}
            </div>

            <div>
                <p><strong>Objetivo:</strong> {currentCourse.learningObjectives[activeModuleIndex]}</p>
                {currentCourse.modules[activeModuleIndex].activities.map((act, actIndex) => (
                    <ActivityEditor 
                        key={`${act.id}-${actIndex}`}
                        activity={act}
                        onChange={(updated) => updateActivity(activeModuleIndex, actIndex, updated)}
                        onGenerateWithAI={() => setGeminiTarget({ modIndex: activeModuleIndex, actIndex })}
                    />
                ))}
                <div style={{marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                    <button style={{...styles.button, ...styles.buttonSecondary}} onClick={() => addActivity('text')}><i className="fas fa-paragraph"></i> Texto</button>
                    <button style={{...styles.button, ...styles.buttonSecondary}} onClick={() => addActivity('image')}><i className="fas fa-image"></i> Imagen</button>
                    <button style={{...styles.button, ...styles.buttonSecondary}} onClick={() => addActivity('video')}><i className="fas fa-video"></i> Video</button>
                    <button style={{...styles.button, ...styles.buttonSecondary}} onClick={() => addActivity('audio')}><i className="fas fa-volume-up"></i> Audio</button>
                    <button style={{...styles.button, ...styles.buttonSecondary}} onClick={() => addActivity('quiz')}><i className="fas fa-question-circle"></i> Quiz</button>
                    <button style={{...styles.button, ...styles.buttonAi}} onClick={() => addActivity('iframe', true)}><i className="fas fa-magic"></i> Recurso con IA</button>
                </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem'}}>
                <button style={styles.button} onClick={() => onFinish(currentCourse)}>Finalizar y Generar Curso <i className="fas fa-check"></i></button>
            </div>
            
            {geminiTarget && <GeminiModal onInsert={handleGeminiInsert} onClose={() => setGeminiTarget(null)} />}
        </div>
    );
};

const ActivityEditor: FC<{ activity: Activity, onChange: (updated: Activity) => void, onGenerateWithAI: () => void }> = ({ activity, onChange, onGenerateWithAI }) => {
    const handleChange = (field: string, value: any) => {
        onChange({ ...activity, [field]: value });
    };

    return (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', padding: '1.5rem', marginBottom: '1rem' }}>
            <input style={{...styles.input, fontWeight: 'bold', marginBottom: '1rem'}} value={activity.title} onChange={e => handleChange('title', e.target.value)} />
            <textarea style={{...styles.textarea, minHeight: '60px', marginBottom: '1rem'}} value={activity.description} onChange={e => handleChange('description', e.target.value)} />

            {activity.type === 'text' && (
                <textarea style={styles.textarea} value={activity.content.join('\n\n')} onChange={e => handleChange('content', e.target.value.split('\n\n'))} />
            )}
            {activity.type === 'video' && (
                <input style={styles.input} value={activity.videoSrc} onChange={e => handleChange('videoSrc', e.target.value)} placeholder="ej: intro_curso.mp4" />
            )}
            {activity.type === 'audio' && (
                <input style={styles.input} value={activity.audioSrc} onChange={e => handleChange('audioSrc', e.target.value)} placeholder="ej: meditacion.mp3" />
            )}
            {activity.type === 'image' && (
                <input style={styles.input} value={activity.imageSrc} onChange={e => handleChange('imageSrc', e.target.value)} placeholder="ej: diagrama.png" />
            )}
            {activity.type === 'iframe' && (
                 <>
                    <textarea style={styles.textarea} value={activity.html} onChange={e => handleChange('html', e.target.value)} />
                    <button style={{...styles.button, ...styles.buttonAi, marginTop: '10px'}} onClick={onGenerateWithAI}><i className="fas fa-magic"></i> Regenerar con IA</button>
                 </>
            )}
            {activity.type === 'quiz' && (
                <div>
                    <p><strong>Preguntas:</strong> {activity.questions.length}</p>
                    <button style={{...styles.button, ...styles.buttonAi}} onClick={onGenerateWithAI}><i className="fas fa-magic"></i> Generar Quiz con IA</button>
                </div>
            )}
        </div>
    );
};

const GeminiModal: FC<{ onInsert: (content: string) => void, onClose: () => void }> = ({ onInsert, onClose }) => {
    const [topic, setTopic] = useState('');
    const [customPrompt, setCustomPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedContent, setGeneratedContent] = useState('');
    const [error, setError] = useState('');

    const predefinedPrompts = [
        { name: "Quiz de 3 Preguntas", prompt: `Crea un quiz interactivo sobre el tema '{TOPIC}'. El quiz debe tener 3 preguntas de opción múltiple con 3 opciones cada una. Para cada opción, proporciona un feedback explicando por qué es correcta o incorrecta. Responde únicamente con un objeto JSON que siga esta estructura de TypeScript: \`interface QuizQuestion { question: string; options: { text: string; feedback: string; }[]; }[]\`. No incluyas backticks de markdown en tu respuesta.` },
        { name: "Caso Práctico", prompt: "Genera un 'caso práctico' o 'estudio de caso' sobre '{TOPIC}'. Debe presentar una situación realista y terminar con 2 preguntas abiertas que inviten a la reflexión del participante. Responde con código HTML simple usando <p> y <strong>." },
        { name: "Juego de Cartas (Conceptos)", prompt: "Crea un mini juego de cartas sobre '{TOPIC}'. Genera 4 pares de cartas (8 en total). Cada par debe tener un concepto y su definición. Responde con código HTML que use una <div> con la clase 'card-game' y dentro 8 <div> con la clase 'card'." },
        { name: "Metáfora Explicativa", prompt: "Explica el concepto de '{TOPIC}' usando una metáfora o analogía poderosa y fácil de entender. Responde con código HTML usando un <blockquote>." },
        { name: "Mito vs. Realidad", prompt: "Crea una tabla 'Mito vs. Realidad' sobre '{TOPIC}', con 3 mitos comunes y su correspondiente aclaración. Responde con una tabla HTML (<table>)." },
    ];

    const handleGenerate = async (promptTemplate: string) => {
        if (!topic && !promptTemplate.includes('{TOPIC}')) {
             // prompt is self-contained
        } else if (!topic) {
            setError("Por favor, especifica un tema.");
            return;
        }
        setIsLoading(true);
        setError('');
        setGeneratedContent('');
        try {
            const finalPrompt = promptTemplate.replace('{TOPIC}', topic);
            const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';
            const res = await fetch(`${API_BASE}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: finalPrompt })
            });
            if (!res.ok) {
                const msg = await res.text().catch(() => '');
                throw new Error(msg || `HTTP ${res.status}`);
            }
            const data = await res.json();
            setGeneratedContent(data.text || '');
        } catch (e: any) {
            setError(`Error al contactar la IA: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCustomGenerate = () => {
        if (!customPrompt) {
             setError("Por favor, escribe un prompt detallado.");
             return;
        }
        handleGenerate(customPrompt);
    }
    
    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                <h3 style={{marginTop: 0}}>Generar Recurso Didáctico con IA</h3>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>¿Sobre qué tema o temática?</label>
                    <input style={styles.input} value={topic} onChange={e => setTopic(e.target.value)} placeholder="Ej: La gestión de la ansiedad" />
                </div>
                
                <p style={styles.label}>Elige una opción predeterminada:</p>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '1.5rem'}}>
                    {predefinedPrompts.map(p => (
                        <button key={p.name} style={{...styles.button, ...styles.buttonSecondary}} onClick={() => handleGenerate(p.prompt)} disabled={isLoading}>
                            {p.name}
                        </button>
                    ))}
                </div>

                <p style={styles.label}>O crea un prompt personalizado:</p>
                <textarea style={styles.textarea} value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="Describe detalladamente el recurso que necesitas..."/>
                <button style={{...styles.button, marginTop:'10px'}} onClick={handleCustomGenerate} disabled={isLoading}>
                    Generar con Prompt Personalizado
                </button>

                {(isLoading || generatedContent || error) && (
                    <div style={{marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem'}}>
                        {isLoading && <p>Generando contenido... <i className="fas fa-spinner fa-spin"></i></p>}
                        {error && <p style={{color: 'var(--danger-color)'}}>{error}</p>}
                        {generatedContent && (
                            <div>
                                <h4>Resultado Generado:</h4>
                                <pre style={styles.generatedCode}><code>{generatedContent}</code></pre>
                                <button style={{...styles.button, ...{backgroundColor: 'var(--success-color)'}, marginTop: '1rem'}} onClick={() => { onInsert(generatedContent); onClose(); }}>
                                    <i className="fas fa-check"></i> Insertar Recurso
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const GeneratedCourseView: FC<{ course: Course, onRestart: () => void }> = ({ course, onRestart }) => {
    const generatedCode = useMemo(() => {
        const courseObjectString = JSON.stringify({
            id: course.id,
            title: course.title,
            subtitle: course.subtitle,
            description: course.description,
            category: course.category,
            broadCategories: course.broadCategories,
            coverImage: `/images/${sanitizeForPath(course.coverImage)}`,
            instructor: course.instructor,
            learningObjectives: course.learningObjectives,
            modules: course.modules.map((mod, modIndex) => ({
                id: `m${modIndex + 1}`,
                title: mod.title,
                activities: mod.activities.map((act, actIndex) => {
                    const base = { id: `m${modIndex + 1}a${actIndex + 1}`, title: act.title, description: act.description, type: act.type };
                    switch (act.type) {
                        case 'video': return { ...base, videoSrc: `/videos/${sanitizeForPath(act.videoSrc)}` };
                        case 'audio': return { ...base, audioSrc: `/audios/${sanitizeForPath(act.audioSrc)}` };
                        case 'text': return { ...base, content: act.content };
                        case 'quiz': return { ...base, questions: act.questions };
                        case 'image': return {...base, type: 'text', content: [`<img src="/images/${sanitizeForPath(act.imageSrc)}" alt="${act.title}" style="width:100%;height:auto;border-radius:8px;" />`] };
                        case 'iframe': return {...base, type: 'iframe', content: [act.html] };
                        default: return base;
                    }
                })
            }))
        }, null, 2);

        return `import type { Course } from '../../types';\n\n// TODO: Asegúrate de importar tu instructor si es necesario\n// import { mockInstructor } from './courseData';\n\nexport const course: Course = ${courseObjectString};\n\nexport default course;`;
    }, [course]);

    const assets = useMemo(() => {
        const fileList = new Set<string>();
        fileList.add(`/images/${sanitizeForPath(course.coverImage)}`);
        course.modules.forEach(mod => {
            mod.activities.forEach(act => {
                if (act.type === 'video') fileList.add(`/videos/${sanitizeForPath(act.videoSrc)}`);
                if (act.type === 'audio') fileList.add(`/audios/${sanitizeForPath(act.audioSrc)}`);
                if (act.type === 'image') fileList.add(`/images/${sanitizeForPath(act.imageSrc)}`);
            });
        });
        return Array.from(fileList);
    }, [course]);

    const handleDownload = () => {
        const blob = new Blob([generatedCode], { type: 'text/typescript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${course.id}.ts`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div style={styles.card}>
            <h2 style={styles.h2}>¡Curso Generado Exitosamente!</h2>
            <p>El archivo <strong>{course.id}.ts</strong> está listo para ser descargado.</p>
            
            <h4>Código del Curso:</h4>
            <pre style={styles.generatedCode}><code>{generatedCode}</code></pre>
            <button style={styles.button} onClick={handleDownload}><i className="fas fa-download"></i> Descargar Archivo .ts</button>
            
            <h4 style={{marginTop: '2rem'}}>Lista de Archivos Requeridos:</h4>
            <p>Asegúrate de agregar los siguientes archivos en las carpetas `public/images`, `public/videos`, y `public/audios` de tu proyecto:</p>
            <ul style={styles.assetList}>
                {assets.map(asset => <li key={asset} style={styles.assetItem}>{asset}</li>)}
            </ul>

            <button style={{...styles.button, ...styles.buttonSecondary, marginTop: '2rem'}} onClick={onRestart}>
                <i className="fas fa-plus"></i> Crear Otro Curso
            </button>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<React.StrictMode><App /></React.StrictMode>);
