// src/pages/docket/EditDocketForm.jsx

import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import DocketForm from './DocketForm';
import dayjs from 'dayjs';

const API = 'http://localhost:8000/api/dockets';

export default function EditDocketForm() {
  const { id } = useParams();
  const [docket, setDocket] = useState(null);

  useEffect(() => {
    async function loadDocket() {
      try {
        const res = await axios.get(`${API}/${id}`);
        const data = res.data;

        // Normalize Data for Form
        const normalized = {
          ...data,
          // Convert dates to dayjs objects for AntD
          docket_date: data.docket_date ? dayjs(data.docket_date) : null,
          docket_time: data.docket_time ? dayjs(data.docket_time, 'hh:mm a') : null,
          customer_dob: data.customer_dob ? dayjs(data.customer_dob) : null,
          
          // Ensure arrays exist
          items: data.items.map(i => ({ ...i, key: i.id || Date.now() + Math.random() })),
          deductions: data.deductions.map(d => ({ ...d, key: d.id || Date.now() + Math.random() }))
        };

        setDocket(normalized);
      } catch (err) {
        console.error("Failed to load docket", err);
      }
    }

    if (id) loadDocket();
  }, [id]);

  if (!docket) return <div style={{padding: 20}}>Loading Docket...</div>;

  return <DocketForm mode="edit" existingDocket={docket} />;
}