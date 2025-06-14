import { useEffect, useState } from 'react';

interface AudioManagerProps {
  onAudioStateChange: (isHeadphonesConnected: boolean) => void;
}

export const AudioManager = ({ onAudioStateChange }: AudioManagerProps) => {
  const [isHeadphonesConnected, setIsHeadphonesConnected] = useState(false);

  useEffect(() => {
    const checkAudioDevices = async () => {
      try {
        // Request permission to access audio devices
        await navigator.mediaDevices.getUserMedia({ audio: true });

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(
          (device) => device.kind === 'audiooutput'
        );

        // Log all audio outputs for debugging
        console.log(
          'Available audio outputs:',
          audioOutputs.map((d) => d.label)
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

        // Update state and notify parent
        setIsHeadphonesConnected(hasHeadphones);
        onAudioStateChange(hasHeadphones);

        // Log the detection result
        console.log('Headphones detected:', hasHeadphones);
      } catch (error) {
        console.error('Error checking audio devices:', error);
        // If we can't detect devices, assume no headphones
        setIsHeadphonesConnected(false);
        onAudioStateChange(false);
      }
    };

    // Initial check
    checkAudioDevices();

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', checkAudioDevices);

    // Also check when the window gains focus
    window.addEventListener('focus', checkAudioDevices);

    return () => {
      navigator.mediaDevices.removeEventListener(
        'devicechange',
        checkAudioDevices
      );
      window.removeEventListener('focus', checkAudioDevices);
    };
  }, [onAudioStateChange]);

  return null; // This is a utility component, no UI needed
};
