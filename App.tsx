import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DataProvider, useData } from './contexts/DataContext';

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
  const { session, loading } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthRoute = ['/login', '/signup', '/reset-password'].includes(location.pathname);
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');
  
  useEffect(() => {
    if (!loading) {
      if (session && (isAuthRoute || isOnboardingRoute)) {
        navigate('/', { replace: true });
      } else if (!session && !isAuthRoute && !isOnboardingRoute) {
        navigate('/login', { replace: true });
      }
    }
  }, [session, loading, isAuthRoute, isOnboardingRoute, navigate]);
  
  if (loading) {
      return (
          <div className="h-full w-full flex items-center justify-center">
              <svg className="w-10 h-10 animate-ios-spinner text-gray-500" viewBox="0 0 50 50">
                  <circle className="animate-ios-spinner-path" cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" />
              </svg>
          </div>
      );
  }

  return (
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