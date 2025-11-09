import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Note, Attachment } from '../data/mockData';
import { ChevronLeftIcon, BoldIcon, ItalicIcon, ListIcon, ListOrderedIcon, PaperclipIcon, XIcon, RefreshSpinnerIcon, TrashIcon, ChecklistIcon, DownloadIcon } from '../components/icons/Icons';
import ConfirmationModal from '../components/common/ConfirmationModal';

const NoteDetailScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { notes, addNote, updateNote, deleteNote, addTag, tags: allTags } = useData();

    const isNewNote = id === 'new';
    const isNewNoteRef = useRef(isNewNote);
    const [note, setNote] = useState<Partial<Note> | null>(isNewNote ? {} : null);
    
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    
    const [newLocalAttachments, setNewLocalAttachments] = useState<{file: File, name: string}[]>([]);

    const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    
    const contentEditableRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSavingRef = useRef(false);
    const isFirstLoad = useRef(true);
    const lastTempId = useRef<string | null>(null);

    useEffect(() => {
        isNewNoteRef.current = id === 'new';

        if (!isNewNoteRef.current) {
            const foundNote = notes.find(n => String(n.id) === id);
            if (foundNote) {
                setNote(foundNote);
                setTitle(foundNote.title || '');
                setContent(foundNote.content || '');
                setAttachments(foundNote.attachments || []);
                setTags(foundNote.tags || []);
                if (contentEditableRef.current && contentEditableRef.current.innerHTML !== foundNote.content) {
                    contentEditableRef.current.innerHTML = foundNote.content || '';
                }
                if (String(id).startsWith('temp_')) {
                    lastTempId.current = id;
                }
            }
        } else {
            setNote({});
            setTitle('');
            setContent('');
            setAttachments([]);
            setTags([]);
            if (contentEditableRef.current) {
                contentEditableRef.current.innerHTML = '';
            }
        }
        isFirstLoad.current = true;
    }, [id, notes]);

    // This effect handles the redirection after a temporary note is synced.
    useEffect(() => {
        if (lastTempId.current && !notes.some(n => n.id === lastTempId.current)) {
            // The temp note is gone, which means it has been synced.
            // Find the new note by looking for a synced note that doesn't have a temp ID
            // and matches the content of the last known temp note.
            const lastKnownNote = note;
            const newSyncedNote = notes.find(n => 
                !String(n.id).startsWith('temp_') &&
                n.status === 'synced' &&
                n.created_at === lastKnownNote?.created_at &&
                n.title === lastKnownNote?.title
            );

            if (newSyncedNote) {
                lastTempId.current = null;
                navigate(`/notes/${newSyncedNote.id}`, { replace: true });
            }
        }
    }, [notes, navigate, note]);

    const handleContentChange = useCallback(() => {
        if (contentEditableRef.current) {
            setContent(contentEditableRef.current.innerHTML);
        }
    }, []);

    const handleFormatAction = (e: React.MouseEvent<HTMLButtonElement>, command: string) => {
        e.preventDefault();
        document.execCommand(command, false);
        contentEditableRef.current?.focus();
        handleContentChange();
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const files = Array.from(event.target.files);
            const newFiles = files.map((file: File) => ({ file, name: file.name }));
            setNewLocalAttachments(prev => [...prev, ...newFiles]);
        }
    };
    
    const handleSave = useCallback(async () => {
        if (isSavingRef.current || (isNewNoteRef.current && !title.trim() && !content.trim())) return;
    
        isSavingRef.current = true;
        setSavingStatus('saving');
    
        const finalContent = contentEditableRef.current?.innerHTML || '';
        const filesToUpload = newLocalAttachments.map(f => f.file);
        
        try {
            if (isNewNoteRef.current) {
                const newNoteId = await addNote({ 
                    title, 
                    content: finalContent,
                    tags,
                    attachments: [], // Existing attachments will be empty for a new note
                }, filesToUpload);
    
                if (newNoteId) {
                    setNewLocalAttachments([]);
                    // Navigate to the new ID, which will trigger the useEffect to load the full note data
                    navigate(`/notes/${newNoteId}`, { replace: true });
                }
            } else if (note?.id) {
                await updateNote(note.id, { 
                    title, 
                    content: finalContent,
                    attachments,
                    tags,
                }, filesToUpload);
                setNewLocalAttachments([]);
            }
            
            setSavingStatus('saved');
            setTimeout(() => setSavingStatus('idle'), 2000);
        } catch (error) {
            console.error("Failed to save note:", error);
            alert("Could not save note. Please try again.");
            setSavingStatus('idle');
        } finally {
            isSavingRef.current = false;
        }
    }, [title, content, tags, attachments, newLocalAttachments, addNote, updateNote, note?.id, navigate]);
    
    useEffect(() => {
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            return;
        }
        if (note === null) return; // Note not loaded yet
        
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
        debounceTimer.current = setTimeout(() => {
            handleSave();
        }, 500);
    
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [title, content, attachments, tags, newLocalAttachments, handleSave, note]);
    
    const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'LI' && target.closest('.checklist-editor')) {
            const isChecked = target.getAttribute('data-checked') === 'true';
            target.setAttribute('data-checked', String(!isChecked));
            handleContentChange();
        }
    }


    const handleDelete = async () => {
        setIsDeleteConfirmOpen(false);
        if (!isNewNoteRef.current && note?.id) {
            try {
                await deleteNote(note.id);
                navigate('/notes');
            } catch (error) {
                console.error("Failed to delete note:", error);
                alert("Could not delete note. Please try again.");
            }
        }
    };

    const handleAddTag = () => {
        const trimmed = newTag.trim().toLowerCase();
        if (trimmed && !tags.map(t => t.toLowerCase()).includes(trimmed)) {
            setTags(prev => [...prev, newTag.trim()]);
            addTag(newTag.trim());
        }
        setNewTag('');
    }
    const removeTag = (tagToRemove: string) => {
        setTags(prev => prev.filter(t => t !== tagToRemove));
    }

    const removeNewAttachment = (index: number) => {
        setNewLocalAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingAttachment = (attachmentToRemove: Attachment) => {
        setAttachments(prev => prev.filter(att => att.url !== attachmentToRemove.url));
    };

    const suggestedTags = useMemo(() => allTags.filter(t => !tags.includes(t)), [allTags, tags]);


    return (
        <div className="h-full w-full flex flex-col bg-[var(--color-background-primary)] animate-page-fade-in">
             <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
            <header
                className="flex-shrink-0 p-4 flex items-center border-b border-[var(--color-border)] bg-[var(--color-surface-container)] sticky top-0 z-10"
                style={{ paddingTop: `calc(1rem + env(safe-area-inset-top, 0px))` }}
            >
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary-500)]">
                    <ChevronLeftIcon />
                </button>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                    className="flex-grow bg-transparent text-2xl font-bold text-[var(--color-text-primary)] focus:outline-none ml-2 placeholder-[var(--color-text-tertiary)]"
                />
                <div className="w-24 text-center text-xs text-[var(--color-text-tertiary)]">
                    {savingStatus === 'saving' && 'Saving...'}
                    {savingStatus === 'saved' && 'Saved'}
                </div>
                 {!isNewNote && (
                    <button onClick={() => setIsDeleteConfirmOpen(true)} className="p-2 rounded-full hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)] hover:text-[var(--color-functional-red)]">
                        <TrashIcon />
                    </button>
                )}
            </header>

            <main className="flex-grow overflow-y-auto">
                <div 
                    ref={contentEditableRef}
                    onInput={handleContentChange}
                    onClick={handleContentClick}
                    contentEditable
                    suppressContentEditableWarning
                    className="p-6 focus:outline-none text-[var(--color-text-primary)] text-base leading-relaxed prose dark:prose-invert max-w-full checklist-editor"
                    style={{ minHeight: '30vh' }}
                />

                <div className="px-6 pb-6 space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Tags</h3>
                        <div className="flex flex-wrap items-center gap-2">
                             {tags.map(tag => (
                                <div key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-[var(--color-primary-100)] text-[var(--color-primary-500)] text-sm font-medium rounded-full">
                                    <span>#{tag}</span>
                                    <button onClick={() => removeTag(tag)}><XIcon className="w-3 h-3" /></button>
                                </div>
                             ))}
                             <input 
                                type="text"
                                value={newTag}
                                onChange={e => setNewTag(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                placeholder="+ Add Tag"
                                className="bg-transparent focus:outline-none text-sm"
                            />
                        </div>
                         {suggestedTags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {suggestedTags.map(tag => (
                                    <button key={tag} onClick={() => { setTags(prev => [...prev, tag]); setNewTag(''); }} className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]">
                                        + {tag}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                
                    {(attachments.length > 0 || newLocalAttachments.length > 0) && (
                        <div>
                            <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Attachments</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {attachments.map((att, index) => (
                                <div key={index} className="relative group bg-[var(--color-surface-container-low)] p-2 rounded-lg text-sm flex items-center justify-between">
                                        <div className="flex items-center gap-2 truncate">
                                            <PaperclipIcon className="w-4 h-4 shrink-0 text-[var(--color-text-secondary)]" />
                                            <span className="truncate text-[var(--color-text-primary)]">{att.name}</span>
                                        </div>
                                        <div className="flex items-center">
                                            <a href={att.url} download={att.name} target="_blank" rel="noopener noreferrer" className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-primary-500)]">
                                                <DownloadIcon className="w-4 h-4" />
                                            </a>
                                            <button onClick={() => removeExistingAttachment(att)} className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-functional-red)]">
                                                <XIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {newLocalAttachments.map((att, index) => (
                                    <div key={index} className="relative group bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg text-sm">
                                        <div className="flex items-center gap-2 truncate text-blue-700 dark:text-blue-300">
                                            <PaperclipIcon className="w-4 h-4 shrink-0" />
                                            <span className="truncate">{att.name}</span>
                                        </div>
                                        <button onClick={() => removeNewAttachment(index)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </main>

            <footer className="flex-shrink-0 p-2 border-t border-[var(--color-border)] bg-[var(--color-surface-container)]" style={{ paddingBottom: `calc(0.5rem + env(safe-area-inset-bottom, 0px))` }}>
                 <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <button onMouseDown={(e) => handleFormatAction(e, 'bold')} className="p-2 rounded-md hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)]"><BoldIcon className="w-5 h-5" /></button>
                        <button onMouseDown={(e) => handleFormatAction(e, 'italic')} className="p-2 rounded-md hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)]"><ItalicIcon className="w-5 h-5" /></button>
                        <button onMouseDown={(e) => handleFormatAction(e, 'insertUnorderedList')} className="p-2 rounded-md hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)]"><ListIcon className="w-5 h-5" /></button>
                        <button onMouseDown={(e) => handleFormatAction(e, 'insertOrderedList')} className="p-2 rounded-md hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)]"><ListOrderedIcon className="w-5 h-5" /></button>
                        <button onMouseDown={(e) => handleFormatAction(e, 'insertUnorderedList')} className="p-2 rounded-md hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)]"><ChecklistIcon className="w-5 h-5" /></button>
                    </div>
                     <div className="flex items-center gap-2">
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-md hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)]"><PaperclipIcon className="w-5 h-5" /></button>
                     </div>
                </div>
            </footer>
            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleDelete}
                title="Delete Note?"
                message="Are you sure you want to permanently delete this note and all its attachments? This action cannot be undone."
                confirmText="Delete"
            />
        </div>
    );
};

export default NoteDetailScreen;
