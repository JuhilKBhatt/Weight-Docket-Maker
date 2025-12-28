// frontend/src/pages/InvoiceList.jsx

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Table, Button, Typography, Popconfirm, Tag, message } from 'antd';
import axios from 'axios';
import { audFormatterFixed } from '../scripts/utilities/AUDformatters';

const API = 'http://localhost:8000/api/invoices';

export default function InvoiceList() {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API+'/list');
      setInvoices(res.data);
    } catch (err) {
      console.error(err);
      message.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const deleteInvoice = async (id) => {
    try {
      await axios.delete(`${API}/${id}`);
      message.success('Invoice deleted');
      fetchInvoices();
    } catch (err) {
      console.error(err);
      message.error('Could not delete invoice');
    }
  };

  const markPaid = async (id) => {
    try {
      await axios.post(`${API}/${id}/paid`);
      message.success('Invoice marked as paid');
      fetchInvoices();
    } catch (err) {
      console.error(err);
      message.error('Could not mark invoice as paid');
    }
  };
  
  const columns = [
      {
        title: 'SCR Number',
        dataIndex: 'scrinv_number',
        key: 'scrinv_number',
      },
      {
        title: 'Company To',
        dataIndex: 'bill_to_name',
        key: 'bill_to_name',
      },
      {
        title: 'Total Amount',
        dataIndex: 'total_amount',
        key: 'total_amount',
        render: (val) => `$${audFormatterFixed(val)}`,
      },
      {
        title: 'Status',
        dataIndex: 'status', // CHANGED: Look for 'status' string
        key: 'status',
        render: (status) => {
          // dynamic color logic
          let color = 'default';
          if (status === 'Paid') color = 'green';
          else if (status === 'Unpaid' || status === 'Overdue') color = 'red';
          else if (status === 'Sent') color = 'blue';
          else if (status === 'Draft') color = 'orange';

          return <Tag color={color}>{status || 'Unknown'}</Tag>;
        }
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, record) => (
          <div className="flex gap-2">
            <Link to={`/edit-invoice/${record.id}`}>
              <Button type="primary">Edit</Button>
            </Link>

            <Popconfirm
              title="Delete this invoice?"
              okText="Yes"
              cancelText="No"
              onConfirm={() => deleteInvoice(record.id)}
            >
              <Button danger>Delete</Button>
            </Popconfirm>

            {/* CHANGED: Check status string instead of boolean */}
            {record.status !== 'Paid' && (
              <Button onClick={() => markPaid(record.id)}>
                Mark Paid
              </Button>
            )}
          </div>
        ),
      },
    ];

  return (
    <div className="home-container">
      <Typography.Title level={1}>
        View All Invoices
      </Typography.Title>

      <Typography.Paragraph>
        Here you can view all your invoices.
      </Typography.Paragraph>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={invoices}
        columns={columns}
      />
    </div>
  );
}