// ./frontend/src/hooks/docket/useDocketForm.js

import { useState, useRef, useEffect } from 'react';
import docketService from '../../services/docketService';

export default function useDocketForm(mode = 'new', existingDocket = null) {
  // SCRDKT ID State
  const [scrdktID, setScrdktID] = useState(() => {
    if (existingDocket?.scrdkt_number) return existingDocket.scrdkt_number;
    return sessionStorage.getItem("scrdktID") || null;
  });

  const called = useRef(false);

  // Fetch new ID only once on mount
  useEffect(() => {
    if (mode === 'new' && !called.current && !scrdktID) {
      called.current = true;
      docketService.createNewDocket().then(id => {
        setScrdktID(id);
        sessionStorage.setItem("scrdktID", id);
      });
    }
  }, [mode, scrdktID]);

  const resetDocket = () => {
    sessionStorage.removeItem("scrdktID");
    setScrdktID(null);
    called.current = false;
  };

  return {
    scrdktID,
    resetDocket
  };
}