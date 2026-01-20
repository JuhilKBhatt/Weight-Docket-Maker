// src/pages/docket/DocketList.jsx

import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Input, Table, Button, Typography, Popconfirm, Tag, message, Row, Col, Space, Tooltip, App } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { audFormatterFixed } from '../../scripts/utilities/AUDformatters';

import { 
  getAllDockets, 
  deleteDocketById
} from '../../services/docketListService';

export default function DocketList() {
  const { message } = App.useApp(); 
  const [loading, setLoading] = useState(false);
  const [dockets, setDockets] = useState([]);
  
  // Pagination State
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const [searchText, setSearchText] = useState('');
  const searchDebounce = useRef(null);

  // --- FETCH DOCKETS ---
  const fetchDockets = async (page = 1, pageSize = 10, search = '', isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      
      const response = await getAllDockets(page, pageSize, search);
      
      setDockets(response.data);
      setPagination({
        current: page,
        pageSize: pageSize,
        total: response.total
      });
    } catch (err) {
      console.error(err);
      if (!isBackground) message.error('Failed to load dockets');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // --- POLLING / EFFECT ---
  useEffect(() => {
    // 1. Initial
    fetchDockets(pagination.current, pagination.pageSize, searchText);

    // 2. Poll every 5s
    const intervalId = setInterval(() => {
        fetchDockets(pagination.current, pagination.pageSize, searchText, true); // True = Background
    }, 5000);

    return () => clearInterval(intervalId);
  }, [pagination.current, pagination.pageSize, searchText]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);

    if (searchDebounce.current) {
        clearTimeout(searchDebounce.current);
    }

    searchDebounce.current = setTimeout(() => {
        // Reset page on search
        setPagination(prev => ({...prev, current: 1}));
    }, 500);
  };

  const onSearchManual = (value) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    setPagination(prev => ({...prev, current: 1}));
  };

  const handleTableChange = (newPagination) => {
    setPagination(prev => ({ ...prev, current: newPagination.current, pageSize: newPagination.pageSize }));
  };

  const handleDelete = async (id) => {
    try {
      await deleteDocketById(id);
      message.success('Docket deleted');
      // Refresh immediately
      fetchDockets(pagination.current, pagination.pageSize, searchText);
    } catch (err) {
      console.error(err);
      message.error('Could not delete docket');
    }
  };

  const columns = [
      {
        title: 'DOCKET ID#',
        dataIndex: 'scrdkt_number',
        key: 'scrdkt_number',
        width: 150,
      },
      {
        title: 'Date',
        dataIndex: 'docket_date',
        key: 'docket_date',
        render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '',
        width: 120,
      },
      {
        title: 'Type',
        dataIndex: 'docket_type',
        key: 'docket_type',
        render: (type) => <Tag color={type === 'Customer' ? 'blue' : 'purple'}>{type}</Tag>,
        width: 100,
      },
      {
        title: 'Customer / Company',
        dataIndex: 'customer_name',
        key: 'customer_name',
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (status) => {
            let color = 'default';
            if (status === 'Saved') color = 'green';
            else if (status === 'Draft') color = 'orange';
            else if (status === 'Printed') color = 'cyan';
            else if (status === 'Downloaded') color = 'blue';
            else if (status === 'Imported Log') color = 'purple';
            
            return (
                <Tag color={color} key={status}>
                    {status ? status.toUpperCase() : 'UNKNOWN'}
                </Tag>
            );
        }
      },
      {
        title: 'Total Value',
        dataIndex: 'total_amount',
        key: 'total_amount',
        render: (val) => `AUD$${audFormatterFixed(val)}`,
        width: 150,
        align: 'right',
      },
      {
        title: 'Actions',
        key: 'actions',
        align: 'center',
        width: 120,
        render: (_, record) => (
          <Space>
              <Tooltip title="Edit Docket">
                <Link to={`/edit-docket/${record.id}`}>
                  <Button type="primary" shape="circle" icon={<EditOutlined />} />
                </Link>
              </Tooltip>

              <Tooltip title="Delete Docket">
                <Popconfirm
                  title="Delete this docket?"
                  okText="Yes"
                  cancelText="No"
                  onConfirm={() => handleDelete(record.id)}
                >
                  <Button danger shape="circle" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Tooltip>
          </Space>
        ),
      },
    ];

  return (
    <div className="home-container">
      <Typography.Title level={1} style={{ textAlign: 'center' }}>
        View All Dockets
      </Typography.Title>

      <Row justify="center" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col>
          <Input.Search
            placeholder="Search Docket# or Name" 
            value={searchText}
            onChange={handleSearchChange} 
            onSearch={onSearchManual}     
            allowClear
            style={{ width: 350 }}
            enterButton
          />
        </Col>
        <Col>
            <Button onClick={() => { 
                setSearchText(''); 
                if(searchDebounce.current) clearTimeout(searchDebounce.current);
                setPagination(prev => ({...prev, current: 1}));
            }}>
                Reset Filters
            </Button>
        </Col>
      </Row>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={dockets}
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