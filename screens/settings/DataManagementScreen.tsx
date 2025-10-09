
import React from 'react';
import SettingsLayout from '../../components/layouts/SettingsLayout';
import Button from '../../components/common/Button';

const DataManagementScreen: React.FC = () => {
    return (
        <SettingsLayout title="Data Management">
            <div className="bg-[var(--color-surface-container)] p-6 rounded-lg card-shadow space-y-4 text-center">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Sync Status</h3>
                <p className="text-[var(--color-text-secondary)]">Last synced: Just now</p>
                <Button variant="primary">Sync Now</Button>
            </div>
             <div className="bg-[var(--color-surface-container)] p-6 rounded-lg card-shadow mt-6 space-y-4">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] text-center">Manage Your Data</h3>
                <Button variant="secondary">Export Data</Button>
                <Button variant="secondary">Import Data</Button>
            </div>
        </SettingsLayout>
    );
};

export default DataManagementScreen;