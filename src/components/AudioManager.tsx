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

          // Strict headphone detection
          const hasHeadphones = audioOutputs.some((device) => {
            const label = device.label.toLowerCase();
            // Only consider it headphones if it explicitly contains these terms
            return (
              label.includes('headphone') ||
              label.includes('headset') ||
              label.includes('earphone') ||
              label.includes('earbud') ||
              label.includes('airpods') ||
              label.includes('bluetooth headphone') ||
              label.includes('bluetooth headset')
            );
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
