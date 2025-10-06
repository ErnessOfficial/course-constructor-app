import React, { useState, useCallback, useMemo, FC, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
// Gemini calls are proxied via our backend at /api/generate
import { KindeProvider, useKindeAuth } from '@kinde-oss/kinde-auth-react';

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
interface ModulePart { id: string; title: string; resources: Activity[]; }
interface Module { id: string; title: string; parts: ModulePart[]; }
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
    buttonTiny: { backgroundColor: 'var(--secondary-color)', color: 'white', border: 'none', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 },
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
    const { user, login, logout } = (useKindeAuth() as any) || {};
    const uid = user?.id || user?.sub || user?.email || 'anon';
    const profileKey = `profile:${uid}`;
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [profile, setProfile] = useState<ProfileData>({ firstName: '', lastName: '', company: '', email: '', username: '' });

    const IS_GH_PAGES = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
    const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';
    const [aiAvailable, setAiAvailable] = useState<boolean>(!IS_GH_PAGES || Boolean(API_BASE));

    useEffect(() => {
        let cancelled = false;
        const probe = async () => {
            if (IS_GH_PAGES && !API_BASE) {
                setAiAvailable(false);
                return; // evita 404 en GitHub Pages sin backend
            }
            try {
                const res = await fetch(`${API_BASE}/api/health`, { method: 'GET' });
                if (!res.ok) throw new Error('health not ok');
                const j = await res.json();
                if (!cancelled) setAiAvailable(Boolean(j?.ok));
            } catch {
                if (!cancelled) setAiAvailable(false);
            }
        };
        probe();
        return () => { cancelled = true; };
    }, [API_BASE, IS_GH_PAGES]);

    useEffect(() => {
        // Cargar perfil
        try {
            const raw = localStorage.getItem(profileKey);
            if (raw) setProfile(JSON.parse(raw));
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileKey]);

    const handleTestAI = async () => {
        try {
            setTestingAI(true);
            const res = await fetch(`${API_BASE}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'Responde exactamente: PONG' })
            });
            if (!res.ok) {
                let msg = `HTTP ${res.status}`;
                try {
                    const err = await res.json();
                    if (err?.error) msg = err.error;
                } catch {}
                throw new Error(msg);
            }
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

    useEffect(() => {
        // Cargar cursos persistidos
        try {
            const raw = localStorage.getItem('courses:v1');
            if (raw) setCourses(JSON.parse(raw));
        } catch {}
    }, []);

    useEffect(() => {
        // Persistir cursos ante cambios
        try { localStorage.setItem('courses:v1', JSON.stringify(courses)); } catch {}
    }, [courses]);

    const handleCreateNew = () => {
        setCurrentCourse(JSON.parse(JSON.stringify(initialCourseState)));
        setStep(1);
        setView('create');
    };

    const handleBackToList = () => {
        setView('list');
        setCurrentCourse(null);
    };

    const upsertCourse = (courseData: Course) => {
        const slug = slugify(courseData.title);
        const id = slug || courseData.id || `curso-${Date.now()}`;
        const finalCourseData: Course = {
            ...courseData,
            id,
            coverImage: `${slug || 'curso'}_portada.png`,
        };
        setCourses(prev => {
            const idx = prev.findIndex(c => c.id === id);
            if (idx >= 0) {
                const next = prev.slice();
                next[idx] = finalCourseData;
                return next;
            }
            return [...prev, finalCourseData];
        });
        return finalCourseData;
    };

    const handleFormSubmit = (courseData: Course) => {
        const slug = slugify(courseData.title);
        const finalCourseData: Course = {
            ...courseData,
            id: slug || `curso-${Date.now()}`,
            coverImage: `${slug || 'curso'}_portada.png`,
            modules: courseData.modules.map((m, i) => ({ id: `m${i + 1}`, title: m.title, parts: [] })),
        };
        setCurrentCourse(finalCourseData);
        setStep(2);
    };

    const handleSaveAndExit = (courseData: Course) => {
        const slug = slugify(courseData.title);
        const finalCourseData: Course = {
            ...courseData,
            id: slug || `curso-${Date.now()}`,
            coverImage: `${slug || 'curso'}_portada.png`,
            modules: courseData.modules.map((m, i) => ({ id: `m${i + 1}`, title: m.title, parts: [] })),
        };
        setCourses(prevCourses => [...prevCourses, finalCourseData]);
        setView('list');
        setCurrentCourse(null);
    };

    const handleSaveDraft = (courseData: Course) => {
        const saved = upsertCourse(courseData);
        setCurrentCourse(saved);
    };

    const handleAutoSave = (courseData: Course) => {
        upsertCourse(courseData);
    };

    const handleFinishEditing = (finalCourse: Course) => {
        setCurrentCourse(finalCourse);
        setStep(3);
    };

    const displayName = (profile.firstName || profile.lastName) ? `${profile.firstName} ${profile.lastName}`.trim() : (user?.name || user?.given_name || user?.email || 'Usuario');
    const avatarUrl = profile.avatarDataUrl || '/images/avatars/default.png';

    return (
        <div style={styles.appContainer}>
            <header style={{ ...styles.header, borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img src="/logo_animikoding.png" alt="AnImiKoding" style={{ maxHeight: 80, height: '80px', width: 'auto' }} />
                        <p style={{ ...styles.mutedColor, margin: 0 }}>Diseña cursos de bienestar emocional con asistencia de IA</p>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <button type="button" onClick={() => setSettingsOpen(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}>
                            <img src={avatarUrl} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                            <span style={{ fontSize: '0.9rem' }}>{displayName}</span>
                            <i className="fas fa-cog" />
                        </button>
                        {settingsOpen && (
                            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: 'white', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: 'var(--shadow-md)', minWidth: 240, zIndex: 10 }}>
                                <button style={{ ...styles.buttonTiny, display: 'block', width: '100%', textAlign: 'left', background: 'transparent', color: 'inherit' }} onClick={() => { setProfileModalOpen(true); setSettingsOpen(false); }}>Editar perfil</button>
                                <button style={{ ...styles.buttonTiny, display: 'block', width: '100%', textAlign: 'left', background: 'transparent', color: 'inherit' }} disabled={testingAI || !aiAvailable} onClick={() => { setSettingsOpen(false); handleTestAI(); }}>{testingAI ? 'Probando IA…' : 'Probar IA'}</button>
                                <button style={{ ...styles.buttonTiny, display: 'block', width: '100%', textAlign: 'left', background: 'transparent', color: 'inherit' }} onClick={() => { setSettingsOpen(false); login?.(); }}>Cambiar de cuenta</button>
                                <button style={{ ...styles.buttonTiny, display: 'block', width: '100%', textAlign: 'left', background: 'transparent', color: 'inherit' }} onClick={() => { setSettingsOpen(false); logout?.(); }}>Cerrar sesión</button>
                            </div>
                        )}
                    </div>
                </div>
                {IS_GH_PAGES && !API_BASE && (
                    <p style={{color: '#dc3545', marginTop: '0.5rem'}}>
                        Atención: Estás en GitHub Pages sin backend configurado. Define el secret <code>VITE_API_BASE</code> con la URL de tu backend o usa el despliegue en Vercel.
                    </p>
                )}
            </header>
            
            {view === 'list' && (
                <CourseList
                    courses={courses}
                    onCreateNew={handleCreateNew}
                    onEdit={(c) => { setCurrentCourse(JSON.parse(JSON.stringify(c))); setStep(1); setView('create'); }}
                    onContinue={(c) => { setCurrentCourse(JSON.parse(JSON.stringify(c))); setStep(2); setView('create'); }}
                    onDelete={(id) => setCourses(prev => prev.filter(c => c.id !== id))}
                />
            )}
            
            {view === 'create' && currentCourse && (
                <>
                    {step === 1 && <CourseForm course={currentCourse} onSubmit={handleFormSubmit} onCancel={handleBackToList} onSaveAndExit={handleSaveAndExit} onSaveDraft={handleSaveDraft} onAutoSave={handleAutoSave} />}
                    {step === 2 && <ModuleEditor course={currentCourse} onFinish={handleFinishEditing} />}
                    {step === 3 && <GeneratedCourseView course={currentCourse} onRestart={handleCreateNew} />}
                </>
            )}
        </div>
    );
};

// --- SUB-COMPONENTS ---

const CourseList: FC<{ courses: Course[], onCreateNew: () => void, onEdit: (c: Course) => void, onContinue: (c: Course) => void, onDelete: (id: string) => void }> = ({ courses, onCreateNew, onEdit, onContinue, onDelete }) => (
    <div style={styles.card}>
        <h2 style={styles.h2}>Mis Cursos</h2>
        {courses.length === 0 ? (
            <p>Aún no has creado ningún curso.</p>
        ) : (
            <div style={{ display: 'grid', gap: 8 }}>
                {courses.map(c => (
                    <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: 8, padding: '8px 12px' }}>
                        <div>
                            <div style={{ fontWeight: 600 }}>{c.title || c.id}</div>
                            <div style={{ color: 'var(--muted-color)', fontSize: '0.9rem' }}>{c.subtitle || c.category}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button style={{...styles.buttonTiny}} onClick={() => onContinue(c)} title="Acceder / Continuar edición">Acceder</button>
                            <button style={{...styles.buttonTiny}} onClick={() => onEdit(c)} title="Editar ficha">Editar</button>
                            <button style={{...styles.buttonTiny, backgroundColor: 'var(--danger-color)'}} onClick={() => { if (confirm(`¿Seguro que deseas borrar el curso "${c.title || c.id}"? Esta acción no se puede deshacer.`)) { onDelete(c.id); } }} title="Eliminar curso">Borrar</button>
                        </div>
                    </div>
                ))}
            </div>
        )}
        <div style={{ marginTop: 12 }}>
            <button style={styles.button} onClick={onCreateNew}>
                <i className="fas fa-plus"></i> Crear Nuevo Curso
            </button>
        </div>
    </div>
);

const CourseForm: FC<{ course: Course, onSubmit: (data: Course) => void, onCancel: () => void, onSaveAndExit: (data: Course) => void, onSaveDraft?: (data: Course) => void, onAutoSave?: (data: Course) => void }> = ({ course, onSubmit, onCancel, onSaveAndExit, onSaveDraft, onAutoSave }) => {
    const [data, setData] = useState(course);
    const [tagInput, setTagInput] = useState('');
    const [genLoading, setGenLoading] = useState<Record<number, boolean>>({});
    const [genAllLoading, setGenAllLoading] = useState(false);
    const [autoSaveActive, setAutoSaveActive] = useState(false);
    const [autoSaveMsg, setAutoSaveMsg] = useState('');
    const [autoSaving, setAutoSaving] = useState(false);
    const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';
    const dataRef = React.useRef(data);
    const autoIntervalRef = React.useRef<number | null>(null);

    useEffect(() => { dataRef.current = data; }, [data]);

    useEffect(() => {
        if (!onAutoSave) return;
        if (autoSaveActive && autoIntervalRef.current == null) {
            autoIntervalRef.current = window.setInterval(() => {
                try {
                    setAutoSaving(true);
                    onAutoSave({ ...dataRef.current });
                    setAutoSaveMsg('Guardado automáticamente');
                    setTimeout(() => setAutoSaveMsg(''), 1500);
                    setAutoSaving(false);
                } catch {}
            }, 5000);
        }
        if (!autoSaveActive && autoIntervalRef.current != null) {
            clearInterval(autoIntervalRef.current);
            autoIntervalRef.current = null;
        }
        return () => {
            if (autoIntervalRef.current != null) { clearInterval(autoIntervalRef.current); autoIntervalRef.current = null; }
        };
    }, [autoSaveActive, onAutoSave]);
    
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
        if (e.key === 'Enter' && tagInput.trim() !== '' && data.broadCategories.length < 10) {
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
                modules: [...prev.modules, { id: '', title: `Módulo ${prev.modules.length + 1}`, parts: [] }],
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

    const handleSaveAndExit = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveAndExit(data);
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
                <label style={styles.label}>Etiquetas (máx. 10)</label>
                <div>
                    {data.broadCategories.map(tag => 
                      <span key={tag} style={styles.tag}>
                        {tag} <i className="fas fa-times" style={{cursor: 'pointer', marginLeft: '5px'}} onClick={() => removeTag(tag)} />
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
                <small style={{ color: 'var(--muted-color)' }}>
                    ¿Quieres ayuda de la IA para redactar los objetivos de cada módulo? Haz clic en el botón de la derecha que aparece junto a cada objetivo. Si el título del módulo está vacío, la IA también podrá sugerir un nombre de módulo basado en el nombre del curso.
                </small>
                <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '8px 0' }}>
                        <button type="button" style={styles.buttonTiny} disabled={genAllLoading}
                        title="Generar 4 módulos con objetivos a partir del título del curso"
                        onClick={async () => {
                            try {
                                setGenAllLoading(true);
                                const tituloCurso = (data.title || '').trim() || 'Curso de bienestar emocional';
                                const subt = (data.subtitle || '').trim();
                                const tituloCompleto = subt ? `${tituloCurso}: ${subt}` : tituloCurso;
                                const prompt = `Actúa como un Diseñador Curricular Senior y experto en la creación de microcursos online con la metodología de Aprendizaje Reflexivo-Emocional.\n\nTu tarea es la siguiente:\n\n1.  Analiza el título del microcurso que te proporcionaré.\n2.  Define la estructura completa del curso, dividiéndolo en 4 módulos (no más, no menos).\n3.  Genera un título creativo y descriptivo para cada uno de los 4 módulos, asegurándote de que los títulos cubran progresivamente el tema central.\n4.  Para cada módulo, redacta un objetivo de aprendizaje único.\n\nReglas Cruciales para los Objetivos:\n\n* Deben ser breves, concisos y reflejar el enfoque reflexivo/emocional del aprendizaje.\n* Deben estar redactados en segunda persona del singular (dirigidos directamente al participante, usando 'podrás', 'conocerás', 'lograrás', 'identificarás', etc.).\n* EVITA la repetición de verbos y estructuras gramaticales entre los 4 objetivos. Cada objetivo debe sonar fresco y diferente al anterior, aunque todos sean coherentes con el contexto del módulo.\n\nTítulo del Microcurso: "${tituloCompleto}"\n\n---\nFormato de Salida Requerido:\n\nMÓDULO 1: [Título del Módulo 1]\nObjetivo: [Objetivo Único y Directo]\n\nMÓDULO 2: [Título del Módulo 2]\nObjetivo: [Objetivo Único y Directo]\n\nMÓDULO 3: [Título del Módulo 3]\nObjetivo: [Objetivo Único y Directo]\n\nMÓDULO 4: [Título del Módulo 4]\nObjetivo: [Objetivo Único y Directo]`;
                                const res = await fetch(`${API_BASE}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
                                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                const json = await res.json();
                                const text: string = String(json?.text || '');
                                // limpiar fences y parsear bloques
                                const cleaned = text.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g,''));
                                const re = /(M[ÓO]DULO)\s*(\d)\s*:\s*([^\n\r]+)[\s\S]*?Objetivo\s*:\s*([^\n\r]+)/gi;
                                const mods: { n: number, title: string, objective: string }[] = [];
                                let m: RegExpExecArray | null;
                                while ((m = re.exec(cleaned))) {
                                    const n = parseInt(m[2], 10);
                                    const title = m[3].trim();
                                    const objective = m[4].trim();
                                    if (n >= 1 && n <= 4) mods.push({ n, title, objective });
                                }
                                if (mods.length >= 1) {
                                    mods.sort((a,b) => a.n - b.n);
                                    setData(prev => {
                                        const next = { ...prev } as Course;
                                        next.modules = mods.slice(0,4).map((x, i) => ({ id: `m${i+1}`, title: x.title, parts: [] }));
                                        next.learningObjectives = mods.slice(0,4).map(x => x.objective);
                                        return next;
                                    });
                                } else {
                                    alert('No se pudo interpretar la respuesta. Intenta nuevamente.');
                                }
                            } catch (e: any) {
                                alert(`Error generando módulos y objetivos: ${e?.message || e}`);
                            } finally {
                                setGenAllLoading(false);
                            }
                        }}>Sugerir todos</button>
                </div>
                {data.modules.map((mod, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                        <input style={styles.input} value={mod.title} onChange={e => handleModuleChange(i, e.target.value)} placeholder={`Nombre del Módulo ${i + 1}`} />
                        <input style={styles.input} value={data.learningObjectives[i]} onChange={e => handleObjectiveChange(i, e.target.value)} placeholder={`Objetivo de aprendizaje para el Módulo ${i+1}`} />
                        <button
                            type="button"
                            style={styles.buttonTiny}
                            title={(mod.title || '').trim() ? 'Sugerir objetivo con IA' : 'Sugerir nombre de módulo y objetivo con IA'}
                            aria-label={`Sugerir objetivo del Módulo ${i + 1} con IA`}
                            onClick={async () => {
                                try {
                                    setGenLoading(prev => ({ ...prev, [i]: true }));
                                    const tituloModulo = (mod.title || '').trim();
                                    const tituloCurso = (data.title || '').trim() || 'Curso de bienestar emocional';
                                    const prompt = tituloModulo
                                      ? `Actúa como un diseñador instruccional experto en la metodología de aprendizaje reflexivo-emocional.\n\nTu tarea es generar un objetivo de aprendizaje breve, adecuado y conciso para el módulo de un curso online interactivo, basándote únicamente en el título del módulo que te proporcionaré.\n\nEl objetivo debe estar redactado en segunda persona del singular (dirigido directamente al participante, usando 'podrás', 'conocerás', 'lograrás', 'identificarás', etc.), manteniendo un tono directo y motivador.\n\nCrucial: El objetivo debe reflejar la naturaleza emocional y/o reflexiva del aprendizaje. Asegúrate de que la redacción y los verbos utilizados sean siempre diferentes a los de otros objetivos, para evitar la repetición en series de módulos.\n\nTítulo del Módulo: "${tituloModulo}"`
                                      : `Eres experto en diseño instruccional. Sugiéreme un nombre de módulo y un objetivo de aprendizaje claros, concretos y medibles para un curso interactivo sobre bienestar emocional. Responde SOLO como JSON sin backticks con el formato {"moduleTitle": string, "objective": string} en español. Contexto: Curso: "${tituloCurso}".`;
                                    const res = await fetch(`${API_BASE}/api/generate`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ prompt })
                                    });
                                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                    const json = await res.json();
                                    let payload: string = (json?.text || '').trim();
                                    let newModuleTitle = '';
                                    let newObjective = '';
                                    if (tituloModulo) {
                                      newObjective = payload.replace(/^\"+|\"+$/g, '').replace(/^'+|'+$/g, '');
                                    } else {
                                      const cleaned = payload.replace(/^```(?:json)?/i, '').replace(/```$/,'').trim();
                                      try {
                                        const obj = JSON.parse(cleaned);
                                        newModuleTitle = String(obj.moduleTitle || '').trim();
                                        newObjective = String(obj.objective || '').trim();
                                      } catch {
                                        newObjective = cleaned;
                                      }
                                    }
                                    setData(prev => {
                                      const next = { ...prev } as Course;
                                      const los = [...(next.learningObjectives || [])];
                                      los[i] = newObjective || los[i] || '';
                                      if (!tituloModulo && newModuleTitle) {
                                        const mods = [...next.modules];
                                        const cur = { ...mods[i], title: newModuleTitle };
                                        mods[i] = cur;
                                        return { ...next, learningObjectives: los, modules: mods };
                                      }
                                      return { ...next, learningObjectives: los };
                                    });
                                } catch (e: any) {
                                    alert(`No se pudo generar el objetivo: ${e?.message || e}`);
                                } finally {
                                    setGenLoading(prev => ({ ...prev, [i]: false }));
                                }
                            }}
                            disabled={!!genLoading[i]}
                        >
                            {genLoading[i] ? '...' : 'IA'}
                        </button>
                    </div>
                ))}
                {data.modules.length < 6 && <button type="button" style={{...styles.button, ...styles.buttonSecondary, padding:'8px 16px'}} onClick={handleAddModule}><i className="fas fa-plus"></i> Añadir Módulo</button>}
            </div>
            
            <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: '2rem', flexWrap: 'wrap'}}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button type="button" style={{...styles.button, ...styles.buttonSecondary}} onClick={onCancel}>Cancelar</button>
                    <button type="button" style={{...styles.button, ...styles.buttonSecondary}}
                        onClick={() => { if (onSaveDraft) { onSaveDraft({ ...data }); setAutoSaveActive(true); setAutoSaveMsg('Guardado'); setTimeout(() => setAutoSaveMsg(''), 1200); } }}
                        title="Guardar en la lista y activar autoguardado periódico">
                        Guardar
                    </button>
                    {autoSaveActive && (
                        <span style={{ color: 'var(--muted-color)', alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {autoSaving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />}
                            {autoSaving ? 'Guardando…' : (autoSaveMsg || 'Autoguardado activado')}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button type="button" style={{...styles.button, ...styles.buttonSecondary}} onClick={handleSaveAndExit}>Guardar y Salir</button>
                    <button type="submit" style={styles.button}>Guardar y Continuar <i className="fas fa-arrow-right"></i></button>
                </div>
            </div>
        </form>
    );
};

const ModuleEditor: FC<{ course: Course, onFinish: (data: Course) => void }> = ({ course, onFinish }) => {
    const [currentCourse, setCurrentCourse] = useState(course);
    const [activeModuleIndex, setActiveModuleIndex] = useState(0);
    const [activePartIndex, setActivePartIndex] = useState(0);
    const [geminiTarget, setGeminiTarget] = useState<{ modIndex: number, partIndex: number, resIndex: number } | null>(null);

    const ensureAtLeastOnePart = (courseState: Course, modIndex: number) => {
        if (!courseState.modules[modIndex].parts) courseState.modules[modIndex].parts = [];
        if (courseState.modules[modIndex].parts.length === 0) {
            courseState.modules[modIndex].parts.push({ id: `m${modIndex + 1}p1`, title: 'Parte 1', resources: [] });
        }
    };

    const addPart = () => {
        const modIndex = activeModuleIndex;
        const newCourse = { ...currentCourse };
        const parts = newCourse.modules[modIndex].parts || [];
        const nextNum = parts.length + 1;
        parts.push({ id: `m${modIndex + 1}p${nextNum}`, title: `Parte ${nextNum}`, resources: [] });
        newCourse.modules[modIndex].parts = parts;
        setCurrentCourse(newCourse);
        setActivePartIndex(parts.length - 1);
    };

    const removeResource = (modIndex: number, partIndex: number, resIndex: number) => {
        const newCourse = { ...currentCourse };
        ensureAtLeastOnePart(newCourse, modIndex);
        const resources = newCourse.modules[modIndex].parts[partIndex].resources || [];
        resources.splice(resIndex, 1);
        newCourse.modules[modIndex].parts[partIndex].resources = resources.map((r, idx) => ({ ...r, id: `m${modIndex + 1}p${partIndex + 1}r${idx + 1}` }));
        setCurrentCourse(newCourse);
        setGeminiTarget(null);
    };

    const moveResource = (modIndex: number, partIndex: number, resIndex: number, direction: 'up' | 'down') => {
        const newCourse = { ...currentCourse };
        ensureAtLeastOnePart(newCourse, modIndex);
        const resources = newCourse.modules[modIndex].parts[partIndex].resources || [];
        const targetIndex = direction === 'up' ? resIndex - 1 : resIndex + 1;
        if (targetIndex < 0 || targetIndex >= resources.length) return;
        const temp = resources[resIndex];
        resources[resIndex] = resources[targetIndex];
        resources[targetIndex] = temp;
        newCourse.modules[modIndex].parts[partIndex].resources = resources.map((r, idx) => ({ ...r, id: `m${modIndex + 1}p${partIndex + 1}r${idx + 1}` }));
        setCurrentCourse(newCourse);
    };

    const updateResource = (modIndex: number, partIndex: number, resIndex: number, updatedActivity: Activity) => {
        const newCourse = { ...currentCourse };
        ensureAtLeastOnePart(newCourse, modIndex);
        newCourse.modules[modIndex].parts[partIndex].resources[resIndex] = updatedActivity;
        setCurrentCourse(newCourse);
    };

    const addActivity = (type: ActivityType, openAiModal: boolean = false) => {
        const modIndex = activeModuleIndex;
        const newCourse = { ...currentCourse };
        ensureAtLeastOnePart(newCourse, modIndex);
        const partIndex = activePartIndex;
        const resources = newCourse.modules[modIndex].parts[partIndex].resources;
        const newActivity: Activity = {
            id: `m${modIndex + 1}p${partIndex + 1}r${resources.length + 1}`,
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
        newCourse.modules[modIndex].parts[partIndex].resources.push(newActivity);
        setCurrentCourse(newCourse);

        if (openAiModal) {
            setGeminiTarget({ modIndex, partIndex, resIndex: resources.length });
        }
    };
    
    const handleGeminiInsert = (content: string) => {
        if (!geminiTarget) return;
        
        const { modIndex, partIndex, resIndex } = geminiTarget;
        const activity = currentCourse.modules[modIndex].parts[partIndex].resources[resIndex];

        if (activity.type === 'quiz') {
            try {
                // Sanitize content before parsing
                const sanitizedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
                const questions = JSON.parse(sanitizedContent);
                if (Array.isArray(questions) && questions.length > 0) {
                    updateResource(modIndex, partIndex, resIndex, { ...activity, questions });
                } else {
                    alert("La IA no generó preguntas válidas. Inténtalo de nuevo.");
                }
            } catch (e) {
                alert("Error al procesar el JSON del Quiz. Revisa el formato.");
            }
        } else if (activity.type === 'iframe') {
            updateResource(modIndex, partIndex, resIndex, { ...activity, html: content });
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
                {/* Partes del módulo */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {(currentCourse.modules[activeModuleIndex].parts || []).map((part, pIndex) => (
                        <div key={part.id} style={pIndex === activePartIndex ? { ...styles.tag, backgroundColor: 'var(--primary-color)', color: 'white', cursor: 'pointer' } : { ...styles.tag, cursor: 'pointer' }} onClick={() => setActivePartIndex(pIndex)}>
                            {part.title}
                        </div>
                    ))}
                    <button style={{...styles.button, ...styles.buttonSecondary, padding: '6px 12px'}} type="button" onClick={addPart}>
                        <i className="fas fa-plus"></i> Añadir Parte
                    </button>
                </div>

                {/* Recursos de la parte activa */}
                {(currentCourse.modules[activeModuleIndex].parts && currentCourse.modules[activeModuleIndex].parts.length > 0) &&
                 currentCourse.modules[activeModuleIndex].parts[activePartIndex].resources.map((act, resIndex, arr) => (
                    <div key={`${act.id}-${resIndex}`} style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '6px' }}>
                            <button
                                title="Subir"
                                style={{...styles.button, ...styles.buttonSecondary, padding: '6px 10px'}}
                                disabled={resIndex === 0}
                                onClick={() => moveResource(activeModuleIndex, activePartIndex, resIndex, 'up')}
                                type="button"
                            >
                                <i className="fas fa-arrow-up"></i>
                            </button>
                            <button
                                title="Bajar"
                                style={{...styles.button, ...styles.buttonSecondary, padding: '6px 10px'}}
                                disabled={resIndex === arr.length - 1}
                                onClick={() => moveResource(activeModuleIndex, activePartIndex, resIndex, 'down')}
                                type="button"
                            >
                                <i className="fas fa-arrow-down"></i>
                            </button>
                            <button
                                title="Eliminar"
                                style={{...styles.button, ...styles.buttonDanger, padding: '6px 10px'}}
                                onClick={() => removeResource(activeModuleIndex, activePartIndex, resIndex)}
                                type="button"
                            >
                                <i className="fas fa-trash"></i>
                            </button>
                        </div>
                        <ActivityEditor 
                            activity={act}
                            onChange={(updated) => updateResource(activeModuleIndex, activePartIndex, resIndex, updated)}
                            onGenerateWithAI={() => setGeminiTarget({ modIndex: activeModuleIndex, partIndex: activePartIndex, resIndex })}
                        />
                    </div>
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
                <RichTextEditor
                  valueHTML={Array.isArray(activity.content) ? (activity.content.find(c => c.includes('<')) || activity.content.map(p => `<p>${p}</p>`).join('\n')) : ''}
                  onChangeHTML={(html) => handleChange('content', [html])}
                />
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

// --- SIMPLE RICH TEXT EDITOR FOR TEXT RESOURCES ---
const toolbarButtonStyle: React.CSSProperties = { padding: '6px 10px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', cursor: 'pointer', borderRadius: 6 };

const RichTextEditor: FC<{ valueHTML: string; onChangeHTML: (html: string) => void }> = ({ valueHTML, onChangeHTML }) => {
    const editorRef = React.useRef<HTMLDivElement | null>(null);
    const [html, setHtml] = useState<string>(valueHTML || '<p>Escribe aquí tu contenido.</p>');

    useEffect(() => {
        setHtml(valueHTML || '<p>Escribe aquí tu contenido.</p>');
    }, [valueHTML]);

    const applyCmd = (cmd: string, val?: string) => {
        // execCommand está deprecado pero sigue ampliamente soportado y sirve para nuestro caso simple
        document.execCommand(cmd, false, val);
        syncHtml();
    };

    const wrapSelection = (tag: 'mark') => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        const el = document.createElement(tag);
        el.setAttribute('style', 'background-color: #fff3a0;');
        range.surroundContents(el);
        syncHtml();
    };

    const setBlock = (block: 'H1' | 'H2' | 'H3' | 'P') => {
        document.execCommand('formatBlock', false, block);
        // Ajustes de estilo mínimos acorde a la app
        const node = editorRef.current;
        if (node) {
            node.querySelectorAll('h1').forEach(n => (n as HTMLElement).style.cssText = 'font-size: 1.75rem; color: var(--text-color); margin: 0.5rem 0;');
            node.querySelectorAll('h2').forEach(n => (n as HTMLElement).style.cssText = 'font-size: 1.35rem; color: var(--text-color); margin: 0.5rem 0;');
            node.querySelectorAll('h3').forEach(n => (n as HTMLElement).style.cssText = 'font-size: 1.15rem; color: var(--text-color); margin: 0.5rem 0;');
            node.querySelectorAll('p').forEach(n => (n as HTMLElement).style.cssText = 'font-size: 1rem; color: var(--text-color); line-height: 1.6;');
        }
        syncHtml();
    };

    const syncHtml = () => {
        const node = editorRef.current;
        if (!node) return;
        const newHtml = node.innerHTML;
        setHtml(newHtml);
        onChangeHTML(newHtml);
    };

    return (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: 8, padding: 8, borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                <button type="button" title="Negrita" style={toolbarButtonStyle} onClick={() => applyCmd('bold')}><i className="fas fa-bold"></i></button>
                <button type="button" title="Cursiva" style={toolbarButtonStyle} onClick={() => applyCmd('italic')}><i className="fas fa-italic"></i></button>
                <button type="button" title="Subrayado" style={toolbarButtonStyle} onClick={() => applyCmd('underline')}><i className="fas fa-underline"></i></button>
                <button type="button" title="Resaltado" style={toolbarButtonStyle} onClick={() => wrapSelection('mark')}><i className="fas fa-highlighter"></i></button>
                <div style={{ width: 1, background: 'var(--border-color)' }} />
                <button type="button" title="Nivel 1 - Título" style={toolbarButtonStyle} onClick={() => setBlock('H1')}>H1</button>
                <button type="button" title="Nivel 2 - Subtítulo" style={toolbarButtonStyle} onClick={() => setBlock('H2')}>H2</button>
                <button type="button" title="Nivel 3 - Encabezado" style={toolbarButtonStyle} onClick={() => setBlock('H3')}>H3</button>
                <button type="button" title="Nivel 4 - Texto" style={toolbarButtonStyle} onClick={() => setBlock('P')}>P</button>
            </div>
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={syncHtml}
                onBlur={syncHtml}
                style={{ minHeight: 140, padding: 12, outline: 'none' }}
                dangerouslySetInnerHTML={{ __html: html }}
            />
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
        { name: "Quiz de 3 Preguntas", prompt: `Crea un quiz interactivo sobre el tema '{TOPIC}'. El quiz debe tener 3 preguntas de opción múltiple con 3 opciones cada una. Para cada opción, proporciona un feedback explicando por qué es correcta o incorrecta. Responde únicamente con un objeto JSON que siga esta estructura de TypeScript: 
interface QuizQuestion { question: string; options: { text: string; feedback: string; }[]; }[]
. No incluyas backticks de markdown en tu respuesta.` },
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
                parts: (mod.parts || []).map((part, pIndex) => ({
                    id: `m${modIndex + 1}p${pIndex + 1}`,
                    title: part.title,
                    resources: (part.resources || []).map((act, rIndex) => {
                        const base = { id: `m${modIndex + 1}p${pIndex + 1}r${rIndex + 1}`, title: act.title, description: act.description, type: act.type };
                        switch (act.type) {
                            case 'video': return { ...base, videoSrc: `/videos/${sanitizeForPath(act.videoSrc)}` };
                            case 'audio': return { ...base, audioSrc: `/audios/${sanitizeForPath(act.audioSrc)}` };
                            case 'text': return { ...base, content: act.content };
                            case 'quiz': return { ...base, questions: act.questions };
                            case 'image': return { ...base, type: 'text', content: [`<img src="/images/${sanitizeForPath(act.imageSrc)}" alt="${act.title}" style="width:100%;height:auto;border-radius:8px;" />`] };
                            case 'iframe': return { ...base, type: 'iframe', content: [act.html] };
                            default: return base;
                        }
                    })
                }))
            }))
        }, null, 2);

        return `import type { Course } from '../../types';\n\n// TODO: Asegúrate de importar tu instructor si es necesario\n// import { mockInstructor } from './courseData';\n\nexport const course: Course = ${courseObjectString};\n\nexport default course;`;
    }, [course]);

    const assets = useMemo(() => {
        const fileList = new Set<string>();
        fileList.add(`/images/${sanitizeForPath(course.coverImage)}`);
        course.modules.forEach(mod => {
            (mod.parts || []).forEach(part => {
                (part.resources || []).forEach(act => {
                    if (act.type === 'video') fileList.add(`/videos/${sanitizeForPath(act.videoSrc)}`);
                    if (act.type === 'audio') fileList.add(`/audios/${sanitizeForPath(act.audioSrc)}`);
                    if (act.type === 'image') fileList.add(`/images/${sanitizeForPath(act.imageSrc)}`);
                });
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

// --- AUTH GATE & SETUP ---
interface ProfileData { firstName: string; lastName: string; company?: string; email: string; username: string; avatarDataUrl?: string; }

const AuthGate: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user, login, register } = useKindeAuth() as any;
  const [needsProfile, setNeedsProfile] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({ firstName: '', lastName: '', company: '', email: '', username: '' });

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    const uid = user?.id || user?.sub || user?.email || 'anon';
    const key = `profile:${uid}`;
    const stored = localStorage.getItem(key);
    if (!stored) {
      setProfile({
        firstName: user?.given_name || '',
        lastName: user?.family_name || '',
        company: '',
        email: user?.email || '',
        username: (user?.preferred_username || user?.email?.split('@')[0] || '').toLowerCase(),
      });
      setNeedsProfile(true);
    } else {
      setNeedsProfile(false);
    }
  }, [isAuthenticated, isLoading, user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfile(prev => ({ ...prev, avatarDataUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const uid = user?.id || user?.sub || user?.email || 'anon';
    const key = `profile:${uid}`;
    localStorage.setItem(key, JSON.stringify(profile));
    setNeedsProfile(false);
  };

  if (isLoading) return <div style={{ padding: 24 }}>Cargando autenticación...</div>;
  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: 720, margin: '40px auto', background: 'var(--surface-color)', padding: 24, borderRadius: 12, boxShadow: 'var(--shadow-md)', textAlign: 'center' }}>
        <h2 style={{ marginTop: 0 }}>Bienvenido a AnImiKoding by AnImiK</h2>
        <p style={{ margin: '8px 0 16px 0' }}>
          Bienestar Emocional a la velocidad de la IA. Crea automáticamente cursos por módulos con ayuda de la IA en nuestra aplicación y genera el código optimizado (.ts o .html) sin tener que programar, para que puedas lanzarlos sin límites ni demoras técnicas.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <button style={styles.button} type="button" onClick={register}><i className="fas fa-user-plus"></i> Registrarse</button>
          <button style={{ ...styles.button, ...styles.buttonSecondary }} type="button" onClick={login}><i className="fas fa-sign-in-alt"></i> Iniciar sesión</button>
        </div>
        <div style={{ marginTop: 24 }}>
          <img src="/logo_animikoding.png" alt="AnImiKoding" style={{ maxWidth: 360, width: '100%', height: 'auto' }} />
        </div>
      </div>
    );
  }

  if (needsProfile) {
    return (
      <div style={{ maxWidth: 720, margin: '40px auto', background: 'var(--surface-color)', padding: 24, borderRadius: 12, boxShadow: 'var(--shadow-md)' }}>
        <h2 style={{ marginTop: 0 }}>Completa tu perfil</h2>
        <form onSubmit={handleProfileSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={styles.label}>Nombre</label>
              <input style={styles.input} value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })} required />
            </div>
            <div>
              <label style={styles.label}>Apellido</label>
              <input style={styles.input} value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })} required />
            </div>
            <div>
              <label style={styles.label}>Empresa (opcional)</label>
              <input style={styles.input} value={profile.company} onChange={e => setProfile({ ...profile, company: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Correo electrónico</label>
              <input style={styles.input} type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} required />
            </div>
            <div>
              <label style={styles.label}>Nombre de usuario</label>
              <input style={styles.input} value={profile.username} onChange={e => setProfile({ ...profile, username: e.target.value })} required />
            </div>
            <div>
              <label style={styles.label}>Avatar / Foto</label>
              <input style={styles.input} type="file" accept="image/*" onChange={handleAvatarChange} />
              {profile.avatarDataUrl && <img src={profile.avatarDataUrl} alt="avatar" style={{ marginTop: 8, width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button style={styles.button} type="submit">Guardar perfil</button>
          </div>
        </form>
      </div>
    );
  }

  return <>{children}</>;
};

const KindeWrappedApp: FC = () => {
  const domain = (import.meta as any).env?.VITE_KINDE_DOMAIN || 'https://animikrea.kinde.com';
  const clientId = (import.meta as any).env?.VITE_KINDE_CLIENT_ID || '499609149459408789fc958770cd4375';
  const redirectUri = (import.meta as any).env?.VITE_KINDE_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const logoutUri = (import.meta as any).env?.VITE_KINDE_LOGOUT_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const scope = (import.meta as any).env?.VITE_KINDE_SCOPE || 'openid profile email';
  const audience = (import.meta as any).env?.VITE_KINDE_AUDIENCE || '';

  return (
    <KindeProvider domain={domain} clientId={clientId} redirectUri={redirectUri} logoutUri={logoutUri} scope={scope} audience={audience}>
      <AuthGate>
        <App />
      </AuthGate>
    </KindeProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<React.StrictMode><KindeWrappedApp /></React.StrictMode>);
