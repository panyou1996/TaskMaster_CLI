
import React from 'react';
import { FocusSession } from '../../data/mockData';

interface FocusGardenProps {
  history: FocusSession[];
}

const EmptyGardenIllustration: React.FC = () => (
    <div className="w-24 h-24 text-gray-300 dark:text-gray-600">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.44 8.8999C16.44 8.8999 15.34 7.2099 13.59 6.7499C11.84 6.2899 10.61 7.2899 10.15 8.1699" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12.0028 3.46997C12.0028 3.46997 12.5428 5.74997 10.1528 8.16997" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7.56002 8.16992C7.90002 7.15992 8.78002 6.00992 10.41 6.57992C12.04 7.14992 12.63 8.89992 12.63 8.89992" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 21V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 21H9C7.34315 21 6 19.6569 6 18V18C6 16.3431 7.34315 15 9 15H15C16.6569 15 18 16.3431 18 18V18C18 19.6569 16.6569 21 15 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    </div>
);

const FocusGarden: React.FC<FocusGardenProps> = ({ history }) => {
  const sortedHistory = [...history].sort((a, b) => b.plant_id - a.plant_id);

  return (
    <div className="flex flex-col items-center w-full p-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">My Focus Garden</h2>
      
      <div className="w-full max-w-md">
        {sortedHistory.length > 0 ? (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl card-shadow">
            {sortedHistory.map((plant) => {
              const date = new Date(plant.session_date + 'T00:00:00'); // Ensure local timezone
              const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
              return (
                <div key={plant.plant_id} className="flex flex-col items-center">
                  <div className="w-12 h-12">
                      <svg 
                          className="w-full h-full object-contain"
                          aria-label={`A grown ${plant.plant_type}`}
                      >
                          <use href={`#plant-${plant.plant_type}-grown`} />
                      </svg>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formattedDate}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-10 px-4 bg-white dark:bg-gray-800 rounded-xl card-shadow">
              <EmptyGardenIllustration />
              <p className="font-semibold text-gray-700 dark:text-gray-300 mt-2">Your garden is waiting to grow.</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Complete a focus session to plant your first seed.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FocusGarden;