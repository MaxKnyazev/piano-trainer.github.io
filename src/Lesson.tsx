import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, CheckCircle2, Lightbulb, Target } from 'lucide-react';
import { chapters } from './course';
import { Staff } from './components';
import { Button, ProgressBar } from './ui';
import type { State } from './storage';
import type { Update } from './Trainers';

const levels = ['Все упражнения', 'Базовый', 'Закрепление', 'Усложнение'];

export function Lesson({ state, update }: { state: State; update: Update }) {
  const { id } = useParams();
  // A different chapter gets a fresh filter without changing any saved progress.
  return <LessonContent key={id} id={id} state={state} update={update} />;
}

function LessonContent({ id, state, update }: { id?: string; state: State; update: Update }) {
  const [level, setLevel] = useState(levels[0]);
  const chapter = chapters.find(c => c.id === id);
  if (!chapter) return <div className="empty-state"><h1>Глава не найдена</h1><Link className="button primary" to="/course">К программе курса</Link></div>;
  const index = chapters.indexOf(chapter), guide = chapter.guide;
  const complete = chapter.exercises.filter((_, i) => state.completed.includes(`${chapter.id}:${i}`)).length;
  const jump = (section: string) => document.getElementById(section)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  const nav = [{ id: 'explanation', title: 'Объяснения' }, { id: 'walkthrough', title: 'Пример по шагам' }, { id: 'practice', title: 'Упражнения' }, { id: 'review', title: 'Самопроверка' }];
  return <>
    <Link className="text-link breadcrumb" to="/course">Программа курса / Глава {index + 1}</Link>
    <div className="page-heading"><div><div className="eyebrow">{chapter.category.toUpperCase()}</div><h1>{chapter.title}</h1><p>{chapter.subtitle}</p></div></div>
    <div className="lesson-tabs" aria-label="Разделы главы">{nav.map(n => <Button key={n.id} variant="ghost" onClick={() => jump(n.id)}>{n.title}</Button>)}</div>
    <div className="lesson-layout expanded-lesson"><div>
      {guide && <div className="lesson-welcome"><BookOpen size={23} /><div><h2>Перед тем как начать</h2><p>{guide.introduction}</p><p className="lesson-pace">Начните с одного раздела и одного упражнения. Главу можно проходить за несколько занятий.</p></div></div>}
      <section className="card theory expanded-theory" id="explanation"><span className="tag lavender">РАЗБЕРЁМСЯ ВМЕСТЕ</span><h2>Объяснения</h2>
        {guide ? guide.sections.map(section => <section className="theory-section" key={section.title}><h3>{section.title}</h3>{section.paragraphs.map(p => <p key={p}>{p}</p>)}</section>) : chapter.theory.map(p => <p key={p}>{p}</p>)}
        {['keyboard','treble','hands'].includes(chapter.id) && <div className="lesson-notation"><Staff notes={[60,62,64,62]} /><p className="small muted center">До–ре–ми–ре · четверти · скрипичный ключ</p></div>}
      </section>
      {guide && <>
        <section className="card walkthrough" id="walkthrough"><span className="tag mint">ПРИМЕНЯЕМ НА ПРИМЕРЕ</span><h2>{guide.example.title}</h2><ol>{guide.example.steps.map(step => <li key={step}>{step}</li>)}</ol><div className="example-insight"><Lightbulb size={20} /><p>{guide.example.explanation}</p></div></section>
        <section className="card lesson-mistakes"><h2>Если что-то не получается</h2><p className="muted">Найдите знакомую ситуацию и попробуйте изменить одну вещь.</p>{guide.mistakes.map(m => <div className="mistake-item" key={m.problem}><h3>{m.problem}</h3><p>{m.solution}</p></div>)}</section>
      </>}
      <section id="practice" className="lesson-practice"><div className="section-heading"><h2>Теперь — за инструмент</h2><span className="muted small">{complete} / {chapter.exercises.length} выполнено</span></div>
        {guide && <div className="practice-plan"><h3>Как распределить практику</h3><p>{guide.practicePlan}</p></div>}
        <label className="field exercise-filter">Выберите сложность<select value={level} onChange={e => setLevel(e.target.value)}>{levels.map(l => <option key={l}>{l}</option>)}</select></label>
        {chapter.exercises.map((ex, i) => {
          if (level !== levels[0] && level !== ex.level) return null;
          const key = `${chapter.id}:${i}`, done = state.completed.includes(key);
          return <section className={`card exercise ${done ? 'done' : ''}`} key={key}>
            <div className="row spread"><span className={`tag ${ex.level === 'Базовый' ? 'mint' : ex.level === 'Закрепление' ? 'lavender' : 'peach'}`}>{ex.level}</span>{done && <span className="done-label"><CheckCircle2 size={16} />Выполнено</span>}</div>
            <h3>{ex.title}</h3>{ex.purpose && <p className="exercise-purpose">{ex.purpose}</p>}
            <ol>{ex.steps.map(step => <li key={step}>{step}</li>)}</ol>
            {ex.easier && <details className="easier-version"><summary>Если пока трудно</summary><p>{ex.easier}</p></details>}
            <div className="exercise-goal"><Target size={18} /><p><strong>Ориентир:</strong> {ex.goal}</p></div>
            <Button variant={done ? 'secondary' : 'primary'} onClick={() => update(s => ({ ...s, completed: done ? s.completed.filter(v => v !== key) : [...s.completed, key] }))}>{done ? 'Вернуть к практике' : 'Я выполнил упражнение'}</Button>
          </section>;
        })}
      </section>
      {guide && <section className="card lesson-review" id="review"><span className="tag peach">ПРОВЕРЬТЕ ПОНИМАНИЕ</span><h2>Объясните своими словами</h2><p className="muted">Сначала попробуйте ответить самостоятельно, затем откройте пояснение. Это возможность разобраться, к чему ещё стоит вернуться.</p>{guide.questions.map(q => <details key={q.question}><summary>{q.question}</summary><p>{q.answer}</p></details>)}<p className="review-outro">Если ответ пока не складывается, вернитесь к соответствующему примеру и попробуйте его руками.</p></section>}
      <div className="lesson-footer">{index > 0 && <Link className="button secondary" to={`/course/${chapters[index - 1].id}`}>Предыдущая глава</Link>}{index < chapters.length - 1 && <Link className="button primary" to={`/course/${chapters[index + 1].id}`}>Следующая глава</Link>}</div>
    </div><aside><div className="lesson-aside-sticky"><div className="card lesson-navigation"><span className="eyebrow">В ЭТОЙ ГЛАВЕ</span><nav aria-label="Содержание главы">{nav.map(n => <button key={n.id} onClick={() => jump(n.id)}>{n.title}</button>)}</nav><div className="lesson-completion"><span>{complete} из {chapter.exercises.length} упражнений</span><ProgressBar value={complete / chapter.exercises.length * 100} /></div></div><div className="card advice"><h3>Маленькая подсказка</h3><p>{chapter.tip}</p><Link className="button secondary" to={`/practice?mode=${chapter.trainer}`}>Открыть тренажёр</Link></div></div></aside></div>
  </>;
}
