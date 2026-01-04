// frontend/src/pages/InvoiceList.jsx

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Input, Table, Button, Typography, Popconfirm, Tag, message, DatePicker, Row, Col, Space, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined, SendOutlined, FileTextOutlined } from '@ant-design/icons';
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
      
      // Sort logic from previous request
      const sortedData = data.sort((a, b) => {
        const isPaidA = a.status === 'Paid';
        const isPaidB = b.status === 'Paid';
        if (isPaidA && !isPaidB) return 1;
        if (!isPaidA && isPaidB) return -1;

        const dateA = a.invoice_date ? dayjs(a.invoice_date).valueOf() : 0;
        const dateB = b.invoice_date ? dayjs(b.invoice_date).valueOf() : 0;
        if (dateA !== dateB) return dateB - dateA;

        return b.id - a.id;
      });

      setInvoices(sortedData);
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

  const getFilteredInvoices = () => {
    return invoices.filter((invoice) => {
      const text = searchText.toLowerCase();
      const matchText = 
        (invoice.scrinv_number || '').toLowerCase().includes(text) || 
        (invoice.bill_to_name || '').toLowerCase().includes(text);

      let matchDate = true;
      if (dateRange && dateRange[0] && dateRange[1]) {
        if (!invoice.invoice_date) {
          matchDate = false;
        } else {
          const invDate = dayjs(invoice.invoice_date);
          const start = dateRange[0].startOf('day');
          const end = dateRange[1].endOf('day');
          matchDate = (invDate.isSame(start) || invDate.isAfter(start)) && 
                      (invDate.isSame(end) || invDate.isBefore(end));
        }
      }
      return matchText && matchDate;
    });
  };

  const filteredInvoices = getFilteredInvoices();

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
        title: 'TAX INVOICE ID#',
        dataIndex: 'scrinv_number',
        key: 'scrinv_number',
        sorter: (a, b) => a.scrinv_number.localeCompare(b.scrinv_number),
      },
      {
        title: 'Invoice Date',
        dataIndex: 'invoice_date',
        key: 'invoice_date',
        render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '',
        sorter: (a, b) => dayjs(a.invoice_date).unix() - dayjs(b.invoice_date).unix(),
      },
      {
        title: 'Company To',
        dataIndex: 'bill_to_name',
        key: 'bill_to_name',
        sorter: (a, b) => (a.bill_to_name || '').localeCompare(b.bill_to_name || ''),
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
          else if (status === 'Downloaded') color = 'geekblue';

          return <Tag color={color}>{status || 'Unknown'}</Tag>;
        },
        filters: [
          { text: 'Draft', value: 'Draft' },
          { text: 'Downloaded', value: 'Downloaded' },
          { text: 'Sent', value: 'Sent' },
          { text: 'Unpaid', value: 'Unpaid' },
          { text: 'Paid', value: 'Paid' },
        ],
        onFilter: (value, record) => record.status === value,
        sorter: (a, b) => (a.status || '').localeCompare(b.status || ''),
      },
      {
        title: 'Private Notes',
        dataIndex: 'private_notes',
        key: 'private_notes',
        width: 275,
        render: (text, record) => (
          <Input.TextArea 
            rows={3}
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
        align: 'center',
        render: (_, record) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            
            {/* ROW 1: Edit / Delete */}
            <Space>
              <Tooltip title="Edit Invoice">
                <Link to={`/edit-invoice/${record.id}`}>
                  <Button type="primary" shape="circle" icon={<EditOutlined />} />
                </Link>
              </Tooltip>

              <Tooltip title="Delete Invoice">
                <Popconfirm
                  title="Are you sure?"
                  okText="Yes"
                  cancelText="No"
                  onConfirm={() => handleDelete(record.id)}
                >
                  <Button danger shape="circle" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Tooltip>
            </Space>

            {/* ROW 2: Status Actions */}
            <Space>
              {record.status === 'Paid' ? (
                <Tooltip title="Mark Unpaid">
                  <Button size="small" shape="circle" icon={<CloseCircleOutlined />} onClick={() => changeStatus(record.id, 'unpaid')} />
                </Tooltip>
              ) : (
                <Tooltip title="Mark Paid">
                  <Button size="small" shape="circle" type="dashed" style={{ borderColor: 'green', color: 'green' }} icon={<CheckCircleOutlined />} onClick={() => changeStatus(record.id, 'paid')} />
                </Tooltip>
              )}

              {record.status !== 'Sent' && record.status !== 'Paid' && (
                <Tooltip title="Mark Sent">
                  <Button size="small" shape="circle" style={{ borderColor: '#1890ff', color: '#1890ff' }} icon={<SendOutlined />} onClick={() => changeStatus(record.id, 'sent')} />
                </Tooltip>
              )}

              {record.status !== 'Draft' && record.status !== 'Paid' && (
                <Tooltip title="Mark Draft">
                  <Button size="small" shape="circle" style={{ borderColor: 'orange', color: 'orange' }} icon={<FileTextOutlined />} onClick={() => changeStatus(record.id, 'draft')} />
                </Tooltip>
              )}
            </Space>
          </div>
        ),
      },
    ];

  return (
    <div className="home-container">
      <Typography.Title level={1} style={{ textAlign: 'center' }}>
        View All Invoices
      </Typography.Title>

      <Typography.Paragraph style={{ textAlign: 'center', marginBottom: 30 }}>
        Manage and track your invoices here.
      </Typography.Paragraph>

      {/* --- SEARCH BAR --- */}
      <Row justify="center" gutter={[22, 22]} style={{ marginBottom: 20 }}>
        <Col>
          <Input 
            placeholder="Search SCRINV# or Company" 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 350 }}
          />
        </Col>
        <Col>
          <RangePicker 
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            format="DD/MM/YYYY"
            style={{ width: 300 }}
          />
        </Col>
        <Col>
            <Button onClick={() => { setSearchText(''); setDateRange(null); }}>
                Clear
            </Button>
        </Col>
      </Row>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={filteredInvoices}
        columns={columns}
        bordered
      />
    </div>
  );
}