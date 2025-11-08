import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layouts/MainLayout';
import { useData } from '../contexts/DataContext';
import { EmptyNotesIllustration } from '../components/illustrations/Illustrations';
import { Note } from '../data/mockData';
import { PaperclipIcon, PlusIconHeader } from '../components/icons/Icons';

const NoteCard: React.FC<{ note: Note; onClick: () => void }> = ({ note, onClick }) => {
  const summary = useMemo(() => {
    const div = document.createElement('div');
    div.innerHTML = note.content || '';
    return div.textContent || div.innerText || '';
  }, [note.content]);

  return (
    <div
      onClick={onClick}
      className="bg-[var(--color-surface-container)] rounded-xl p-4 card-shadow cursor-pointer hover:bg-[var(--color-surface-container-low)] transition-colors"
    >
      <h3 className="font-bold text-[var(--color-text-primary)] truncate">{note.title || 'Untitled Note'}</h3>
      <p className="text-sm text-[var(--color-text-secondary)] mt-1 truncate">{summary}</p>
      <div className="flex items-center justify-between mt-3 text-xs text-[var(--color-text-tertiary)]">
        <span>{new Date(note.created_at!).toLocaleDateString()}</span>
        {note.attachments && note.attachments.length > 0 && (
          <div className="flex items-center gap-1">
            <PaperclipIcon className="w-3 h-3" />
            <span>{note.attachments.length}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const NotesScreen: React.FC = () => {
  const { notes } = useData();
  const navigate = useNavigate();

  const handleAddNote = () => {
    navigate('/notes/new');
  };

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => new Date(b.updated_at || b.created_at!).getTime() - new Date(a.updated_at || a.created_at!).getTime());
  }, [notes]);

  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        <header
          className="px-6 pt-6 pb-4 flex justify-between items-center flex-shrink-0 bg-[var(--color-surface-container)] border-b border-[var(--color-border)]"
          style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top, 0px))` }}
        >
          <div className="w-8" />
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Notes</h1>
          <button className="text-[var(--color-text-primary)]" onClick={handleAddNote}>
            <PlusIconHeader />
          </button>
        </header>
        <main className="overflow-y-auto flex-grow">
          <div className="p-6" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
            {sortedNotes.length === 0 ? (
              <EmptyNotesIllustration onAddNote={handleAddNote} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sortedNotes.map(note => (
                  <NoteCard key={note.id} note={note} onClick={() => navigate(`/notes/${note.id}`)} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </MainLayout>
  );
};

export default NotesScreen;