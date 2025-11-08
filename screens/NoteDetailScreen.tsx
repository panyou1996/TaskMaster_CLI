import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Note, Attachment } from '../data/mockData';
import { ChevronLeftIcon, SaveIcon, BoldIcon, ItalicIcon, ListIcon, ListOrderedIcon, PaperclipIcon, XIcon, RefreshSpinnerIcon, TrashIcon } from '../components/icons/Icons';
import ConfirmationModal from '../components/common/ConfirmationModal';

const NoteDetailScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { notes, addNote, updateNote, deleteNote } = useData();

    const isNewNote = id === 'new';
    const [note, setNote] = useState<Partial<Note> | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    
    const [newLocalAttachments, setNewLocalAttachments] = useState<{file: File, name: string}[]>([]);

    const [isSaving, setIsSaving] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    
    const contentEditableRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isNewNote) {
            const foundNote = notes.find(n => String(n.id) === id);
            if (foundNote) {
                setNote(foundNote);
                setTitle(foundNote.title || '');
                setContent(foundNote.content || '');
                setAttachments(foundNote.attachments || []);
                setTags(foundNote.tags || []);
                if (contentEditableRef.current) {
                    contentEditableRef.current.innerHTML = foundNote.content || '';
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
    }, [id, notes, isNewNote]);

    const handleContentChange = () => {
        if (contentEditableRef.current) {
            setContent(contentEditableRef.current.innerHTML);
        }
    };

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

    const handleSave = async () => {
        setIsSaving(true);
        const finalContent = contentEditableRef.current?.innerHTML || '';

        try {
            if (isNewNote) {
                await addNote({ 
                    title, 
                    content: finalContent,
                    tags,
                    attachments: [],
                }, newLocalAttachments.map(f => f.file));
            } else if (note?.id) {
                await updateNote(note.id, { 
                    title, 
                    content: finalContent,
                    attachments,
                    tags,
                }, newLocalAttachments.map(f => f.file));
            }
            navigate('/notes');
        } catch (error) {
            console.error("Failed to save note:", error);
            alert("Could not save note. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleteConfirmOpen(false);
        if (!isNewNote && note?.id) {
            try {
                await deleteNote(note.id);
                navigate('/notes');
            } catch (error) {
                console.error("Failed to delete note:", error);
                alert("Could not delete note. Please try again.");
            }
        }
    };

    const removeNewAttachment = (index: number) => {
        setNewLocalAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingAttachment = async (attachmentToRemove: Attachment) => {
        if (!note?.id || isNewNote) return;
        const newAttachments = attachments.filter(att => att.url !== attachmentToRemove.url);

        try {
             setAttachments(newAttachments); // Optimistic update
             await updateNote(note.id, { attachments: newAttachments });
        } catch (error) {
             console.error("Failed to remove attachment:", error);
             setAttachments(prev => [...prev, attachmentToRemove]); // Revert
             alert("Could not remove attachment. Please try again.");
        }
    };

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
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="p-2 rounded-full text-[var(--color-primary-500)] hover:bg-[var(--color-primary-100)] transition-colors disabled:opacity-50"
                >
                    {isSaving ? <RefreshSpinnerIcon /> : <SaveIcon className="w-6 h-6"/>}
                </button>
            </header>

            <main className="flex-grow overflow-y-auto">
                <div 
                    ref={contentEditableRef}
                    onInput={handleContentChange}
                    contentEditable
                    suppressContentEditableWarning
                    className="p-6 focus:outline-none text-[var(--color-text-primary)] text-base leading-relaxed prose dark:prose-invert max-w-full"
                    style={{ minHeight: '30vh' }}
                />

                {(attachments.length > 0 || newLocalAttachments.length > 0) && (
                    <div className="px-6 pb-6">
                        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Attachments</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {attachments.map((att, index) => (
                                <div key={index} className="relative group bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-sm">
                                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 truncate text-[var(--color-text-primary)] hover:underline">
                                        <PaperclipIcon className="w-4 h-4 shrink-0" />
                                        <span className="truncate">{att.name}</span>
                                    </a>
                                    <button onClick={() => removeExistingAttachment(att)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <XIcon className="w-3 h-3" />
                                    </button>
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
            </main>

            <footer className="flex-shrink-0 p-2 border-t border-[var(--color-border)] bg-[var(--color-surface-container)]" style={{ paddingBottom: `calc(0.5rem + env(safe-area-inset-bottom, 0px))` }}>
                 <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <button onMouseDown={(e) => handleFormatAction(e, 'bold')} className="p-2 rounded-md hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)]"><BoldIcon className="w-5 h-5" /></button>
                        <button onMouseDown={(e) => handleFormatAction(e, 'italic')} className="p-2 rounded-md hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)]"><ItalicIcon className="w-5 h-5" /></button>
                        <button onMouseDown={(e) => handleFormatAction(e, 'insertUnorderedList')} className="p-2 rounded-md hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)]"><ListIcon className="w-5 h-5" /></button>
                        <button onMouseDown={(e) => handleFormatAction(e, 'insertOrderedList')} className="p-2 rounded-md hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)]"><ListOrderedIcon className="w-5 h-5" /></button>
                    </div>
                     <div className="flex items-center gap-2">
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-md hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)]"><PaperclipIcon className="w-5 h-5" /></button>
                         {!isNewNote && (
                            <button onClick={() => setIsDeleteConfirmOpen(true)} className="p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--color-text-secondary)] hover:text-red-600 dark:hover:text-red-400">
                                <TrashIcon />
                            </button>
                        )}
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