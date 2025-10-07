import React from 'react';
import { useNavigate } from 'react-router-dom';
import { checkAndRequestCameraPermission } from '../../utils/permissions';
import Button from '../../components/common/Button';

const QuestionMarkIcon: React.FC = () => (
    <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
);

const OnboardingPermissionsScreen: React.FC = () => {
    const navigate = useNavigate();
    const currentStep = 4;
    const totalSteps = 4;
    const dots = Array.from({ length: totalSteps }, (_, i) => i + 1);
    
    const handleAllow = async () => {
        await checkAndRequestCameraPermission();
        navigate('/signup');
    };

    const handleNotNow = () => {
        navigate('/signup');
    };
    
    // Using a more generic image seed as the original image is an asset
    const imageSrc = "https://i.ibb.co/68g6pXW/7062402.jpg";

    return (
        <div className="h-full w-full flex flex-col bg-[var(--color-background-primary)] text-[var(--color-text-primary)]">
            <header
                className="flex-shrink-0 p-6 flex justify-between items-center"
                style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top))` }}
            >
                <h1 className="text-xl font-bold text-[var(--color-text-primary)]">TaskMaster</h1>
                <button aria-label="Help">
                    <QuestionMarkIcon />
                </button>
            </header>
            
            <main className="flex-grow flex flex-col items-center justify-center p-8 text-center -mt-12">
                <div className="bg-[var(--color-surface-container)] p-4 rounded-2xl card-shadow">
                    <img src={imageSrc} alt="Permissions illustration" className="w-64 h-56 object-cover rounded-xl" />
                </div>
                <h2 className="text-3xl font-bold text-[var(--color-text-primary)] mt-8">We Need Your Permission</h2>
                <p className="mt-2 text-base text-[var(--color-text-secondary)] max-w-xs">
                    To enhance your experience, TaskMaster requires certain permissions. We respect your privacy and ensure your data is secure.
                </p>
            </main>
            
            <footer
                className="flex-shrink-0 p-8 space-y-4"
                style={{ paddingBottom: `calc(2rem + env(safe-area-inset-bottom))` }}
            >
                <Button variant="primary" onClick={handleAllow}>Allow</Button>
                <Button variant="secondary" onClick={handleNotNow}>Not Now</Button>

                <div className="flex justify-center items-center gap-2 pt-2">
                    {dots.map(step => (
                        <div
                            key={step}
                            className={`h-2 rounded-full transition-all duration-300 ${step === currentStep ? 'w-2 bg-gray-800' : 'w-2 bg-gray-300'}`}
                        />
                    ))}
                    {/* The design from the image has three dots, with the last one highlighted. Let's adjust to match it. */}
                    <div className="w-2 h-2 bg-gray-300 rounded-full" />
                    <div className="w-2 h-2 bg-gray-300 rounded-full" />
                    <div className="w-2 h-2 bg-gray-800 rounded-full" />
                </div>
            </footer>
        </div>
    );
};

export default OnboardingPermissionsScreen;