import { useEffect } from 'react';

import { subscribeToBuildings } from '@/features/buildings/api';
import { subscribeToRestrooms } from '@/features/restrooms/api';
import { useCampusStore } from '@/stores/campus-store';

/**
 * Mount once, inside the authenticated tree. Two listeners for the entire app;
 * every screen reads from the store rather than opening its own query.
 */
export function useCampusData() {
  useEffect(() => {
    const { setBuildings, setRestrooms, setError } = useCampusStore.getState();

    const unsubBuildings = subscribeToBuildings(setBuildings, (e) => setError(e.message));
    const unsubRestrooms = subscribeToRestrooms(setRestrooms, (e) => setError(e.message));

    return () => {
      unsubBuildings();
      unsubRestrooms();
    };
  }, []);
}
