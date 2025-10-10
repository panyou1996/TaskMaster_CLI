import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardInfo } from '@capacitor/keyboard';

// Helper to show an alert and guide user to settings
const showSettingsAlert = (message: string) => {
    alert(message);
};

// Check and request camera permission
export const checkAndRequestCameraPermission = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
        return true;
    }
    
    try {
        let permissions = await Camera.checkPermissions();

        if (permissions.camera === 'granted') {
            return true;
        }

        if (permissions.camera === 'denied') {
            showSettingsAlert('Camera permission is required. Please enable it in your app settings to use this feature.');
            return false;
        }

        permissions = await Camera.requestPermissions({
            permissions: ['camera']
        });

        if (permissions.camera === 'granted') {
            return true;
        } else {
            showSettingsAlert('Camera permission is required. Please enable it in your app settings to use this feature.');
            return false;
        }
    } catch (e) {
        console.error("Permission check failed:", e);
        alert("Could not check camera permissions.");
        return false;
    }
};

// Check and request notification permission
export const checkAndRequestNotificationPermission = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
        const status = await Notification.requestPermission();
        return status === 'granted';
    }

    try {
        let permissions = await LocalNotifications.checkPermissions();

        if (permissions.display === 'granted') {
            return true;
        }

        if (permissions.display === 'denied') {
            showSettingsAlert('Notification permission is required for reminders. Please enable it in your app settings.');
            return false;
        }

        permissions = await LocalNotifications.requestPermissions();
        
        if (permissions.display === 'denied') {
             showSettingsAlert('Notification permission is required for reminders. Please enable it in your app settings.');
        }
        
        return permissions.display === 'granted';

    } catch (e) {
        console.error("Notification permission check failed:", e);
        alert("Could not check notification permissions.");
        return false;
    }
};


// Function to take a photo using Capacitor Camera
export const takePhotoWithCapacitor = async (): Promise<string | null> => {
    const hasPermission = await checkAndRequestCameraPermission();
    if (!hasPermission) {
        return null;
    }

    try {
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false, // Use our custom cropper instead
            resultType: CameraResultType.DataUrl, // Get base64 data URL
            source: CameraSource.Camera,
        });

        return image.dataUrl || null;
    } catch (error) {
        if (error instanceof Error && (error.message.includes('User cancelled') || error.message.includes('cancelled'))) {
            console.log('User cancelled photo capture.');
            return null;
        }
        console.error("Error taking photo:", error);
        alert("Failed to take photo.");
        return null;
    }
};

// --- Haptic Feedback ---

/**
 * Triggers a haptic impact feedback. Best for brief, lightweight feedback.
 * @param style The intensity of the impact. Defaults to 'Light'.
 */
export const triggerHapticImpact = async (style: ImpactStyle = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style });
    } catch (e) {
      console.warn('Haptic impact failed', e);
    }
  }
};

/**
 * Triggers a haptic notification feedback. Best for events like success, warning, or error.
 * @param type The type of notification feedback. Defaults to 'Success'.
 */
export const triggerHapticNotification = async (type: NotificationType = NotificationType.Success) => {
    if (Capacitor.isNativePlatform()) {
        try {
            await Haptics.notification({ type });
        } catch(e) {
            console.warn('Haptic notification failed', e);
        }
    }
};

/**
 * Triggers a haptic feedback for selection changes (e.g., toggles, pickers).
 */
export const triggerHapticSelection = async () => {
    if (Capacitor.isNativePlatform()) {
        try {
            await Haptics.selectionStart();
            // A short delay before ending to make it feel like a single event
            setTimeout(() => {
                try { Haptics.selectionEnd(); } catch(e) {}
            }, 30);
        } catch(e) {
            console.warn('Haptic selection failed', e);
        }
    }
}

// --- Keyboard Management ---
export const useKeyboardHeight = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const showListener = Keyboard.addListener('keyboardWillShow', (info: KeyboardInfo) => {
        setKeyboardHeight(info.keyboardHeight);
      });
      const hideListener = Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardHeight(0);
      });

      return () => {
        showListener.remove();
        hideListener.remove();
      };
    }
  }, []);

  return keyboardHeight;
}