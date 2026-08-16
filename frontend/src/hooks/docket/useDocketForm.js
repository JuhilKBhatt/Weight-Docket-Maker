// ./frontend/src/hooks/docket/useDocketForm.js

import { useState, useRef, useEffect } from 'react';
import docketService from '../../services/docketService';

export default function useDocketForm(mode = 'new', existingDocket = null) {
  // SCRDKT ID State
  const [scrdktID, setScrdktID] = useState(() => {
    if (existingDocket?.scrdkt_number) return existingDocket.scrdkt_number;
    return sessionStorage.getItem("scrdktID") || null;
  });

  const [undktID, setUndktID] = useState(() => {
    // If it's an existing docket, it doesn't have an alternate ID in the DB (only the current one).
    // The frontend will handle generating the alternate if needed, or we just don't allow switching on edit.
    return sessionStorage.getItem("undktID") || null;
  });

  const called = useRef(false);

  // Fetch new ID only once on mount
  useEffect(() => {
    if (mode === 'new' && !called.current && (!scrdktID || !undktID)) {
      called.current = true;
      docketService.createNewDocket().then(res => {
        setScrdktID(res.scrdkt_id);
        setUndktID(res.undkt_id);
        sessionStorage.setItem("scrdktID", res.scrdkt_id);
        sessionStorage.setItem("undktID", res.undkt_id);
      });
    }
  }, [mode, scrdktID, undktID]);

  const resetDocket = () => {
    sessionStorage.removeItem("scrdktID");
    sessionStorage.removeItem("undktID");
    setScrdktID(null);
    setUndktID(null);
    called.current = false;
  };

  return {
    scrdktID,
    undktID,
    resetDocket
  };
}