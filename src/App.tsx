import { Archive as ArchiveIcon, BookOpenText } from '@phosphor-icons/react';
import { MotionConfig } from 'motion/react';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import archiveSource from './data/archive.json';
import { parseArchive } from './data/archiveSchema';
import { CardViewer } from './components/CardViewer';

const EditorPage = lazy(() => import('./components/EditorPage').then((module) => ({ default: module.EditorPage })));
const MomentsArchive = lazy(() => import('./components/MomentsArchive').then((module) => ({ default: module.MomentsArchive })));

const archive = parseArchive(archiveSource);

function MainNavigation() {
  const location = useLocation();
  if (location.pathname === '/edit') return null;
  return (
    <nav className="app-navigation" aria-label="Основные разделы">
      <NavLink to="/" end><BookOpenText size={22} weight="light" /><span>История</span></NavLink>
      <NavLink to="/moments"><ArchiveIcon size={22} weight="light" /><span>Моменты</span></NavLink>
    </nav>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Suspense fallback={<main className="route-loading" aria-live="polite">Открываем страницу архива…</main>}>
          <Routes>
            <Route path="/" element={<CardViewer archive={archive} />} />
            <Route path="/moments" element={<MomentsArchive archive={archive} />} />
            <Route path="/edit" element={<EditorPage initialArchive={archive} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <MainNavigation />
      </BrowserRouter>
    </MotionConfig>
  );
}
