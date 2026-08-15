// ./frontend/src/hooks/docket/useDocketForm.js

import { useState, useRef, useEffect } from 'react';
import docketService from '../../services/docketService';

export default function useDocketForm(mode = 'new', existingDocket = null) {
  // SCRDKT ID State
  const [scrdktID, setScrdktID] = useState(() => {
    if (existingDocket?.scrdkt_number) return existingDocket.scrdkt_number;
    return sessionStorage.getItem("scrdktID") || null;
  });

  const [expectedScrdktID, setExpectedScrdktID] = useState(() => {
    return sessionStorage.getItem("expectedScrdktID") || null;
  });

  const called = useRef(false);

  // Fetch new ID only once on mount
  useEffect(() => {
    if (mode === 'new' && !called.current && (!scrdktID || !expectedScrdktID)) {
      called.current = true;
      docketService.createNewDocket().then(data => {
        setScrdktID(data.scrdkt_id);
        setExpectedScrdktID(data.expected_scrdkt_id);
        sessionStorage.setItem("scrdktID", data.scrdkt_id);
        sessionStorage.setItem("expectedScrdktID", data.expected_scrdkt_id);
      });
    }
  }, [mode, scrdktID, expectedScrdktID]);

  const resetDocket = () => {
    sessionStorage.removeItem("scrdktID");
    sessionStorage.removeItem("expectedScrdktID");
    setScrdktID(null);
    setExpectedScrdktID(null);
    called.current = false;
  };

  return {
    scrdktID,
    expectedScrdktID,
    resetDocket
  };
}