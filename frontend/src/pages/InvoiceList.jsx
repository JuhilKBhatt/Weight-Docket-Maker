// frontend/src/pages/InvoiceList.jsx

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Input, Table, Button, Typography, Popconfirm, Tag, message, DatePicker, Row, Col, Space } from 'antd'; // <--- Added imports
import dayjs from 'dayjs';
import { audFormatterFixed } from '../scripts/utilities/AUDformatters';
import { getCurrencyLabel } from '../scripts/utilities/invoiceConstants';

// Import the new service functions
import { 
  getAllInvoices, 
  deleteInvoiceById, 
  updateInvoiceStatus,
  updatePrivateNotes
} from '../services/invoiceListService';

const { RangePicker } = DatePicker;

export default function InvoiceList() {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState(null);

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

  // --- FILTERING LOGIC ---
  const getFilteredInvoices = () => {
    return invoices.filter((invoice) => {
      // 1. Text Search (SCR Number OR Company Name)
      const text = searchText.toLowerCase();
      const matchText = 
        (invoice.scrinv_number || '').toLowerCase().includes(text) || 
        (invoice.bill_to_name || '').toLowerCase().includes(text);

      // 2. Date Range Search
      let matchDate = true;
      if (dateRange && dateRange[0] && dateRange[1]) {
        if (!invoice.invoice_date) {
          matchDate = false; // Filter out if no date exists when searching by date
        } else {
          const invDate = dayjs(invoice.invoice_date);
          const start = dateRange[0].startOf('day');
          const end = dateRange[1].endOf('day');
          
          // Check if date is within range (inclusive)
          matchDate = (invDate.isSame(start) || invDate.isAfter(start)) && 
                      (invDate.isSame(end) || invDate.isBefore(end));
        }
      }

      return matchText && matchDate;
    });
  };

  const filteredInvoices = getFilteredInvoices();

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

  const handleNoteSave = async (id, newNote) => {
    try {
      await updatePrivateNotes(id, newNote);
      message.success('Note saved');
    } catch (err) {
      console.error(err);
      message.error('Failed to save note');
    }
  };
  
  const columns = [
      {
        title: 'SCR Number',
        dataIndex: 'scrinv_number',
        key: 'scrinv_number',
        sorter: (a, b) => a.scrinv_number.localeCompare(b.scrinv_number),
      },
      {
        title: 'Invoice Date',
        dataIndex: 'invoice_date',
        key: 'invoice_date',
        render: (date) => dayjs(date).format('DD/MM/YYYY'),
        sorter: (a, b) => dayjs(a.invoice_date).unix() - dayjs(b.invoice_date).unix(),
        defaultSortOrder: 'descend',
      },
      {
        title: 'Company To',
        dataIndex: 'bill_to_name',
        key: 'bill_to_name',
        sorter: (a, b) => a.bill_to_name.localeCompare(b.bill_to_name),
      },
      {
        title: 'Total Amount',
        dataIndex: 'total_amount',
        key: 'total_amount',
        render: (val, record) => {
          return `${getCurrencyLabel(record.currency)}${audFormatterFixed(val)}`;
        },
        sorter: (a, b) => a.total_amount - b.total_amount,
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
        },
      },
      {
        title: 'Private Notes',
        dataIndex: 'private_notes',
        key: 'private_notes',
        width: 300,
        render: (text, record) => (
          <Input.TextArea 
            rows={5}
            defaultValue={text}
            onBlur={(e) => handleNoteSave(record.id, e.target.value)}
            placeholder="Add note..."
            maxLength={255}
          />
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, record) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            {/* ROW 1: Edit and Delete */}
            <div style={{ display: 'flex', gap: '8px' }}>
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
            </div>

            {/* ROW 2: Status Changes */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {record.status === 'Paid' ? (
                <Button size="small" onClick={() => changeStatus(record.id, 'unpaid')}>
                  Mark Unpaid
                </Button>
              ) : (
                <Button size="small" onClick={() => changeStatus(record.id, 'paid')}>
                  Mark Paid
                </Button>
              )}

              {record.status !== 'Sent' && record.status !== 'Paid' && (
                <Button size="small" onClick={() => changeStatus(record.id, 'sent')}>
                  Mark Sent
                </Button>
              )}

              {record.status !== 'Draft' && record.status !== 'Paid' && (
                <Button size="small" onClick={() => changeStatus(record.id, 'draft')}>
                  Mark Draft
                </Button>
              )}
            </div>
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

      {/* --- SEARCH BAR --- */}
      <Row gutter={16} style={{ marginBottom: 20, width: '100%' }}>
        <Col span={8}>
          <Input 
            placeholder="Search SCR Number or Company..." 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </Col>
        <Col span={8}>
          <RangePicker 
            style={{ width: '100%' }}
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            format="DD/MM/YYYY"
          />
        </Col>
        <Col span={8}>
            <Button 
                onClick={() => { setSearchText(''); setDateRange(null); }}
            >
                Clear Filters
            </Button>
        </Col>
      </Row>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={filteredInvoices}
        columns={columns}
      />
    </div>
  );
}