// frontend/src/pages/InvoiceList.jsx

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Table, Button, Typography, Popconfirm, Tag, message } from 'antd';
import { audFormatterFixed } from '../scripts/utilities/AUDformatters';
import { getCurrencyLabel } from '../scripts/utilities/invoiceConstants';

// Import the new service functions
import { 
  getAllInvoices, 
  deleteInvoiceById, 
  updateInvoiceStatus 
} from '../services/invoiceListService';

export default function InvoiceList() {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);

  // Load Invoices
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await getAllInvoices();
      setInvoices(data);
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

  // Delete Invoice
  const handleDelete = async (id) => {
    try {
      await deleteInvoiceById(id);
      message.success('Invoice deleted');
      fetchInvoices();
    } catch (err) {
      console.error(err);
      message.error('Could not delete invoice');
    }
  };

  // Unified Status Handler
  const changeStatus = async (id, statusType) => {
    try {
      await updateInvoiceStatus(id, statusType);
      
      const statusLabel = statusType.charAt(0).toUpperCase() + statusType.slice(1);
      message.success(`Invoice marked as ${statusLabel}`);
      
      fetchInvoices();
    } catch (err) {
      console.error(err);
      message.error(`Could not mark invoice as ${statusType}`);
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
        render: (val, record) => {
          return `${getCurrencyLabel(record.currency)}${audFormatterFixed(val)}`;
        },
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status) => {
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
              onConfirm={() => handleDelete(record.id)}
            >
              <Button danger>Delete</Button>
            </Popconfirm>

            {record.status === 'Paid' ? (
              <Button onClick={() => changeStatus(record.id, 'unpaid')}>
                Mark Unpaid
              </Button>
            ) : (
              <Button onClick={() => changeStatus(record.id, 'paid')}>
                Mark Paid
              </Button>
            )}

            {record.status !== 'Sent' && record.status !== 'Paid' && (
              <Button onClick={() => changeStatus(record.id, 'sent')}>
                Mark Sent
              </Button>
            )}

            {record.status !== 'Draft' && record.status !== 'Paid' && (
              <Button onClick={() => changeStatus(record.id, 'draft')}>
                Mark Draft
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