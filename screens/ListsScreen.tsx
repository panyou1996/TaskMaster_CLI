import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layouts/MainLayout';
import { 
    SearchIcon, 
    PlusIconHeader,
    ChevronDownIcon,
    RefreshSpinnerIcon
} from '../components/icons/Icons';
import { EmptyListsIllustration } from '../components/illustrations/Illustrations';
import { useData } from '../contexts/DataContext';
import { TaskList } from '../data/mockData';
import AddListScreen, { NewListData } from './AddListScreen';
import EditListScreen from './EditListScreen';

const colorVariants = {
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
};


const ListsScreen: React.FC = () => {
    const { lists: taskLists, tasks: allTasks, addList, updateList, deleteList, syncData } = useData();
    const [isAddListOpen, setIsAddListOpen] = useState(false);
    const [isEditListOpen, setIsEditListOpen] = useState(false);
    const [listToEdit, setListToEdit] = useState<TaskList | null>(null);
    const navigate = useNavigate();

    // Pull to refresh state
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDelta, setPullDelta] = useState(0);
    const touchStartY = useRef<number | null>(null);
    const mainRef = useRef<HTMLElement>(null);
    const REFRESH_THRESHOLD = 80;


    const taskCounts = useMemo(() => {
        const counts: { [key: string]: number } = {};
        for (const task of allTasks) {
            counts[task.category] = (counts[task.category] || 0) + 1;
        }
        return counts;
    }, [allTasks]);

    const handleAddList = async (newListData: NewListData) => {
        await addList(newListData);
    };

    const handleOpenEditModal = (list: TaskList) => {
        setListToEdit(list);
        setIsEditListOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditListOpen(false);
        setListToEdit(null);
    };

    const handleSaveList = async (updatedList: TaskList) => {
        await updateList(updatedList.id, updatedList);
        handleCloseEditModal();
    };

    // FIX: Changed listId to allow string for temporary items
    const handleDeleteList = async (listId: number | string) => {
        const listToDelete = taskLists.find(l => l.id === listId);
        if (listToDelete) {
           await deleteList(listId, listToDelete.name);
        }
        handleCloseEditModal();
    };

    const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isClickRef = useRef(true);

    const cancelLongPress = () => {
        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
    };

    const onPointerDown = (list: TaskList) => {
        isClickRef.current = true;
        cancelLongPress();
        pressTimerRef.current = setTimeout(() => {
            isClickRef.current = false; // It's a long press
            handleOpenEditModal(list);
        }, 500);
    };

    // FIX: Changed listId to allow string for temporary items
    const onPointerUp = (listId: number | string) => {
        cancelLongPress();
        if (isClickRef.current) {
            navigate(`/lists/${listId}`);
        }
    };

    // Pull to refresh handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        if (mainRef.current?.scrollTop === 0) {
            touchStartY.current = e.touches[0].clientY;
        } else {
            touchStartY.current = null;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartY.current === null || isRefreshing) return;
        const currentY = e.touches[0].clientY;
        const delta = currentY - touchStartY.current;
        if (delta > 0) {
            setPullDelta(Math.pow(delta, 0.85)); // Apply resistance
        }
    };

    const handleTouchEnd = () => {
        if (touchStartY.current === null || isRefreshing) return;

        if (pullDelta > REFRESH_THRESHOLD) {
            setIsRefreshing(true);
            syncData().finally(() => {
                setIsRefreshing(false);
                setPullDelta(0);
                touchStartY.current = null;
            });
        } else {
            setPullDelta(0);
            touchStartY.current = null;
        }
    };


    return (
        <MainLayout>
            <div className="absolute inset-0 flex flex-col overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-14 flex justify-center items-center transition-opacity duration-300 pointer-events-none ${pullDelta > 0 || isRefreshing ? 'opacity-100' : 'opacity-0'}`}>
                    {isRefreshing ? <RefreshSpinnerIcon /> : <ChevronDownIcon className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${pullDelta > REFRESH_THRESHOLD ? 'rotate-180' : ''}`} />}
                </div>

                <div
                    className="h-full flex flex-col"
                    style={{ transform: `translateY(${isRefreshing ? 56 : pullDelta}px)`, transition: pullDelta === 0 || isRefreshing ? 'transform 0.3s' : 'none' }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <header
                        className="px-6 pt-6 pb-4 flex justify-between items-center flex-shrink-0"
                        style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top))` }}
                    >
                        <button className="text-gray-600">
                            <SearchIcon />
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900">Your Task Lists</h1>
                        <button className="text-gray-800" onClick={() => setIsAddListOpen(true)}>
                            <PlusIconHeader />
                        </button>
                    </header>

                    <main ref={mainRef} className="px-6 pb-24 overflow-y-auto flex-grow">
                        {taskLists.length === 0 ? (
                            <EmptyListsIllustration onAddList={() => setIsAddListOpen(true)} />
                        ) : (
                            <div className="space-y-3">
                                {taskLists.map(list => {
                                    const colors = colorVariants[list.color as keyof typeof colorVariants] || colorVariants.blue;
                                    const count = taskCounts[list.name] || 0;
                                    return (
                                        <div 
                                            key={list.id} 
                                            onPointerDown={() => onPointerDown(list)}
                                            onPointerUp={() => onPointerUp(list.id)}
                                            onPointerLeave={cancelLongPress}
                                            onPointerCancel={cancelLongPress}
                                            className="bg-white p-4 rounded-xl card-shadow flex items-center space-x-4 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                                            onContextMenu={(e) => e.preventDefault()}
                                        >
                                            <div className={`p-2 rounded-lg flex items-center justify-center w-12 h-12 ${colors.bg}`}>
                                                <span className="text-2xl">{list.icon}</span>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800">{list.name}</p>
                                                <p className="text-sm text-gray-500">{count} tasks</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </main>
                </div>
            </div>
            <AddListScreen 
                isOpen={isAddListOpen}
                onClose={() => setIsAddListOpen(false)}
                onAddList={handleAddList}
            />
            <EditListScreen
                isOpen={isEditListOpen}
                onClose={handleCloseEditModal}
                list={listToEdit}
                onSaveList={handleSaveList}
                onDeleteList={handleDeleteList}
            />
        </MainLayout>
    );
};

export default ListsScreen;