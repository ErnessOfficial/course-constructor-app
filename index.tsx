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
interface Course { id: string; title: string; subtitle: string; description: string; category: string; broadCategories: BroadCategory[]; coverImage: string; instructor: Instructor; learningObjectives: string[]; modules: Module[]; status?: 'draft' | 'completed'; updatedAt?: string; }

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

    const handleCreateNew = () => {
        try {
            const draft = localStorage.getItem('draftCourse');
            if (draft) {
                const parsed = JSON.parse(draft);
                setCurrentCourse(parsed);
            } else {
                setCurrentCourse(JSON.parse(JSON.stringify(initialCourseState)));
            }
        } catch {
            setCurrentCourse(JSON.parse(JSON.stringify(initialCourseState)));
        }
        setStep(1);
        setView('create');
    };

    const handleBackToList = () => {
        setView('list');
        setCurrentCourse(null);
    };

    const handleBack = () => {
        if (view === 'create') {
            if (step > 1) {
                setStep(step - 1);
            } else {
                handleBackToList();
            }
        }
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

    const handleFinishEditing = (finalCourse: Course) => {
        setCurrentCourse(finalCourse);
        saveCourseToList(finalCourse);
        try { localStorage.setItem('draftCourse', JSON.stringify(finalCourse)); } catch {}
        setStep(3);
    };

    return (
        <div style={styles.appContainer}>
            <header style={styles.header}>
                {view !== 'list' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
                    <button type="button" onClick={handleBack} style={{ ...styles.button, ...styles.buttonSecondary, padding: '8px 14px' }}>
                      <i className="fas fa-arrow-left"></i> Volver
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <img src="/logo_animikoding.png" alt="AnImiKoding" style={{ maxHeight: 56, height: '56px', width: 'auto' }} />
                    <p style={styles.mutedColor}>Diseña cursos de bienestar emocional con asistencia de IA</p>
                </div>
                {IS_GH_PAGES && !API_BASE && (
                    <p style={{color: '#dc3545', marginTop: '0.5rem'}}>
                        Atención: Estás en GitHub Pages sin backend configurado. Define el secret <code>VITE_API_BASE</code> con la URL de tu backend o usa el despliegue en Vercel.
                    </p>
                )}
                <div style={{ marginTop: '0.75rem' }}>
                    <button style={{...styles.button, ...styles.buttonAi}}
                            onClick={handleTestAI}
                            disabled={testingAI || !aiAvailable}>
                        {testingAI ? 'Probando conexión...' : (aiAvailable ? 'Probar conexión a IA' : 'IA no disponible (configura backend)')}
                    </button>
                </div>
                {view === 'create' && step === 1 && (
                  <h3 style={{ color: 'var(--primary-color)', marginTop: '16px' }}>Paso 1: Crea la ficha del curso completando el siguiente formulario</h3>
                )}
            </header>
            
            {view === 'list' && <CourseList
                courses={courses}
                onCreateNew={handleCreateNew}
                onLoadDraft={() => {
                    try {
                        const raw = localStorage.getItem('draftCourse');
                        if (!raw) { alert('No hay borrador guardado.'); return; }
                        const parsed = JSON.parse(raw);
                        setCurrentCourse(parsed);
                        setStep(1);
                        setView('create');
                    } catch {
                        alert('No se pudo cargar el borrador.');
                    }
                }}
                onDeleteDraft={() => {
                    try { localStorage.removeItem('draftCourse'); alert('Borrador eliminado.'); } catch {}
                }}
                onEditInfo={(course) => { setCurrentCourse(course); setStep(1); setView('create'); }}
                onEditContent={(course) => { setCurrentCourse(course); setStep(2); setView('create'); }}
                onViewCode={(course) => { setCurrentCourse(course); setStep(3); setView('create'); }}
                onRegenerateCode={(course) => {
                    const regenerated: Course = { ...course, updatedAt: new Date().toISOString() };
                    setCurrentCourse(regenerated);
                    try {
                        const raw = localStorage.getItem('coursesList');
                        const list: Course[] = raw ? JSON.parse(raw) : [];
                        const idx = list.findIndex(c => c.id === regenerated.id);
                        const next = idx >= 0 ? [...list.slice(0, idx), regenerated, ...list.slice(idx + 1)] : [...list, regenerated];
                        localStorage.setItem('coursesList', JSON.stringify(next));
                        setCourses(next);
                    } catch {}
                    setStep(3); setView('create');
                }}
                onFinalizeCourse={(course) => {
                    const completed: Course = { ...course, status: 'completed', updatedAt: new Date().toISOString() };
                    setCurrentCourse(completed);
                    // persist
                    try {
                        const raw = localStorage.getItem('coursesList');
                        const list: Course[] = raw ? JSON.parse(raw) : [];
                        const idx = list.findIndex(c => c.id === completed.id);
                        const next = idx >= 0 ? [...list.slice(0, idx), completed, ...list.slice(idx + 1)] : [...list, completed];
                        localStorage.setItem('coursesList', JSON.stringify(next));
                    } catch {}
                    setStep(3); setView('create');
                }}
                onDeleteCourse={(course) => {
                    if (!confirm(`¿Eliminar el curso "${course.title || course.id}" de la lista?`)) return;
                    try {
                        const raw = localStorage.getItem('coursesList');
                        const list: Course[] = raw ? JSON.parse(raw) : [];
                        const next = list.filter(c => c.id !== course.id);
                        localStorage.setItem('coursesList', JSON.stringify(next));
                        setCourses(next);
                        const draft = localStorage.getItem('draftCourse');
                        if (draft) {
                          const d = JSON.parse(draft);
                          if (d?.id === course.id) localStorage.removeItem('draftCourse');
                        }
                    } catch {}
                }}
            />}
            
            {view === 'create' && currentCourse && (
                <>
                    {step === 1 && <CourseForm course={currentCourse} onSubmit={handleFormSubmit} onCancel={handleBackToList} onSaveToList={(draft) => {
                        // Normalize and assign id/cover before saving to list
                        const slug = slugify(draft.title || 'curso');
                        const normalized: Course = {
                            ...draft,
                            id: draft.id || slug || `curso-${Date.now()}`,
                            coverImage: draft.coverImage || `${slug || 'curso'}_portada.png`,
                            status: 'draft',
                            updatedAt: new Date().toISOString(),
                        };
                        setCurrentCourse(normalized);
                        // Persist to list
                        try {
                          const raw = localStorage.getItem('coursesList');
                          const list: Course[] = raw ? JSON.parse(raw) : [];
                          const idx = list.findIndex(c => c.id === normalized.id);
                          const next = idx >= 0 ? [...list.slice(0, idx), normalized, ...list.slice(idx + 1)] : [...list, normalized];
                          localStorage.setItem('coursesList', JSON.stringify(next));
                        } catch {}
                        // Also keep the latest draft
                        try { localStorage.setItem('draftCourse', JSON.stringify(normalized)); } catch {}
                        alert('Curso guardado en la lista. Puedes continuar editando cuando quieras.');
                    }} />}
                    {step === 2 && <ModuleEditor course={currentCourse} onFinish={handleFinishEditing} onBack={(data) => { setCurrentCourse(data); setStep(1); }} />}
                    {step === 3 && <GeneratedCourseView course={currentCourse} onRestart={handleCreateNew} />}
                </>
            )}
        </div>
    );
};

// --- SUB-COMPONENTS ---

const CourseList: FC<{
  courses: Course[],
  onCreateNew: () => void,
  onLoadDraft: () => void,
  onDeleteDraft: () => void,
  onEditInfo: (c: Course) => void,
  onEditContent: (c: Course) => void,
  onViewCode: (c: Course) => void,
  onRegenerateCode: (c: Course) => void,
  onFinalizeCourse: (c: Course) => void,
  onDeleteCourse: (c: Course) => void,
}> = ({ courses, onCreateNew, onLoadDraft, onDeleteDraft, onEditInfo, onEditContent, onViewCode, onRegenerateCode, onFinalizeCourse, onDeleteCourse }) => {
    const hasDraft = typeof window !== 'undefined' && !!localStorage.getItem('draftCourse');
    return (
      <div style={styles.card}>
          <h2 style={styles.h2}>Mis Cursos</h2>
          {courses.length === 0 ? (
              <p>Aún no has creado ningún curso.</p>
          ) : (
              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                {courses.map(c => (
                  <li key={c.id} style={{ marginBottom: 10, border: '1px solid var(--border-color)', borderRadius: 8, padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div>
                        <strong>{c.title || '(Sin título)'}</strong>
                        {c.status && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 12, background: c.status === 'completed' ? '#e6ffed' : '#f3f4f6', color: c.status === 'completed' ? '#057a55' : '#374151', fontSize: 12 }}>{c.status === 'completed' ? 'Completado' : 'Borrador'}</span>}
                        {c.updatedAt && <span style={{ marginLeft: 8, color: 'var(--muted-color)', fontSize: 12 }}>Actualizado: {new Date(c.updatedAt).toLocaleString()}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button style={{ ...styles.button, ...styles.buttonSecondary, padding: '6px 10px' }} onClick={() => onEditInfo(c)} title="Editar ficha" type="button"><i className="fas fa-edit"></i> Ficha</button>
                        <button style={{ ...styles.button, ...styles.buttonSecondary, padding: '6px 10px' }} onClick={() => onEditContent(c)} title="Editar contenido" type="button"><i className="fas fa-layer-group"></i> Contenido</button>
                        <button style={{ ...styles.button, padding: '6px 10px' }} onClick={() => onViewCode(c)} title="Ver código" type="button"><i className="fas fa-eye"></i> Ver código</button>
                        <button style={{ ...styles.button, padding: '6px 10px', backgroundColor: '#0ea5e9' }} onClick={() => onRegenerateCode(c)} title="Regenerar código" type="button"><i className="fas fa-sync"></i> Regenerar</button>
                        <button style={{ ...styles.button, backgroundColor: 'var(--success-color)', padding: '6px 10px' }} onClick={() => onFinalizeCourse(c)} title="Finalizar" type="button"><i className="fas fa-check"></i> Finalizar</button>
                        <button style={{ ...styles.button, ...styles.buttonDanger, padding: '6px 10px' }} onClick={() => onDeleteCourse(c)} title="Eliminar" type="button"><i className="fas fa-trash"></i></button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={styles.button} onClick={onCreateNew}>
                <i className="fas fa-plus"></i> Crear Nuevo Curso
            </button>
            {hasDraft && (
              <>
                <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={onLoadDraft}>
                    <i className="fas fa-folder-open"></i> Cargar borrador
                </button>
                <button style={{ ...styles.button, ...styles.buttonDanger }} onClick={onDeleteDraft}>
                    <i className="fas fa-trash"></i> Eliminar borrador
                </button>
              </>
            )}
          </div>
      </div>
    );
};

import { useKindeAuth as useKindeAuthInForm } from '@kinde-oss/kinde-auth-react';

const CourseForm: FC<{ course: Course, onSubmit: (data: Course) => void, onCancel: () => void, onSaveToList: (data: Course) => void }> = ({ course, onSubmit, onCancel, onSaveToList }) => {
    const [data, setData] = useState(course);
    const [tagInput, setTagInput] = useState('');
    const { logout } = (useKindeAuthInForm() as any) || {};
    const [saveToast, setSaveToast] = useState<string | null>(null);
    const saveDraft = (d: Course) => {
        try {
            localStorage.setItem('draftCourse', JSON.stringify(d));
            setSaveToast('Borrador guardado');
            window.clearTimeout((saveDraft as any)._t);
            (saveDraft as any)._t = window.setTimeout(() => setSaveToast(null), 1800);
        } catch {}
    };
    
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
        setData(prev => { const next = { ...prev, category: categoryName }; saveDraft(next); return next; });
    };
    
    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim() !== '' && data.broadCategories.length < 10) {
            e.preventDefault();
            const cleanInput = tagInput.trim().toLowerCase();
            const newTag = validTags[cleanInput];
            
            if (newTag && !data.broadCategories.includes(newTag)) {
                setData(prev => { const next = {...prev, broadCategories: [...prev.broadCategories, newTag]}; saveDraft(next); return next; });
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: BroadCategory) => {
        setData(prev => { const next = { ...prev, broadCategories: prev.broadCategories.filter(tag => tag !== tagToRemove) }; saveDraft(next); return next; });
    };
    
    const handleAddModule = () => {
        if (data.modules.length < 6) {
            setData(prev => {
                const next = {
                    ...prev,
                    modules: [...prev.modules, { id: '', title: `Módulo ${prev.modules.length + 1}`, parts: [] }],
                    learningObjectives: [...prev.learningObjectives, `Objetivo del módulo ${prev.modules.length + 1}`]
                } as Course;
                saveDraft(next);
                return next;
            });
        }
    };

    const handleModuleChange = (index: number, value: string) => {
        const newModules = [...data.modules];
        newModules[index].title = value;
        const next = { ...data, modules: newModules } as Course;
        setData(next);
        saveDraft(next);
    };

    const handleObjectiveChange = (index: number, value: string) => {
        const newObjectives = [...data.learningObjectives];
        newObjectives[index] = value;
        const next = { ...data, learningObjectives: newObjectives } as Course;
        setData(next);
        saveDraft(next);
    };

    const [aiGeneratingIndex, setAiGeneratingIndex] = useState<number | null>(null);
    const handleAiGenerateObjective = async (i: number) => {
        const title = data.modules[i]?.title?.trim();
        if (!title) {
            alert('Por favor, escribe primero el nombre del módulo.');
            return;
        }
        setAiGeneratingIndex(i);
        try {
            const prompt = `Crea un objetivo de aprendizaje conciso y claro (1 sola oración) para un módulo de un curso interactivo orientado al bienestar emocional. Basa el objetivo exclusivamente en el título del módulo entre comillas y no incluyas viñetas, prefijos ni texto adicional. Título del módulo: "${title}". Devuelve solo la oración en español.`;
            const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';
            const res = await fetch(`${API_BASE}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            if (!res.ok) {
                const msg = await res.text().catch(() => '');
                throw new Error(msg || `HTTP ${res.status}`);
            }
            const dataJson = await res.json();
            const text: string = (dataJson?.text || '').trim();
            if (text) {
                handleObjectiveChange(i, text);
            } else {
                alert('La IA no devolvió un objetivo. Intenta de nuevo.');
            }
        } catch (e: any) {
            alert(`Error generando objetivo con IA: ${e?.message || e}`);
        } finally {
            setAiGeneratingIndex(null);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try { localStorage.removeItem('draftCourse'); } catch {}
        onSubmit(data);
    };

    const handleSaveAndExit = () => {
        saveDraft(data);
        if (typeof window !== 'undefined') alert('Ficha guardada localmente. Puedes retomar más tarde desde Crear Nuevo Curso.');
        logout?.();
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
        <>
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
                        {tag} <i className="fas fa-times" style={{cursor: 'pointer', marginLeft: '5px'}} onClick={() => removeTag(tag)}></i>
                      </span>
                    )}
                </div>
                <input style={styles.input} type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="Escribe y presiona Enter..." />
                 <small style={{ color: 'var(--muted-color)', marginTop: '5px', display: 'block' }}>
                    Valores permitidos: Autoconocimiento, Gestión Emocional, Habilidades Sociales. Límite 10.
                </small>
            </div>
            <div style={styles.inputGroup}>
                <label style={styles.label}>Módulos y Objetivos de Aprendizaje</label>
                <small style={{ color: 'var(--muted-color)', display: 'block', marginBottom: 8 }}>
                    ¿Quieres ayuda para redactar los objetivos? Haz clic en el botón a la derecha de cada objetivo para que la IA lo proponga automáticamente.
                </small>
                {data.modules.map((mod, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                        <input style={styles.input} value={mod.title} onChange={e => handleModuleChange(i, e.target.value)} placeholder={`Nombre del Módulo ${i + 1}`} />
                        <input style={styles.input} value={data.learningObjectives[i]} onChange={e => handleObjectiveChange(i, e.target.value)} placeholder={`Objetivo de aprendizaje para el Módulo ${i+1}`} />
                        <button type="button" title="Objetivo con IA" onClick={() => handleAiGenerateObjective(i)} disabled={aiGeneratingIndex === i}
                          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--surface-color)', cursor: 'pointer' }}>
                            {aiGeneratingIndex === i ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                        </button>
                    </div>
                ))}
                {data.modules.length < 6 && <button type="button" style={{...styles.button, ...styles.buttonSecondary, padding:'8px 16px'}} onClick={handleAddModule}><i className="fas fa-plus"></i> Añadir Módulo</button>}
            </div>
            
            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '2rem', gap: 12, flexWrap: 'wrap'}}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" style={{...styles.button, ...styles.buttonSecondary}} onClick={onCancel}>Cancelar</button>
                  <button type="button" style={{...styles.button, backgroundColor: '#1f6feb'}} onClick={handleSaveAndExit}><i className="fas fa-save"></i> Guardar y salir</button>
                  <button type="button" style={{...styles.button, backgroundColor: 'var(--success-color)'}} onClick={() => { onSaveToList(data); setSaveToast('Curso guardado en la lista'); }}>
                    <i className="fas fa-bookmark"></i> Guardar en lista
                  </button>
                </div>
                <button type="submit" style={styles.button}>Guardar y Continuar <i className="fas fa-arrow-right"></i></button>
            </div>
        </form>
        {saveToast && (
            <div style={{ position: 'fixed', right: 20, bottom: 20, background: 'var(--surface-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-check-circle" style={{ color: 'var(--success-color)' }}></i>
                <span>{saveToast}</span>
            </div>
        )}
        </>
    );
};

const ModuleEditor: FC<{ course: Course, onFinish: (data: Course) => void, onBack: (data: Course) => void }> = ({ course, onFinish, onBack }) => {
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

    const persist = (c: Course) => { try { localStorage.setItem('draftCourse', JSON.stringify(c)); } catch {} };

    const updateResource = (modIndex: number, partIndex: number, resIndex: number, updatedActivity: Activity) => {
        const newCourse = { ...currentCourse };
        ensureAtLeastOnePart(newCourse, modIndex);
        newCourse.modules[modIndex].parts[partIndex].resources[resIndex] = updatedActivity;
        setCurrentCourse(newCourse);
        persist(newCourse);
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
        persist(newCourse);

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

    // Reset part index when switching module to avoid out-of-range
    useEffect(() => {
        setActivePartIndex(0);
    }, [activeModuleIndex]);

    return (
        <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <h2 style={styles.h2}>{course.title} - Editor de Contenido</h2>
              <button type="button" style={{ ...styles.button, ...styles.buttonSecondary, padding: '8px 14px' }} onClick={() => onBack(currentCourse)}>
                <i className="fas fa-arrow-left"></i> Volver a ficha
              </button>
            </div>
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

    const focusEditor = () => {
        if (editorRef.current) {
            editorRef.current.focus();
            const sel = window.getSelection();
            if (sel && sel.rangeCount === 0) {
                const range = document.createRange();
                range.selectNodeContents(editorRef.current);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    };

    const applyCmd = (cmd: string, val?: string) => {
        focusEditor();
        document.execCommand(cmd, false, val);
        syncHtml();
    };

    const highlightSelection = () => {
        focusEditor();
        const ok = document.execCommand('hiliteColor', false, '#fff3a0');
        if (!ok) document.execCommand('backColor', false, '#fff3a0');
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
                <button type="button" title="Resaltado" style={toolbarButtonStyle} onClick={highlightSelection}><i className="fas fa-highlighter"></i></button>
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
                style={{ minHeight: 140, padding: 12, outline: 'none', direction: 'ltr', unicodeBidi: 'plaintext', textAlign: 'left', whiteSpace: 'pre-wrap' }}
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
    const [showPreview, setShowPreview] = useState(false);

    const predefinedPrompts = [
        { name: "Quiz de 3 Preguntas", prompt: `Crea un quiz interactivo sobre el tema '{TOPIC}'. El quiz debe tener 3 preguntas de opción múltiple con 3 opciones cada una. Para cada opción, proporciona un feedback explicando por qué es correcta o incorrecta. Responde únicamente con un objeto JSON que siga esta estructura de TypeScript: \`interface QuizQuestion { question: string; options: { text: string; feedback: string; }[]; }[]\`. No incluyas backticks de markdown ni explicaciones: devuelve solo el JSON, sin texto adicional.` },
        { name: "Caso Práctico", prompt: "Genera un 'caso práctico' o 'estudio de caso' sobre '{TOPIC}'. Debe presentar una situación realista y terminar con 2 preguntas abiertas que inviten a la reflexión del participante. Responde SOLO con HTML listo para insertar (sin backticks ni explicaciones), usando etiquetas básicas como <p>, <strong>, <ul>, <li>." },
        { name: "Juego de Cartas (Conceptos)", prompt: "Crea un mini juego de cartas sobre '{TOPIC}'. Genera 4 pares de cartas (8 en total). Cada par debe tener un concepto y su definición. Responde SOLO con HTML listo para insertar (sin backticks ni explicaciones) que use una <div class='card-game'> con 8 <div class='card'> dentro." },
        { name: "Metáfora Explicativa", prompt: "Explica el concepto de '{TOPIC}' usando una metáfora o analogía potente. Responde SOLO con HTML listo para insertar (sin backticks ni explicaciones) usando un <blockquote>." },
        { name: "Mito vs. Realidad", prompt: "Crea una tabla 'Mito vs. Realidad' sobre '{TOPIC}', con 3 mitos comunes y su aclaración correspondiente. Responde SOLO con HTML listo para insertar (sin backticks ni explicaciones) usando <table>." },
    ];

    const sanitizeGenerated = (text: string) => {
        let t = (text || '').replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();
        const firstLt = t.indexOf('<');
        const lastGt = t.lastIndexOf('>');
        if (firstLt !== -1 && lastGt !== -1 && lastGt > firstLt) {
            t = t.slice(firstLt, lastGt + 1).trim();
        }
        return t;
    };

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
            const finalPrompt = `${promptTemplate.replace('{TOPIC}', topic)}\n\nIMPORTANTE: Devuelve únicamente el código solicitado, sin explicaciones, sin prefijos ni sufijos, y sin usar backticks de markdown.`;
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
            setGeneratedContent(sanitizeGenerated(data.text || ''));
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
        handleGenerate(`${customPrompt}\n\nIMPORTANTE: Devuelve únicamente el código solicitado, sin explicaciones, sin prefijos ni sufijos, y sin usar backticks de markdown.`);
    }

    const sanitizeForPreview = (html: string) => {
        let t = html || '';
        // eliminar scripts y handlers inline
        t = t.replace(/<script[\s\S]*?<\/script>/gi, '');
        t = t.replace(/on[a-zA-Z]+\s*=\s*"[^"]*"/gi, '');
        t = t.replace(/on[a-zA-Z]+\s*=\s*'[^']*'/gi, '');
        return t;
    };
    
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
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: '10px' }}>
                                  <button style={{...styles.button, ...styles.buttonSecondary}} onClick={() => setShowPreview(v => !v)} type="button">
                                    {showPreview ? 'Ocultar previsualización' : 'Previsualizar'}
                                  </button>
                                  <button style={{...styles.button, ...styles.buttonDanger}} onClick={() => setGeneratedContent('')} type="button">
                                    Limpiar
                                  </button>
                                  <button style={{...styles.button, ...{backgroundColor: 'var(--success-color)'}}} onClick={() => { if (!generatedContent) { alert('No hay contenido para insertar.'); return; } onInsert(generatedContent); onClose(); }} type="button">
                                    <i className="fas fa-check"></i> Insertar Recurso
                                  </button>
                                </div>
                                {showPreview && (
                                  <div style={{ marginTop: 12, border: '1px solid var(--border-color)', borderRadius: 8, padding: 12, background: '#fafafa' }}>
                                    <h5 style={{ margin: '4px 0 10px 0' }}>Vista previa</h5>
                                    {/^\s*</.test(generatedContent)
                                      ? <div dangerouslySetInnerHTML={{ __html: sanitizeForPreview(generatedContent) }} />
                                      : <pre style={{ whiteSpace: 'pre-wrap' }}>{generatedContent}</pre>}
                                  </div>
                                )}
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

    const htmlCode = useMemo(() => {
        const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const renderResource = (act: any) => {
            switch (act.type) {
                case 'video': return `<video controls style="max-width:100%" src="${esc(`/videos/${sanitizeForPath(act.videoSrc)}`)}"></video>`;
                case 'audio': return `<audio controls src="${esc(`/audios/${sanitizeForPath(act.audioSrc)}`)}"></audio>`;
                case 'text': return (act.content || []).join('\n');
                case 'quiz':
                    try {
                        const qs = act.questions || [];
                        return `<div class="quiz">${qs.map((q: any) => `<div class="question"><p>${esc(q.question)}</p><ul>${(q.options||[]).map((op: any) => `<li>${esc(op.text)}<div class="feedback" style="display:none">${esc(op.feedback)}</div></li>`).join('')}</ul></div>`).join('')}</div>`;
                    } catch { return '<!-- quiz -->'; }
                case 'image': return `<img style="max-width:100%;height:auto;border-radius:8px" alt="${esc(act.title)}" src="${esc(`/images/${sanitizeForPath(act.imageSrc)}`)}" />`;
                case 'iframe': return act.html || '';
                default: return '';
            }
        };
        const partsHtml = (course.modules || []).map((mod, mi) => {
            const modSlug = slugify(mod.title || `mod-${mi+1}`);
            const parts = (mod.parts || []).map((p, pi) => {
                const partSlug = slugify(p.title || `parte-${pi+1}`);
                return `
                <article class="part" id="part-${modSlug}-${partSlug}">
                  <h3>${esc(p.title)}</h3>
                  ${(p.resources || []).map(renderResource).join('\n')}
                </article>`;
            }).join('\n');
            return `
            <section class="module" id="mod-${modSlug}">
              <h2>${esc(mod.title)}</h2>
              ${parts}
            </section>`;
        }).join('\n');

        const tocHtml = (() => {
            const mods = (course.modules || []).map((mod, mi) => {
                const modSlug = slugify(mod.title || `mod-${mi+1}`);
                const parts = (mod.parts || []).map((p, pi) => {
                    const partSlug = slugify(p.title || `parte-${pi+1}`);
                    return `<li><a href="#part-${modSlug}-${partSlug}">${esc(p.title)}</a></li>`;
                }).join('');
                return `<li><a href="#mod-${modSlug}">${esc(mod.title)}</a>${parts ? `<ul>${parts}</ul>` : ''}</li>`;
            }).join('');
            return `<nav class="toc"><h3>Contenido</h3><ul>${mods}</ul></nav>`;
        })();
        return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(course.title)}</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji"; margin: 16px; }
      h1 { color: #141313; }
      h2 { border-bottom: 2px solid #8ab665; padding-bottom: 4px; }
      .module { margin-bottom: 20px; }
      .part { background: #e4fae8; border: 1px solid #cfe8d4; padding: 12px; border-radius: 8px; margin: 10px 0; }
      .cover { max-width: 720px; width: 100%; height: auto; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
      .toc { background: #f5f7f5; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin: 14px 0; }
      .toc ul { margin: 6px 0 0 16px; }
      blockquote { border-left: 4px solid #22b37b; padding: 8px 12px; background: #e4fae8; border-radius: 6px; }
      table { width: 100%; border-collapse: collapse; }
      table th, table td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
      table thead th { background: #f3f4f6; }
    </style>
  </head>
  <body>
    <header>
      <h1>${esc(course.title)}</h1>
      <h4>${esc(course.subtitle)}</h4>
      <p>${esc(course.description)}</p>
      ${course.coverImage ? `<img class="cover" src="${esc(`/images/${sanitizeForPath(course.coverImage)}`)}" alt="${esc(course.title)}" />` : ''}
    </header>
    ${tocHtml}
    ${partsHtml}
  </body>
</html>`;
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
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button style={styles.button} onClick={handleDownload}><i className="fas fa-download"></i> Descargar Archivo .ts</button>
              <button style={{ ...styles.button, backgroundColor: '#0ea5e9' }} onClick={() => {
                const blob = new Blob([htmlCode], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${course.id}.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}><i className="fas fa-file-code"></i> Descargar Archivo .html</button>
            </div>
            
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
  const { isAuthenticated, isLoading, user, login, register, logout } = useKindeAuth() as any;
  const [needsProfile, setNeedsProfile] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({ firstName: '', lastName: '', company: '', email: '', username: '' });
  const [showProfileEditor, setShowProfileEditor] = useState(false);

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
    setShowProfileEditor(false);
  };

  const uid = user?.id || user?.sub || user?.email || 'anon';
  const profileKey = `profile:${uid}`;
  const storedProfile = (() => { try { return JSON.parse(localStorage.getItem(profileKey) || 'null'); } catch { return null; } })();
  const avatarUrl = storedProfile?.avatarDataUrl as string | undefined;

  const displayName = (() => {
    const p = storedProfile;
    if (p?.firstName || p?.lastName) return `${p.firstName || ''} ${p.lastName || ''}`.trim();
    return user?.given_name || user?.name || user?.email || '';
  })();

  const HeaderBar = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, padding: '8px 16px' }}>
      {!isAuthenticated ? (
        <>
          <button style={{ ...styles.button, ...styles.buttonSecondary, padding: '8px 14px' }} type="button" onClick={login}><i className="fas fa-sign-in-alt"></i> Entrar</button>
          <button style={{ ...styles.button, padding: '8px 14px' }} type="button" onClick={register}><i className="fas fa-user-plus"></i> Registrarse</button>
        </>
      ) : (
        <>
          <span style={{ color: 'var(--text-color)', fontWeight: 500 }}>{displayName}</span>
          <button style={{ ...styles.button, ...styles.buttonSecondary, padding: '8px 14px' }} type="button" onClick={() => {
            // cargar perfil para el editor
            const p = storedProfile || { firstName: user?.given_name || '', lastName: user?.family_name || '', company: '', email: user?.email || '', username: (user?.preferred_username || user?.email?.split('@')[0] || '').toLowerCase() };
            setProfile(p);
            setShowProfileEditor(true);
          }}><i className="fas fa-user"></i> Perfil</button>
          <button style={{ ...styles.button, padding: '8px 14px' }} type="button" onClick={() => logout?.()}><i className="fas fa-sign-out-alt"></i> Salir</button>
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <i className="fas fa-user-circle" style={{ fontSize: 28, color: 'var(--muted-color)', alignSelf: 'center' }}></i>
          )}
        </>
      )}
    </div>
  );

  if (isLoading) return <div>{HeaderBar}<div style={{ padding: 24 }}>Cargando autenticación...</div></div>;
  if (!isAuthenticated) {
    return (
      <div>
        {HeaderBar}
        <div style={{ maxWidth: 720, margin: '20px auto', background: 'var(--surface-color)', padding: 24, borderRadius: 12, boxShadow: 'var(--shadow-md)', textAlign: 'center' }}>
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
      </div>
    );
  }

  if (needsProfile) {
    return (
      <div>
        {HeaderBar}
        <div style={{ maxWidth: 720, margin: '20px auto', background: 'var(--surface-color)', padding: 24, borderRadius: 12, boxShadow: 'var(--shadow-md)' }}>
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
        {/* Editor de perfil invocable desde el header */}
        {showProfileEditor && (
          <div style={styles.modalOverlay} onClick={() => setShowProfileEditor(false)}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
              <h3>Editar perfil</h3>
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
                  <button style={{ ...styles.button, ...styles.buttonSecondary }} type="button" onClick={() => setShowProfileEditor(false)}>Cancelar</button>
                  <button style={styles.button} type="submit">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {HeaderBar}
      {children}
      {showProfileEditor && (
        <div style={styles.modalOverlay} onClick={() => setShowProfileEditor(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3>Editar perfil</h3>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
                <button style={{ ...styles.button, ...styles.buttonSecondary }} type="button" onClick={() => setShowProfileEditor(false)}>Cancelar</button>
                <button style={styles.button} type="submit">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): { hasError: boolean } { return { hasError: true }; }
  componentDidCatch(err: any) { console.error('UI error boundary caught:', err); }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 24 }}>
        <h3>Ha ocurrido un error inesperado</h3>
        <p>Hemos guardado tu progreso como borrador para evitar pérdidas. Recarga la página e intenta continuar.</p>
      </div>;
    }
    return <>{this.props.children}</>;
  }
}

const KindeWrappedApp: FC = () => {
  const domain = (import.meta as any).env?.VITE_KINDE_DOMAIN || 'https://animikrea.kinde.com';
  const clientId = (import.meta as any).env?.VITE_KINDE_CLIENT_ID || '499609149459408789fc958770cd4375';
  const redirectUri = (import.meta as any).env?.VITE_KINDE_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const logoutUri = (import.meta as any).env?.VITE_KINDE_LOGOUT_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  return (
    <KindeProvider domain={domain} clientId={clientId} redirectUri={redirectUri} logoutUri={logoutUri}>
      <ErrorBoundary>
        <AuthGate>
          <App />
        </AuthGate>
      </ErrorBoundary>
    </KindeProvider>
  );
};

    // Load and persist courses list
    useEffect(() => {
        try {
            const raw = localStorage.getItem('coursesList');
            if (raw) setCourses(JSON.parse(raw));
        } catch {}
    }, []);
    useEffect(() => {
        try { localStorage.setItem('coursesList', JSON.stringify(courses)); } catch {}
    }, [courses]);

    const saveCourseToList = (course: Course) => {
        setCourses(prev => {
            const idx = prev.findIndex(c => c.id === course.id);
            const next = idx >= 0 ? [...prev.slice(0, idx), course, ...prev.slice(idx + 1)] : [...prev, course];
            try { localStorage.setItem('coursesList', JSON.stringify(next)); } catch {}
            return next;
        });
    };
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<React.StrictMode><KindeWrappedApp /></React.StrictMode>);
