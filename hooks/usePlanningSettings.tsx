import useLocalStorage from './useLocalStorage';

export type PlanningAlgorithm = 'sequential' | 'weighted' | 'ask';

export interface PlanningSettings {
  workStartTime: string;
  lunchStartTime: string;
  lunchEndTime: string;
  dinnerStartTime: string;
  dinnerEndTime: string;
  workEndTime: string;
  taskGap: number;
  allowTaskSplitting: boolean;
  algorithm: PlanningAlgorithm;
}

const defaultSettings: PlanningSettings = {
  workStartTime: '08:30',
  lunchStartTime: '11:30',
  lunchEndTime: '13:00',
  dinnerStartTime: '17:30',
  dinnerEndTime: '18:00',
  workEndTime: '17:30',
  taskGap: 15,
  allowTaskSplitting: true,
  algorithm: 'sequential',
};

function usePlanningSettings() {
  const [settings, setSettings] = useLocalStorage<PlanningSettings>(
    'planning-settings',
    defaultSettings
  );

  return [settings, setSettings] as const;
}

export default usePlanningSettings;
