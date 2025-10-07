import React from 'react';
import SettingsLayout from '../../components/layouts/SettingsLayout';
import Button from '../../components/common/Button';

const DataManagementScreen: React.FC = () => {
    return (
        <SettingsLayout title="Data Management">
            <div className="bg-white p-6 rounded-lg card-shadow space-y-4 text-center">
                <h3 className="text-lg font-semibold text-gray-800">Sync Status</h3>
                <p className="text-gray-500">Last synced: Just now</p>
                <Button variant="primary">Sync Now</Button>
            </div>
             <div className="bg-white p-6 rounded-lg card-shadow mt-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 text-center">Manage Your Data</h3>
                <Button variant="secondary">Export Data</Button>
                <Button variant="secondary">Import Data</Button>
            </div>
        </SettingsLayout>
    );
};

export default DataManagementScreen;