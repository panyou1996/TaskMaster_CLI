import React from 'react';
import { useLocation } from 'react-router-dom';
import BottomNavBar from '../common/BottomNavBar';

interface MainLayoutProps {
  children: React.ReactNode;
  hideNavBar?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, hideNavBar = false }) => {
  const location = useLocation();
  return (
    <div className="h-full w-full flex flex-col bg-gray-50 relative">
      <div key={location.pathname} className="flex-grow animate-page-fade-in relative">
        {children}
      </div>
      {!hideNavBar && <BottomNavBar />}
    </div>
  );
};

export default MainLayout;