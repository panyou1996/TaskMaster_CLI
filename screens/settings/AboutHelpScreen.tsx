
import React from 'react';
import SettingsLayout from '../../components/layouts/SettingsLayout';
import Logo from '../../components/icons/Logo';

const AboutHelpScreen: React.FC = () => {
    return (
        <SettingsLayout title="About & Help">
            <div className="flex flex-col items-center text-center">
                <div className="text-[var(--color-primary-500)] mb-4">
                    <Logo className="h-20 w-20"/>
                </div>
                <h2 className="text-2xl font-bold">TaskMaster</h2>
                <p className="text-[var(--color-text-secondary)]">Version 1.0.0</p>
            </div>
            <div className="bg-[var(--color-surface-container)] p-6 rounded-lg card-shadow mt-8">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">About Us</h3>
                <p className="text-base text-[var(--color-text-secondary)]">
                    TaskMaster is designed to bring clarity and organization to your daily life. We believe in minimalist design and powerful functionality to help you focus on what truly matters.
                </p>
            </div>
            <div className="bg-[var(--color-surface-container)] p-4 rounded-lg card-shadow mt-6">
                <ul className="divide-y divide-[var(--color-border)]">
                    <li className="py-3"><a href="#" className="text-[var(--color-primary-500)] hover:opacity-80">Privacy Policy</a></li>
                    <li className="py-3"><a href="#" className="text-[var(--color-primary-500)] hover:opacity-80">Terms of Service</a></li>
                    <li className="py-3"><a href="#" className="text-[var(--color-primary-500)] hover:opacity-80">Contact Support</a></li>
                </ul>
            </div>
        </SettingsLayout>
    );
};

export default AboutHelpScreen;