// frontend/src/pages/invoice/InvoiceList.jsx

import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Input, Table, Button, Typography, Popconfirm, Tag, message, DatePicker, Row, Col, Space, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined, SendOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { audFormatterFixed } from '../../scripts/utilities/AUDformatters';
import { getCurrencyLabel } from '../../scripts/utilities/invoiceConstants';

import { 
  getAllInvoices, 
  deleteInvoiceById, 
  updateInvoiceStatus,
  updatePrivateNotes
} from '../../services/invoiceListService';

const { RangePicker } = DatePicker;

export default function InvoiceList() {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  
  // Pagination State
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState(null);
  
  // Debounce Ref
  const searchDebounce = useRef(null);

  // --- FETCH DATA ---
  // Added isBackground flag to suppress spinner during auto-refresh
  const fetchInvoices = async (page = 1, pageSize = 10, search = '', dates = null, isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      
      let start = null;
      let end = null;
      if (dates && dates[0] && dates[1]) {
          start = dates[0].format('YYYY-MM-DD');
          end = dates[1].format('YYYY-MM-DD');
      }

      const response = await getAllInvoices(page, pageSize, search, start, end);
      
      setInvoices(response.data);
      setPagination({
        current: page,
        pageSize: pageSize,
        total: response.total
      });
    } catch (err) {
      console.error(err);
      if (!isBackground) message.error('Failed to load invoices');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // --- AUTO REFRESH / INITIAL LOAD ---
  useEffect(() => {
    // 1. Initial Load
    fetchInvoices(pagination.current, pagination.pageSize, searchText, dateRange);

    // 2. Setup Interval
    const intervalId = setInterval(() => {
      fetchInvoices(pagination.current, pagination.pageSize, searchText, dateRange, true); // true = background
    }, 5000); // Refresh every 5 seconds

    // 3. Cleanup on unmount or when dependencies change
    return () => clearInterval(intervalId);
  }, [pagination.current, pagination.pageSize, searchText, dateRange]); 

  // --- HANDLERS ---

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);

    if (searchDebounce.current) {
        clearTimeout(searchDebounce.current);
    }

    searchDebounce.current = setTimeout(() => {
        // Reset to page 1 on new search
        fetchInvoices(1, pagination.pageSize, value, dateRange);
    }, 500);
  };

  const onSearchManual = (value) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    fetchInvoices(1, pagination.pageSize, value, dateRange);
  };

  const handleDateChange = (dates) => {
      setDateRange(dates);
      fetchInvoices(1, pagination.pageSize, searchText, dates);
  };

  const handleTableChange = (newPagination) => {
    // Update state creates a re-render which triggers the useEffect to fetch
    setPagination(prev => ({ ...prev, current: newPagination.current, pageSize: newPagination.pageSize }));
  };

  const refreshCurrentPage = () => {
      fetchInvoices(pagination.current, pagination.pageSize, searchText, dateRange);
  };

  const handleDelete = async (id) => {
    try {
      await deleteInvoiceById(id);
      message.success('Invoice deleted');
      refreshCurrentPage();
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
      refreshCurrentPage(); // Instant update
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
      },
      {
        title: 'Invoice Date',
        dataIndex: 'invoice_date',
        key: 'invoice_date',
        render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '',
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
        align: 'right',
        render: (val, record) => {
          return `${getCurrencyLabel(record.currency)}${audFormatterFixed(val)}`;
        },
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        align: 'center',
        render: (status) => {
          let color = 'default';
          if (status === 'Paid') color = 'green';
          else if (status === 'Unpaid' || status === 'Overdue') color = 'red';
          else if (status === 'Sent') color = 'blue';
          else if (status === 'Draft') color = 'orange';
          else if (status === 'Downloaded') color = 'geekblue';

          return <Tag color={color}>{status || 'Unknown'}</Tag>;
        },
      },
      {
        title: 'Private Notes',
        dataIndex: 'private_notes',
        key: 'private_notes',
        width: 250,
        render: (text, record) => (
          <Input.TextArea 
            rows={2}
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

      <Row justify="center" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col>
          <Input.Search 
            placeholder="Search SCRINV# or Company" 
            value={searchText}
            onChange={handleSearchChange}
            onSearch={onSearchManual}
            allowClear
            style={{ width: 350 }}
            enterButton
          />
        </Col>
        <Col>
          <RangePicker 
            value={dateRange}
            onChange={handleDateChange}
            format="DD/MM/YYYY"
            style={{ width: 300 }}
          />
        </Col>
        <Col>
            <Button onClick={() => { 
                setSearchText(''); 
                setDateRange(null); 
                // Manual reset
                setPagination(prev => ({...prev, current: 1}));
            }}>
                Reset Filters
            </Button>
        </Col>
      </Row>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={invoices}
        columns={columns}
        bordered
        pagination={{
            ...pagination,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100']
        }}
        onChange={handleTableChange}
      />
    </div>
  );
}