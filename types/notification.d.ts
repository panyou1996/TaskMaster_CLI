// Small augmentation to include Notification actions in TS lib.dom types
interface NotificationAction {
    action: string;
    title: string;
    icon?: string;
}

declare global {
    interface NotificationOptions {
        actions?: NotificationAction[];
        data?: any;
    }
}

export {};
