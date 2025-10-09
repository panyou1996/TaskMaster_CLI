import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckIcon, PlusIconHeader, UploadImageIcon, RefreshSpinnerIcon } from '../components/icons/Icons';
import { takePhotoWithCapacitor } from '../utils/permissions';
import { useData } from '../contexts/DataContext';

const CloseIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={`w-6 h-6 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export interface NewMomentData {
    title: string;
    notes: string;
    tags: string[];
    imageUrl: string;
}

interface AddMomentScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMoment: (momentData: NewMomentData) => Promise<void>;
  initialImage?: string | null;
}

interface ImageCropperModalProps {
    imageSrc: string;
    onCrop: (croppedImageUrl: string) => void;
    onCancel: () => void;
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ imageSrc, onCrop, onCancel }) => {
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [minZoom, setMinZoom] = useState(1);
    const viewportRef = useRef<HTMLDivElement>(null);

    // Refs for gesture handling
    const panStartRef = useRef({ x: 0, y: 0, imageX: 0, imageY: 0 });
    const activePointersRef = useRef<PointerEvent[]>([]);
    const pinchStartDistanceRef = useRef(0);
    const pinchStartZoomRef = useRef(1);

    useEffect(() => {
        const img = new Image();
        img.src = imageSrc;

        const viewportEl = viewportRef.current;
        if (!viewportEl) return;

        let isImageLoaded = false;

        const calculateAndSetInitialState = () => {
            if (!isImageLoaded || !viewportRef.current) return;

            const { clientWidth: viewportWidth, clientHeight: viewportHeight } = viewportRef.current;
            if (viewportWidth > 0 && viewportHeight > 0 && img.naturalWidth > 0) {
                const scaleX = viewportWidth / img.naturalWidth;
                const scaleY = viewportHeight / img.naturalHeight;
                const initialZoom = Math.max(scaleX, scaleY);

                setZoom(initialZoom);
                setMinZoom(initialZoom);
                setPosition({ x: 0, y: 0 });
            }
        };
        
        img.onload = () => {
            setImage(img);
            isImageLoaded = true;
            calculateAndSetInitialState();
        };

        const observer = new ResizeObserver(calculateAndSetInitialState);
        observer.observe(viewportEl);

        return () => {
            img.onload = null;
            observer.disconnect();
        };
    }, [imageSrc]);

    const getConstrainedPosition = useCallback((x: number, y: number, currentZoom: number) => {
        if (!image || !viewportRef.current) return { x: 0, y: 0 };
        
        const { clientWidth: viewportWidth, clientHeight: viewportHeight } = viewportRef.current;
        const imageWidth = image.naturalWidth * currentZoom;
        const imageHeight = image.naturalHeight * currentZoom;

        const maxX = Math.max(0, (imageWidth - viewportWidth) / 2);
        const maxY = Math.max(0, (imageHeight - viewportHeight) / 2);
        
        const constrainedX = Math.max(-maxX, Math.min(maxX, x));
        const constrainedY = Math.max(-maxY, Math.min(maxY, y));
        
        return { x: constrainedX, y: constrainedY };
    }, [image]);

    useEffect(() => {
        const {x, y} = getConstrainedPosition(position.x, position.y, zoom);
        if (x !== position.x || y !== position.y) {
            setPosition({ x, y });
        }
    }, [zoom, position.x, position.y, getConstrainedPosition]);

    const getDistance = (p1: PointerEvent, p2: PointerEvent) => {
        return Math.sqrt(Math.pow(p2.clientX - p1.clientX, 2) + Math.pow(p2.clientY - p1.clientY, 2));
    };

    const onPointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        activePointersRef.current.push(e.nativeEvent as PointerEvent);

        if (activePointersRef.current.length === 1) { // Pan start
            panStartRef.current = { x: e.clientX, y: e.clientY, imageX: position.x, imageY: position.y };
        } else if (activePointersRef.current.length === 2) { // Pinch start
            pinchStartDistanceRef.current = getDistance(activePointersRef.current[0], activePointersRef.current[1]);
            pinchStartZoomRef.current = zoom;
        }
    };

    const onPointerMove = (e: React.PointerEvent) => {
        e.preventDefault();
        const index = activePointersRef.current.findIndex(p => p.pointerId === e.pointerId);
        if (index === -1) return;
        activePointersRef.current[index] = e.nativeEvent as PointerEvent;

        if (activePointersRef.current.length === 1) { // Panning
            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;
            const newX = panStartRef.current.imageX + dx;
            const newY = panStartRef.current.imageY + dy;
            setPosition(getConstrainedPosition(newX, newY, zoom));
        } else if (activePointersRef.current.length === 2) { // Pinching
            const newDistance = getDistance(activePointersRef.current[0], activePointersRef.current[1]);
            const scale = newDistance / pinchStartDistanceRef.current;
            const newZoom = Math.max(minZoom, Math.min(minZoom * 4, pinchStartZoomRef.current * scale));
            setZoom(newZoom);
        }
    };

    const onPointerUp = (e: React.PointerEvent) => {
        e.preventDefault();
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        activePointersRef.current = activePointersRef.current.filter(p => p.pointerId !== e.pointerId);

        if (activePointersRef.current.length === 1) {
            const remainingPointer = activePointersRef.current[0];
            panStartRef.current = { x: remainingPointer.clientX, y: remainingPointer.clientY, imageX: position.x, imageY: position.y };
        }
    };

    const handleCrop = () => {
        if (!image || !viewportRef.current) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { clientWidth: viewportWidth, clientHeight: viewportHeight } = viewportRef.current;
        
        const outputWidth = 600;
        const outputHeight = 450; // 4:3 aspect ratio
        canvas.width = outputWidth;
        canvas.height = outputHeight;

        const sWidth = viewportWidth / zoom;
        const sHeight = viewportHeight / zoom;
        
        const sx = (image.naturalWidth - sWidth) / 2 - (position.x / zoom);
        const sy = (image.naturalHeight - sHeight) / 2 - (position.y / zoom);

        ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, outputWidth, outputHeight);
        onCrop(canvas.toDataURL('image/jpeg', 0.8));
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-page-fade-in">
            <header className="flex-shrink-0 flex justify-between items-center p-4 text-white" style={{ paddingTop: `calc(1rem + env(safe-area-inset-top))` }}>
                <button onClick={onCancel} className="text-lg font-medium">Cancel</button>
                <h2 className="font-bold">Crop Image</h2>
                <button onClick={handleCrop} className="text-lg font-bold text-blue-400">Done</button>
            </header>
            <main className="flex-grow flex items-center justify-center p-4">
                 <div
                    ref={viewportRef}
                    className="relative w-full aspect-[4/3] overflow-hidden bg-gray-900 rounded-lg touch-none"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                >
                    {image && (
                        <img
                            src={image.src}
                            alt="Crop preview"
                            className="absolute top-1/2 left-1/2"
                            style={{
                                transformOrigin: 'center center',
                                transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                                willChange: 'transform'
                            }}
                        />
                    )}
                </div>
            </main>
            <footer className="flex-shrink-0 p-4" style={{ paddingBottom: `calc(1rem + env(safe-area-inset-bottom))` }}>
                <input
                    type="range"
                    min={minZoom}
                    max={minZoom * 4}
                    step="0.01"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
            </footer>
        </div>
    );
};


const AddMomentScreen: React.FC<AddMomentScreenProps> = ({ isOpen, onClose, onAddMoment, initialImage }) => {
    const { tags: allAvailableTags, addTag } = useData();
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [isImageSourceSelectorOpen, setIsImageSourceSelectorOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Reset state when modal opens
            setTitle('');
            setNotes('');
            setSelectedTags([]);
            setNewTag('');
            setImagePreview(null);
            setImageToCrop(null);
            setIsImageSourceSelectorOpen(false);
            setLoading(false);
            setError(null);
            // If an initial image is passed (from camera), set it to be cropped
            if (initialImage) {
                setImageToCrop(initialImage);
            }
        }
    }, [isOpen, initialImage]);

    const handleSave = async () => {
        if (!title.trim()) {
            setError("Title is required.");
            return;
        }
        if (!imagePreview) {
            setError("An image is required.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await onAddMoment({
                title,
                notes,
                tags: selectedTags,
                imageUrl: imagePreview,
            });
            onClose();
        } catch (err: any) {
            const errorMessage = (err && typeof err === 'object' && err.message)
                ? err.message
                : 'Failed to save moment. Please try again.';
            setError(errorMessage);
            console.error("Failed to save moment:", err);
        } finally {
            setLoading(false);
        }
    };
    
    const handleAddTag = () => {
        const trimmedTag = newTag.trim();
        if (trimmedTag && !selectedTags.find(t => t.toLowerCase() === trimmedTag.toLowerCase())) {
            setSelectedTags([...selectedTags, trimmedTag]);
            addTag(trimmedTag); // Add to global list in context
            setNewTag('');
        }
    };

    const handleToggleTag = (tagToToggle: string) => {
        setSelectedTags(current => 
            current.includes(tagToToggle) 
                ? current.filter(t => t !== tagToToggle) 
                : [...current, tagToToggle]
        );
    };

    const handleTakePhoto = async () => {
        const photoDataUrl = await takePhotoWithCapacitor();
        if (photoDataUrl) {
            setImageToCrop(photoDataUrl);
        }
        setIsImageSourceSelectorOpen(false);
    };

    const handleChooseFromLibrary = () => {
        if (fileInputRef.current) {
            fileInputRef.current.removeAttribute('capture');
            fileInputRef.current.click();
        }
        setIsImageSourceSelectorOpen(false);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageToCrop(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
        // Reset file input value to allow selecting the same file again
        if (event.target) {
            event.target.value = "";
        }
    };
    
    const handleCropComplete = (croppedImageUrl: string) => {
        setImagePreview(croppedImageUrl);
        setImageToCrop(null);
    };

    const handleCropCancel = () => {
        setImageToCrop(null);
    };

    const handleRemoveImage = () => {
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    
    const unselectedTags = allAvailableTags.filter(t => !selectedTags.includes(t));

    return (
        <>
            <div className={`fixed inset-0 z-50 flex items-end transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
                <div
                    className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={onClose}
                    aria-hidden="true"
                />
                <div
                    className={`w-full bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="add-moment-title"
                >
                    <header className="pt-3 px-4 pb-3 border-b border-gray-200 dark:border-gray-700" style={{ paddingTop: `calc(0.75rem + env(safe-area-inset-top))` }}>
                        <div className="w-8 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-3" />
                        <div className="flex justify-between items-center h-8">
                            <button onClick={onClose} className="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                               <CloseIcon />
                            </button>
                            <h2 id="add-moment-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">Add New Moment</h2>
                            <button onClick={handleSave} disabled={loading} className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50">
                               {loading ? <RefreshSpinnerIcon /> : <CheckIcon />}
                            </button>
                        </div>
                    </header>
                    
                    <div className="p-4 space-y-4 overflow-y-auto max-h-[75vh] pb-8 bg-gray-50 dark:bg-gray-900" style={{ paddingBottom: `calc(2rem + env(safe-area-inset-bottom))` }}>
                        {error && <p className="text-red-500 dark:text-red-400 text-sm text-center -mt-2 mb-2 px-4 bg-red-50 dark:bg-red-900/20 py-2 rounded-lg">{error}</p>}
                        
                        <div className="rounded-xl px-4 py-1 bg-white dark:bg-gray-800">
                            <input
                                type="text"
                                placeholder="Title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-transparent py-3 border-b border-gray-200 dark:border-gray-700 focus:outline-none text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            />
                            <textarea
                                rows={5}
                                placeholder="Notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full bg-transparent py-3 focus:outline-none resize-none text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            />
                        </div>
                        
                         <div className="rounded-xl p-4 bg-white dark:bg-gray-800">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tags</label>
                            <div className="flex flex-wrap gap-2">
                                {selectedTags.map(tag => (
                                    <button key={tag} onClick={() => handleToggleTag(tag)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                                        <span>{tag}</span>
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                ))}
                            </div>
                            {unselectedTags.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Suggestions</p>
                                    <div className="flex flex-wrap gap-2">
                                        {unselectedTags.map(tag => (
                                            <button key={tag} onClick={() => handleToggleTag(tag)} className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                                + {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                             <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                 <input
                                    type="text"
                                    placeholder="Add new tag..."
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                    className="w-full bg-transparent focus:outline-none text-base text-gray-600 dark:text-gray-400 placeholder-gray-500 dark:placeholder-gray-400"
                                />
                                <button onClick={handleAddTag} className="text-blue-500 dark:text-blue-400 p-1">
                                    <PlusIconHeader />
                                </button>
                            </div>
                        </div>
                        
                        <div className="rounded-xl bg-white dark:bg-gray-800 p-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Image</label>
                             <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                            {imagePreview ? (
                                <div className="relative group">
                                    <img src={imagePreview} alt="Preview" className="w-full aspect-[4/3] object-cover rounded-xl shadow-sm" />
                                    <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button type="button" onClick={() => setIsImageSourceSelectorOpen(true)} className="bg-white/90 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-white transition-all text-sm">Change Image</button>
                                    </div>
                                    <button type="button" onClick={handleRemoveImage} className="absolute top-2 right-2 w-7 h-7 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors backdrop-blur-sm" aria-label="Remove image">
                                        <CloseIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button type="button" onClick={() => setIsImageSourceSelectorOpen(true)} className="w-full flex flex-col items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium py-10 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                                    <UploadImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                    <span>Add Image</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Image Cropper Modal */}
            {imageToCrop && (
                <ImageCropperModal
                    imageSrc={imageToCrop}
                    onCrop={handleCropComplete}
                    onCancel={handleCropCancel}
                />
            )}
            
            {/* Image Source Selector Sheet */}
            <div className={`fixed inset-0 z-[60] flex items-end transition-all duration-300 ${isImageSourceSelectorOpen ? 'visible' : 'invisible'}`}>
                <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isImageSourceSelectorOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsImageSourceSelectorOpen(false)} aria-hidden="true" />
                <div className={`w-full bg-gray-100 dark:bg-gray-900 rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out transform ${isImageSourceSelectorOpen ? 'translate-y-0' : 'translate-y-full'} p-4 pb-5 space-y-2`} style={{ paddingBottom: `calc(1.25rem + env(safe-area-inset-bottom))` }}>
                    <div className="space-y-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl">
                        <button onClick={handleTakePhoto} className="w-full text-center p-3 text-lg text-blue-500 dark:text-blue-400 border-b border-gray-200 dark:border-gray-700">Take Photo</button>
                        <button onClick={handleChooseFromLibrary} className="w-full text-center p-3 text-lg text-blue-500 dark:text-blue-400">Choose from Library</button>
                    </div>
                    <button onClick={() => setIsImageSourceSelectorOpen(false)} className="w-full text-center p-3 text-lg text-blue-500 dark:text-blue-400 font-bold bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl">Cancel</button>
                </div>
            </div>
        </>
    );
};

export default AddMomentScreen;
