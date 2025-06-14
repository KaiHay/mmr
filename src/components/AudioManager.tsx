import { useEffect, useState, useRef } from 'react';

interface AudioManagerProps {
  onAudioStateChange: (isHeadphonesConnected: boolean) => void;
}

export const AudioManager = ({ onAudioStateChange }: AudioManagerProps) => {
  const [isHeadphonesConnected, setIsHeadphonesConnected] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const checkAudioDevices = async () => {
      // Clear any pending timeout
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      // Set a new timeout
      timeoutRef.current = window.setTimeout(async () => {
        try {
          // Request permission to access audio devices
          await navigator.mediaDevices.getUserMedia({ audio: true });

          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioOutputs = devices.filter(
            (device) => device.kind === 'audiooutput'
          );

          // Debug log all audio outputs
          console.log(
            'All audio outputs:',
            audioOutputs.map((d) => ({
              label: d.label,
              deviceId: d.deviceId,
              groupId: d.groupId,
            }))
          );

          // Check for both wired and bluetooth headphones
          const hasHeadphones = audioOutputs.some((device) => {
            const label = device.label.toLowerCase();

            // Check for wired headphones (existing logic)
            const isWiredHeadphone =
              label.includes('headphone') ||
              label.includes('headset') ||
              label.includes('earphone') ||
              label.includes('earbud') ||
              label.includes('airpods');

            // Enhanced bluetooth device detection
            const isBluetoothDevice =
              // Check for common bluetooth headset labels
              label.includes('bluetooth') ||
              label.includes('wireless') ||
              label.includes('bt-') ||
              label.includes('bt ') ||
              // Check for common bluetooth headset manufacturers
              label.includes('jbl') ||
              label.includes('sony') ||
              label.includes('bose') ||
              label.includes('beats') ||
              label.includes('samsung') ||
              label.includes('apple') ||
              // Check for bluetooth in groupId
              (device.groupId &&
                device.groupId.toLowerCase().includes('bluetooth')) ||
              // Check for bluetooth in deviceId
              (device.deviceId &&
                device.deviceId.toLowerCase().includes('bluetooth'));

            // Debug log for each device
            if (isBluetoothDevice) {
              console.log('Bluetooth device detected:', {
                label: device.label,
                deviceId: device.deviceId,
                groupId: device.groupId,
              });
            }

            // Consider it headphones if it's either a wired headphone or a bluetooth device
            return isWiredHeadphone || isBluetoothDevice;
          });

          // Only update and log if the state has changed
          if (hasHeadphones !== isHeadphonesConnected) {
            setIsHeadphonesConnected(hasHeadphones);
            onAudioStateChange(hasHeadphones);
            console.log('Headphones detected:', hasHeadphones);
          }
        } catch (error) {
          console.error('Error checking audio devices:', error);
          // If we can't detect devices, assume no headphones
          if (isHeadphonesConnected) {
            setIsHeadphonesConnected(false);
            onAudioStateChange(false);
          }
        }
      }, 500); // Wait 500ms before checking
    };

    // Initial check
    checkAudioDevices();

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', checkAudioDevices);

    // Also check when the window gains focus
    window.addEventListener('focus', checkAudioDevices);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      navigator.mediaDevices.removeEventListener(
        'devicechange',
        checkAudioDevices
      );
      window.removeEventListener('focus', checkAudioDevices);
    };
  }, [onAudioStateChange, isHeadphonesConnected]);

  return null; // This is a utility component, no UI needed
};
