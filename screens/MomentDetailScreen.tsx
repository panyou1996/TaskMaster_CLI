import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layouts/MainLayout';
import { ChevronLeftIcon, EditIcon, ShareIcon, TrashIcon } from '../components/icons/Icons';
import { useData } from '../contexts/DataContext';
import EditMomentScreen from './EditMomentScreen';
import { Moment } from '../data/mockData';
import ConfirmationModal from '../components/common/ConfirmationModal';

const MomentDetailScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { moments, deleteMoment, updateMoment } = useData();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const INITIAL_IMAGE_HEIGHT = 320; // Corresponds to h-80 (20rem)
    const [imageHeight, setImageHeight] = useState<number>(INITIAL_IMAGE_HEIGHT);

    const moment = moments.find(m => m.id.toString() === id);

    const handleBack = () => {
        navigate('/moments');
    };

    const handleOpenEdit = () => {
        setIsEditOpen(true);
    };

    const handleSaveEdit = async (momentId: number, updates: Partial<Moment>) => {
        try {
            await updateMoment(momentId, updates);
            setIsEditOpen(false);
        } catch (error) {
            console.error("Failed to save moment:", error);
            alert("Could not save changes. Please try again.");
        }
    };
    
    const handleDeleteClick = () => {
        setIsDeleteConfirmOpen(true);
    };
    
    const handleConfirmDelete = async () => {
        if (!moment) return;
        try {
            await deleteMoment(moment.id);
            setIsDeleteConfirmOpen(false);
            navigate('/moments');
        } catch (error) {
            console.error("Failed to delete moment:", error);
            alert("Could not delete the moment. Please try again.");
            setIsDeleteConfirmOpen(false);
        }
    };

    const handleShare = async () => {
        if (!moment) return;
        if (!navigator.share) {
            alert("Sharing is not supported on your browser.");
            return;
        }

        try {
            const response = await fetch(moment.imageUrl);
            const blob = await response.blob();
            const file = new File([blob], `${moment.title.replace(/\s/g, '_')}.jpg`, { type: blob.type });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: moment.title,
                    text: moment.notes || 'Check out this moment!',
                    files: [file],
                });
            } else {
                await navigator.share({
                    title: moment.title,
                    text: `${moment.notes || 'Check out this moment!'} See it here: ${moment.imageUrl}`,
                });
            }
        } catch (error) {
            console.error("Error sharing moment:", error);
            if ((error as Error).name !== 'AbortError') {
                 alert("Could not share the moment.");
            }
        }
    };

    const handleScroll = (event: React.UIEvent<HTMLElement>) => {
        const scrollTop = event.currentTarget.scrollTop;
        if (scrollTop < 0) {
            // When pulling down, expand the image container
            setImageHeight(INITIAL_IMAGE_HEIGHT - scrollTop);
        } else if (imageHeight !== INITIAL_IMAGE_HEIGHT) {
            // When scrolling normally or at the top, reset to initial height
            setImageHeight(INITIAL_IMAGE_HEIGHT);
        }
    };
    
    const handleScrollEnd = () => {
        // When user releases the scroll/touch, smoothly animate back
        if (imageHeight !== INITIAL_IMAGE_HEIGHT) {
            setImageHeight(INITIAL_IMAGE_HEIGHT);
        }
    };


    if (!moment) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-full">
                    <p>Moment not found.</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div 
                className="absolute inset-0 bg-gray-50 dark:bg-gray-900 flex flex-col z-10 animate-page-fade-in"
            >
                <header
                    className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-4 pt-5 bg-gradient-to-b from-black/30 to-transparent"
                    style={{ paddingTop: `calc(1.25rem + env(safe-area-inset-top))` }}
                >
                    <button onClick={handleBack} className="p-2 text-white bg-black/20 rounded-full hover:bg-black/40 transition-colors">
                        <ChevronLeftIcon />
                    </button>
                    <div className="flex items-center space-x-2">
                        <button onClick={handleOpenEdit} className="p-2 text-white bg-black/20 rounded-full hover:bg-black/40 transition-colors"><EditIcon /></button>
                        <button onClick={handleShare} className="p-2 text-white bg-black/20 rounded-full hover:bg-black/40 transition-colors"><ShareIcon /></button>
                        <button onClick={handleDeleteClick} className="p-2 text-white bg-black/20 rounded-full hover:bg-black/40 transition-colors"><TrashIcon /></button>
                    </div>
                </header>

                <main 
                    onScroll={handleScroll}
                    onMouseUp={handleScrollEnd}
                    onTouchEnd={handleScrollEnd}
                    className="flex-grow overflow-y-auto pb-24"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                >
                    <div 
                        className="relative overflow-hidden transition-all duration-300 ease-out"
                        style={{ height: `${imageHeight}px` }}
                    >
                         <img 
                            src={moment.imageUrl} 
                            alt={moment.title} 
                            className="absolute top-1/2 left-1/2 w-full h-auto -translate-x-1/2 -translate-y-1/2"
                         />
                    </div>
                    
                    <div className="p-6">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{moment.title}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Created on {moment.date}</p>
                        
                        <div className="mt-6">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Notes</h2>
                            <p className="text-base text-gray-700 dark:text-gray-300 mt-2 leading-relaxed whitespace-pre-wrap">{moment.notes}</p>
                        </div>
                        
                        <div className="mt-6">
                             <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Tags</h2>
                             <div className="flex flex-wrap gap-2 mt-2">
                                {moment.tags && moment.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
                                        #{tag}
                                    </span>
                                ))}
                             </div>
                        </div>
                    </div>
                </main>
            </div>
             <EditMomentScreen
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                moment={moment}
                onSaveMoment={handleSaveEdit}
            />
            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Moment?"
                message="Are you sure you want to permanently delete this moment? This action cannot be undone."
                confirmText="Delete"
            />
        </MainLayout>
    );
};

export default MomentDetailScreen;