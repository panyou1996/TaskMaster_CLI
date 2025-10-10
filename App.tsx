import React, { useEffect, useState, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DataProvider, useData, AppIconName } from './contexts/DataContext';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapacitorApp } from '@capacitor/app';

import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import OnboardingWelcomeScreen from './screens/onboarding/OnboardingWelcomeScreen';
import OnboardingSyncScreen from './screens/onboarding/OnboardingSyncScreen';
import OnboardingOrganizeScreen from './screens/onboarding/OnboardingOrganizeScreen';
import OnboardingJournalScreen from './screens/onboarding/OnboardingJournalScreen';
import OnboardingPermissionsScreen from './screens/onboarding/OnboardingPermissionsScreen';
import TodayScreen from './screens/TodayScreen';
import SettingsScreen from './screens/settings/SettingsScreen';
import NotificationSettingsScreen from './screens/settings/NotificationSettingsScreen';
import DataManagementScreen from './screens/settings/DataManagementScreen';
import AboutHelpScreen from './screens/settings/AboutHelpScreen';
import ThemeSettingsScreen from './screens/settings/ThemeSettingsScreen';
import PlanScreen from './screens/PlanScreen';
import ListDetailScreen from './screens/ListDetailScreen';
import MomentsScreen from './screens/MomentsScreen';
import MomentDetailScreen from './screens/MomentDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import FocusScreen from './screens/FocusScreen';
import TagDetailScreen from './screens/TagDetailScreen';

const AppRoutes: React.FC = () => {
  const { session, loading, syncError, theme, fontSize, appIcon } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState({ show: false, message: '', isError: false });
  const backPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAuthRoute = ['/login', '/signup', '/reset-password'].includes(location.pathname);
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');
  
  const appIcons: Record<AppIconName, string> = {
    default: `data:image/svg+xml,<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' stroke='%236D55A6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9' /><path d='m9 12 2 2 4-4' /></svg>`,
    violet: `data:image/svg+xml,<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' stroke='%238B5CF6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9' /><path d='m9 12 2 2 4-4' /></svg>`,
    dusk: `data:image/svg+xml,<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' stroke='%23F472B6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9' /><path d='m9 12 2 2 4-4' /></svg>`,
    leaf: `data:image/svg+xml,<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' stroke='%2310B981' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9' /><path d='m9 12 2 2 4-4' /></svg>`
  };

  // --- App Icon effect ---
  useEffect(() => {
    const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (link && appIcon) {
        link.href = appIcons[appIcon];
    }
  }, [appIcon]);

  // --- Theme effect ---
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
        const isDark = theme === 'Dark' || (theme === 'System' && mediaQuery.matches);
        root.classList.toggle('dark', isDark);
    };
    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);

  // --- Font size effect ---
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg', 'font-size-xl');
    root.classList.add(`font-size-${fontSize}`);
  }, [fontSize]);
  
  // --- Status Bar effect ---
  useEffect(() => {
    const applyStatusBarStyling = () => {
      if (!Capacitor.isNativePlatform()) {
        return;
      }
      
      const isDarkMode = document.documentElement.classList.contains('dark');
      
      // Set status bar icon style
      StatusBar.setStyle({
        style: isDarkMode ? Style.Light : Style.Dark,
      });
      
      // Allow webview to overlap status bar
      StatusBar.setOverlaysWebView({ overlay: true });
      
      // Make status bar background transparent
      StatusBar.setBackgroundColor({ color: '#00000000' });
    };

    // Apply on initial load
    applyStatusBarStyling();

    // Re-apply when theme changes (observing class change on <html>)
    const observer = new MutationObserver(applyStatusBarStyling);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      if (session && (isAuthRoute || isOnboardingRoute)) {
        navigate('/', { replace: true });
      } else if (!session && !isAuthRoute && !isOnboardingRoute) {
        navigate('/login', { replace: true });
      }
    }
  }, [session, loading, isAuthRoute, isOnboardingRoute, navigate]);

  // Effect for displaying sync errors
  useEffect(() => {
    if (syncError) {
      setToast({ show: true, message: `Sync failed. Tap sync icon for details.`, isError: true });
    } else {
      // If the error was resolved, hide the toast *if* it was an error toast.
      setToast(prev => (prev.isError ? { show: false, message: '', isError: false } : prev));
    }
  }, [syncError]);
  
  // Back button handler for native Android
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener: PluginListenerHandle;

    const handleBackButton = () => {
      const exitRoutes = ['/today', '/plan', '/moments', '/settings', '/login', '/onboarding/welcome'];
      const isOnExitRoute = exitRoutes.includes(location.pathname);

      if (isOnExitRoute) {
        if (backPressTimer.current) {
          clearTimeout(backPressTimer.current);
          CapacitorApp.exitApp();
        } else {
          setToast({ show: true, message: 'Press back again to exit', isError: false });
          backPressTimer.current = setTimeout(() => {
            setToast((prev) => {
              // Only hide the toast if it's the exit message. An error might have appeared.
              if (prev.message === 'Press back again to exit') {
                return { show: false, message: '', isError: false };
              }
              return prev;
            });
            backPressTimer.current = null;
          }, 2000);
        }
      } else {
        navigate(-1);
      }
    };
    
    CapacitorApp.addListener('backButton', handleBackButton).then(handle => {
      listener = handle;
    });

    return () => {
      if (listener) {
        listener.remove();
      }
      if (backPressTimer.current) {
        clearTimeout(backPressTimer.current);
      }
    };
  }, [location.pathname, navigate]);


  if (loading) {
      return (
          <div className="h-full w-full flex items-center justify-center">
              <svg className="w-10 h-10 animate-ios-spinner text-[var(--color-text-secondary)]" viewBox="0 0 50 50">
                  <circle className="animate-ios-spinner-path" cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" />
              </svg>
          </div>
      );
  }

  return (
      <>
        <Routes>
            <Route path="/" element={session ? <Navigate to="/today" /> : <Navigate to="/onboarding/welcome" />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/signup" element={<SignUpScreen />} />
            <Route path="/reset-password" element={<ResetPasswordScreen />} />
            
            {/* Onboarding Flow */}
            <Route path="/onboarding/welcome" element={<OnboardingWelcomeScreen />} />
            <Route path="/onboarding/sync" element={<OnboardingSyncScreen />} />
            <Route path="/onboarding/organize" element={<OnboardingOrganizeScreen />} />
            <Route path="/onboarding/journal" element={<OnboardingJournalScreen />} />
            <Route path="/onboarding/permissions" element={<OnboardingPermissionsScreen />} />

            {/* Main App */}
            <Route path="/today" element={<TodayScreen />} />
            <Route path="/plan" element={<PlanScreen />} />
            <Route path="/lists/:listId" element={<ListDetailScreen />} />
            <Route path="/moments" element={<MomentsScreen />} />
            <Route path="/moments/:id" element={<MomentDetailScreen />} />
            <Route path="/moments/tags/:tagName" element={<TagDetailScreen />} />
            <Route path="/focus" element={<FocusScreen />} />
            
            {/* Settings Flow */}
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/settings/notifications" element={<NotificationSettingsScreen />} />
            <Route path="/settings/data" element={<DataManagementScreen />} />
            <Route path="/settings/about" element={<AboutHelpScreen />} />
            <Route path="/settings/theme" element={<ThemeSettingsScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
        </Routes>
        {toast.show && (
            <div 
              className={`fixed left-1/2 -translate-x-1/2 text-white text-sm py-2 px-4 rounded-full animate-page-fade-in z-[100] ${
                toast.isError ? 'bg-red-600 bg-opacity-90' : 'bg-gray-900 bg-opacity-80'
              }`}
              style={{ bottom: `calc(6rem + env(safe-area-inset-bottom, 0px))` }}
            >
              {toast.message}
            </div>
          )}
      </>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <DataProvider>
        <AppRoutes />
      </DataProvider>
    </HashRouter>
  );
};

export default App;