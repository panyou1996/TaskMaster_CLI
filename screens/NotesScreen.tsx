import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layouts/MainLayout';
import { useData } from '../contexts/DataContext';
import { EmptyNotesIllustration } from '../components/illustrations/Illustrations';
import { Note } from '../data/mockData';
import { PaperclipIcon, PlusIconHeader, SearchIcon } from '../components/icons/Icons';

const NoteCard: React.FC<{ note: Note; onClick: () => void }> = ({ note, onClick }) => {
  const summary = useMemo(() => {
    if (!note.content) return '';
    const div = document.createElement('div');
    div.innerHTML = note.content;
    return div.textContent || div.innerText || '';
  }, [note.content]);

  const imageAttachment = useMemo(() => {
    const allAttachments = [...(note.attachments || [])];
    if (note.localAttachmentsToUpload) {
        allAttachments.push(...note.localAttachmentsToUpload.map(att => ({
            name: att.name,
            type: att.type,
            url: `data:${att.type};base64,${att.data}`
        })));
    }
    return allAttachments.find(att => att.type.startsWith('image/'));
  }, [note.attachments, note.localAttachmentsToUpload]);


  return (
    <div
      onClick={onClick}
      className="bg-[var(--color-surface-container)] rounded-xl card-shadow cursor-pointer hover:bg-[var(--color-surface-container-low)] transition-colors break-inside-avoid flex flex-col"
    >
      {imageAttachment && (
        <img src={imageAttachment.url} alt="Note preview" className="w-full h-32 object-cover rounded-t-xl" />
      )}
      <div className="p-4 flex flex-col flex-grow">
          <h3 className="font-bold text-[var(--color-text-primary)]">{note.title || 'Untitled Note'}</h3>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1 flex-grow">
              {summary.substring(0, 150)}{summary.length > 150 ? '...' : ''}
          </p>
          <div className="flex items-center justify-between mt-3 text-xs text-[var(--color-text-tertiary)] pt-2 border-t border-[var(--color-border)]">
            <span>{new Date(note.updated_at || note.created_at!).toLocaleDateString()}</span>
            {note.attachments && note.attachments.length > 0 && (
              <div className="flex items-center gap-1">
                <PaperclipIcon className="w-3 h-3" />
                <span>{note.attachments.length}</span>
              </div>
            )}
          </div>
      </div>
    </div>
  );
};

const NotesScreen: React.FC = () => {
  const { notes } = useData();
  const navigate = useNavigate();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (isSearchVisible) {
          setTimeout(() => searchInputRef.current?.focus(), 100);
      }
  }, [isSearchVisible]);


  const handleAddNote = () => {
    navigate('/notes/new');
  };

  const filteredNotes = useMemo(() => {
    const sorted = [...notes].sort((a, b) => new Date(b.updated_at || b.created_at!).getTime() - new Date(a.updated_at || a.created_at!).getTime());
    if (!searchQuery) {
        return sorted;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return sorted.filter(note => {
        const summary = (note.content || '').replace(/<[^>]+>/g, ' ');
        return (
            note.title.toLowerCase().includes(lowerCaseQuery) ||
            summary.toLowerCase().includes(lowerCaseQuery) ||
            (note.tags && note.tags.some(tag => tag.toLowerCase().includes(lowerCaseQuery)))
        );
    });
  }, [notes, searchQuery]);


  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        <header
          className="px-6 pt-6 pb-4 grid grid-cols-[auto_1fr_auto] items-center gap-4 flex-shrink-0 bg-[var(--color-surface-container)] border-b border-[var(--color-border)]"
          style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top, 0px))` }}
        >
          <div className="flex justify-start">
              <button className="text-[var(--color-text-secondary)] p-1" onClick={() => setIsSearchVisible(true)}>
                  <SearchIcon />
              </button>
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] text-center">Notes</h1>
          <div className="flex justify-end">
            <button className="text-[var(--color-text-primary)]" onClick={handleAddNote}>
              <PlusIconHeader />
            </button>
          </div>
        </header>
        <main className="overflow-y-auto flex-grow">
          <div className="p-6" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
            {filteredNotes.length === 0 ? (
              <EmptyNotesIllustration onAddNote={handleAddNote} />
            ) : (
              <div className="masonry-grid-notes gap-4">
                {filteredNotes.map(note => (
                  <NoteCard key={note.id} note={note} onClick={() => navigate(`/notes/${note.id}`)} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

       {/* Search Overlay */}
      <div className={`fixed inset-0 z-40 bg-[var(--color-background-primary)] flex flex-col transition-transform duration-300 ease-in-out ${isSearchVisible ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ paddingTop: `var(--safe-area-inset-top, 0px)` }}>
        <div className="flex-shrink-0 px-4 pt-4 pb-3 flex items-center gap-2">
            <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon />
                </div>
                <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search notes..."
                    className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface-container)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                />
            </div>
            <button 
                onClick={() => { setIsSearchVisible(false); setSearchQuery(''); }}
                className="font-semibold text-[var(--color-primary-500)] px-2"
            >
                Cancel
            </button>
        </div>
        
        <div className="flex-grow overflow-y-auto px-6 pb-24">
            {filteredNotes.length === 0 && searchQuery ? (
                <div className="text-center py-16">
                    <p className="text-lg font-semibold text-[var(--color-text-primary)]">No notes found</p>
                    <p className="text-[var(--color-text-secondary)] mt-1">Try a different search term.</p>
                </div>
            ) : (
                <div className="masonry-grid-notes gap-4">
                    {filteredNotes.map(note => (
                        <NoteCard key={note.id} note={note} onClick={() => { setIsSearchVisible(false); setSearchQuery(''); navigate(`/notes/${note.id}`); }} />
                    ))}
                </div>
            )}
        </div>
      </div>
    </MainLayout>
  );
};

export default NotesScreen;