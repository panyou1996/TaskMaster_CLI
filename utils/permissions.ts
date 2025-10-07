import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// Helper to show an alert and guide user to settings
const showSettingsAlert = () => {
    alert('Camera permission is required. Please enable it in your app settings to use this feature.');
};

// Check and request camera permission
export const checkAndRequestCameraPermission = async (): Promise<boolean> => {
    // On web, the browser handles permissions when getPhoto is called.
    // We can skip the Capacitor-specific permission checks which are not implemented.
    if (!Capacitor.isNativePlatform()) {
        return true;
    }
    
    try {
        let permissions = await Camera.checkPermissions();

        if (permissions.camera === 'granted') {
            return true;
        }

        if (permissions.camera === 'denied') {
            showSettingsAlert();
            return false;
        }

        // If 'prompt' or 'prompt-with-rationale', request it
        permissions = await Camera.requestPermissions({
            permissions: ['camera']
        });

        if (permissions.camera === 'granted') {
            return true;
        } else {
            // If denied after prompt, guide to settings
            showSettingsAlert();
            return false;
        }
    } catch (e) {
        console.error("Permission check failed:", e);
        // This catch is for native platforms, where an error is unexpected.
        alert("Could not check camera permissions.");
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