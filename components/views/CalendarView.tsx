import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { Moment } from '../../data/mockData';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from '../icons/Icons';

const formatDateToYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseDateString = (dateString: string): Date => {
    const [monthStr, dayStr, yearStr] = dateString.split(' ');
    const month = new Date(Date.parse(monthStr +" 1, 2012")).getMonth();
    const day = parseInt(dayStr.replace(',', ''));
    const year = parseInt(yearStr);
    return new Date(year, month, day);
}

const CalendarView: React.FC = () => {
    const { moments } = useData();
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(false);

    const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
    const lastDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), [currentDate]);

    const momentsByDay = useMemo(() => {
        const map = new Map<string, Moment[]>();
        moments.forEach(moment => {
            if (moment.date) {
                const date = parseDateString(moment.date);
                const dateString = formatDateToYYYYMMDD(date);
                if (!map.has(dateString)) {
                    map.set(dateString, []);
                }
                map.get(dateString)!.push(moment);
            }
        });
        return map;
    }, [moments]);

    const displayedDays = useMemo(() => {
        const generateDays = (startDate: Date, dayCount: number, offset: number = 0) => {
             const days = [];
             for(let i = 0; i < offset; i++) {
                 days.push({ day: null, date: null, moments: [] });
             }
             for (let i = 0; i < dayCount; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateString = formatDateToYYYYMMDD(date);
                days.push({
                    day: date.getDate(),
                    date: date,
                    moments: momentsByDay.get(dateString) || [],
                });
            }
            return days;
        };

        if (isCalendarCollapsed) {
            const startOfWeek = new Date(selectedDate);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            return generateDays(startOfWeek, 7);
        } else {
            return generateDays(firstDayOfMonth, lastDayOfMonth.getDate(), firstDayOfMonth.getDay());
        }
    }, [isCalendarCollapsed, selectedDate, momentsByDay, firstDayOfMonth, lastDayOfMonth]);
    
    const selectedDayMoments = useMemo(() => {
        const dateString = formatDateToYYYYMMDD(selectedDate);
        return momentsByDay.get(dateString) || [];
    }, [selectedDate, momentsByDay]);

    const handlePrevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    const today = new Date();
    const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <div className="px-6">
            <div className="pt-4">
                <div className="mb-6 flex-shrink-0">
                    <div className={`flex items-center mb-4 ${isCalendarCollapsed ? 'justify-center' : 'justify-between'}`}>
                        {!isCalendarCollapsed && <button onClick={handlePrevMonth} className="p-1 text-gray-500 hover:text-gray-800" aria-label="Previous month"><ChevronLeftIcon /></button>}
                        <button 
                            onClick={() => setIsCalendarCollapsed(!isCalendarCollapsed)} 
                            className="flex items-center gap-1 font-bold text-lg text-gray-800 focus:outline-none rounded-md px-2 py-1 hover:bg-gray-100"
                            aria-expanded={!isCalendarCollapsed}
                        >
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isCalendarCollapsed ? 'rotate-180' : ''}`} />
                        </button>
                        {!isCalendarCollapsed && <button onClick={handleNextMonth} className="p-1 text-gray-500 hover:text-gray-800" aria-label="Next month"><ChevronRightIcon /></button>}
                    </div>
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCalendarCollapsed ? 'max-h-32' : 'max-h-[30rem]'}`}>
                        <div className="grid grid-cols-7 gap-1 text-center">
                            {dayHeaders.map(day => <div key={day} className="text-sm h-8 flex items-center justify-center font-medium text-gray-500">{day}</div>)}
                            {displayedDays.map((dayObj, index) => {
                                const isSelected = dayObj.date && isSameDay(dayObj.date, selectedDate);
                                const isToday = dayObj.date && isSameDay(dayObj.date, today);
                                let buttonClass = 'bg-white text-gray-700 hover:bg-gray-100';
                                if (isSelected) buttonClass = 'bg-blue-600 text-white';
                                else if (isToday) buttonClass = 'bg-gray-100 text-gray-800';

                                const tagsForDay = Array.from(new Set(dayObj.moments.flatMap(m => m.tags || [])));

                                return (
                                    <div key={index} className="flex justify-center items-start">
                                        {dayObj.day && (
                                            <button 
                                                onClick={() => dayObj.date && setSelectedDate(dayObj.date)}
                                                className={`w-full h-20 rounded-lg text-sm font-medium flex flex-col items-center pt-1.5 transition-colors relative ${buttonClass}`}
                                            >
                                                <span className={`w-6 h-6 flex items-center justify-center rounded-full ${isSelected ? '' : isToday ? 'bg-white' : ''}`}>
                                                    {dayObj.day}
                                                </span>
                                                 {tagsForDay.length > 0 && (
                                                    <div className="mt-1 w-full px-1 space-y-0.5 overflow-hidden">
                                                        {tagsForDay.slice(0, 2).map(tag => (
                                                            <div key={tag} className={`text-xs text-left truncate px-1 rounded-sm ${isSelected ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-700'}`}>
                                                                {tag}
                                                            </div>
                                                        ))}
                                                        {tagsForDay.length > 2 && (
                                                            <div className={`text-xs text-center ${isSelected ? 'text-purple-100' : 'text-gray-400'}`}>+ {tagsForDay.length - 2} more</div>
                                                        )}
                                                    </div>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex-grow flex flex-col">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex-shrink-0">
                        Check-ins for {selectedDate.toLocaleString('default', { month: 'long' })} {selectedDate.getDate()}
                    </h2>
                    {selectedDayMoments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No check-ins for this day.</div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                             {selectedDayMoments.map(moment => (
                                <button key={moment.id} onClick={() => navigate(`/moments/${moment.id}`)} className="aspect-square rounded-lg overflow-hidden card-shadow">
                                    <img src={moment.imageUrl} alt={moment.title} className="w-full h-full object-cover"/>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalendarView;