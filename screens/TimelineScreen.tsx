

import React, { useState, useMemo, useEffect } from 'react';
import MainLayout from '../components/layouts/MainLayout';
import TimelineView from '../components/views/TimelineView';
import { useData } from '../contexts/DataContext';
import { Task } from '../data/mockData';
import TimePickerModal from './TimePickerModal';
import DurationPickerModal from './DurationPickerModal';
import TaskDetailScreen from './TaskDetailScreen';
import EditTaskScreen from './EditTaskScreen';
import ConfirmationModal from '../components/common/ConfirmationModal';

const TimelineScreen: React.FC = () => {
    const { tasks: allTasks, lists: taskLists, updateTask } = useData();

    // State for modals and task interactions
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
    const [isDurationPickerOpen, setIsDurationPickerOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isTimeChangeConfirmOpen, setIsTimeChangeConfirmOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [timeToSet, setTimeToSet] = useState<string | null>(null);
    const [completingTaskId, setCompletingTaskId] = useState<number | string | null>(null);
    const [uncompletingTaskId, setUncompletingTaskId] = useState<number | string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    // Interaction handlers
    const handleCompleteTask = (taskId: number | string) => {
        setCompletingTaskId(taskId);
        setTimeout(async () => {
            await updateTask(taskId, { completed: true });
            setCompletingTaskId(null);
        }, 600);
    };

    const handleUncompleteTask = (taskId: number | string) => {
        setUncompletingTaskId(taskId);
        setTimeout(async () => {
            await updateTask(taskId, { completed: false });
            setUncompletingTaskId(null);
        }, 300);
    };

    const handleOpenTaskDetail = (task: Task) => {
        setSelectedTask(task);
        setIsDetailOpen(true);
    };

    const handleCloseTaskDetail = () => {
        setIsDetailOpen(false);
        setTimeout(() => setSelectedTask(null), 300);
    };

    const handleOpenEditTask = () => {
        setIsDetailOpen(false);
        setIsEditOpen(true);
    };

    const handleCloseEditTask = () => {
        setIsEditOpen(false);
        setTimeout(() => setSelectedTask(null), 300);
    };
    
    const handleSaveTask = async (updatedTask: Task) => {
        await updateTask(updatedTask.id, updatedTask);
        handleCloseEditTask();
    };

    const handleOpenTimePicker = (task: Task) => {
        setSelectedTask(task);
        if (task.startTime && task.type === 'Fixed') {
            setIsTimeChangeConfirmOpen(true);
        } else {
            setIsTimePickerOpen(true);
        }
    };

    const handleConfirmTimeChange = () => {
        setIsTimeChangeConfirmOpen(false);
        setIsTimePickerOpen(true);
    };

    const handleCloseTimePicker = () => {
        setIsTimePickerOpen(false);
        setTimeout(() => {
             if (!isDurationPickerOpen) {
                setSelectedTask(null);
            }
        }, 300);
    };

    const handleCloseDurationPicker = () => {
        setIsDurationPickerOpen(false);
        setTimeout(() => {
            setSelectedTask(null);
            setTimeToSet(null);
        }, 300);
    };

    const handleTimeSelect = async (time: string) => {
        if (selectedTask) {
            setTimeToSet(time);
            setIsTimePickerOpen(false);
            setIsDurationPickerOpen(true);
        }
    };
    
    const handleDurationSelect = async (duration: number) => {
        if (selectedTask && timeToSet) {
            const updates: Partial<Task> = { 
                startTime: timeToSet, 
                time: timeToSet,
                duration: duration
            };
            if (selectedTask.type !== 'Fixed') {
                updates.type = 'Fixed';
            }
            await updateTask(selectedTask.id, updates);
        }
        handleCloseDurationPicker();
    };

    // FIX: Add handler for when a task's time is changed by dragging in the timeline.
    const handleTaskTimeChange = async (taskId: string | number, newStartTime: string) => {
      await updateTask(taskId, { startTime: newStartTime, time: newStartTime });
    };

    return (
        <MainLayout>
            <TimelineView
                tasks={allTasks}
                lists={taskLists}
                currentTime={currentTime}
                onUnscheduledTaskClick={handleOpenTimePicker}
                onScheduledTaskShortPress={handleOpenTaskDetail}
                // FIX: Removed non-existent 'onScheduledTaskLongPress' prop and added required 'onTaskTimeChange' prop.
                onTaskTimeChange={handleTaskTimeChange}
                onCompleteTask={handleCompleteTask}
                onUncompleteTask={handleUncompleteTask}
                completingTaskId={completingTaskId}
                uncompletingTaskId={uncompletingTaskId}
            />
            <TimePickerModal
                isOpen={isTimePickerOpen}
                onClose={handleCloseTimePicker}
                onTimeSelect={handleTimeSelect}
                initialTime={selectedTask?.startTime}
            />
             <DurationPickerModal
                isOpen={isDurationPickerOpen}
                onClose={handleCloseDurationPicker}
                onDurationSelect={handleDurationSelect}
                initialDuration={selectedTask?.duration}
            />
             <TaskDetailScreen
                isOpen={isDetailOpen}
                onClose={handleCloseTaskDetail}
                task={selectedTask}
                onEdit={handleOpenEditTask}
            />
            <EditTaskScreen
                isOpen={isEditOpen}
                onClose={handleCloseEditTask}
                task={selectedTask}
                onSave={handleSaveTask}
            />
            <ConfirmationModal
                isOpen={isTimeChangeConfirmOpen}
                onClose={() => setIsTimeChangeConfirmOpen(false)}
                onConfirm={handleConfirmTimeChange}
                title="Change Start Time?"
                message="This is a fixed task. Are you sure you want to change the start time?"
                confirmText="Change"
                confirmVariant="primary"
            />
        </MainLayout>
    );
};

export default TimelineScreen;
