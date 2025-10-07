import React from 'react';
import SettingsLayout from '../../components/layouts/SettingsLayout';
import Logo from '../../components/icons/Logo';

const AboutHelpScreen: React.FC = () => {
    return (
        <SettingsLayout title="About & Help">
            <div className="flex flex-col items-center text-center">
                <div className="text-indigo-600 mb-4">
                    <Logo className="h-20 w-20"/>
                </div>
                <h2 className="text-2xl font-bold">TaskMaster</h2>
                <p className="text-gray-500">Version 1.0.0</p>
            </div>
            <div className="bg-white p-6 rounded-lg card-shadow mt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">About Us</h3>
                <p className="text-base text-gray-700">
                    TaskMaster is designed to bring clarity and organization to your daily life. We believe in minimalist design and powerful functionality to help you focus on what truly matters.
                </p>
            </div>
            <div className="bg-white p-4 rounded-lg card-shadow mt-6">
                <ul className="divide-y divide-gray-200">
                    <li className="py-3"><a href="#" className="text-indigo-600 hover:underline">Privacy Policy</a></li>
                    <li className="py-3"><a href="#" className="text-indigo-600 hover:underline">Terms of Service</a></li>
                    <li className="py-3"><a href="#" className="text-indigo-600 hover:underline">Contact Support</a></li>
                </ul>
            </div>
        </SettingsLayout>
    );
};

export default AboutHelpScreen;