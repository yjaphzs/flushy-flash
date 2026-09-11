import { useEffect } from 'react';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Mount exactly once, in the root layout. Reading the action off the store
 * instance (rather than through the hook) keeps the effect from re-subscribing.
 */
export function useAuthListener() {
  useEffect(() => {
    const { setUser } = useAuthStore.getState();
    return onAuthStateChanged(getAuth(), setUser);
  }, []);
}
