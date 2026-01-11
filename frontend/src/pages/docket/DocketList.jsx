// src/pages/docket/DocketList.jsx

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Input, Table, Button, Typography, Popconfirm, Tag, message, DatePicker, Row, Col, Space, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { audFormatterFixed } from '../../scripts/utilities/AUDformatters';

import { 
  getAllDockets, 
  deleteDocketById
} from '../../services/docketListService';

const { RangePicker } = DatePicker;

export default function DocketList() {
  const [loading, setLoading] = useState(false);
  const [dockets, setDockets] = useState([]);
  
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState(null);

  // Load Dockets
  const fetchDockets = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const data = await getAllDockets();
      
      const sortedData = data.sort((a, b) => {
        const dateA = a.docket_date ? dayjs(a.docket_date).valueOf() : 0;
        const dateB = b.docket_date ? dayjs(b.docket_date).valueOf() : 0;
        if (dateA !== dateB) return dateB - dateA; // Newest date first
        return b.id - a.id; // Newest ID first
      });

      setDockets(sortedData);
    } catch (err) {
      console.error(err);
      if (!isBackground) message.error('Failed to load dockets');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDockets();
    const intervalId = setInterval(() => {
      fetchDockets(true);
    }, 5000); // Polling every 5s
    return () => clearInterval(intervalId);
  }, []);

  const getFilteredDockets = () => {
    return dockets.filter((docket) => {
      const text = searchText.toLowerCase();
      const matchText = 
        (docket.scrdkt_number || '').toLowerCase().includes(text) || 
        (docket.customer_name || '').toLowerCase().includes(text);

      let matchDate = true;
      if (dateRange && dateRange[0] && dateRange[1]) {
        if (!docket.docket_date) {
          matchDate = false;
        } else {
          const dktDate = dayjs(docket.docket_date);
          const start = dateRange[0].startOf('day');
          const end = dateRange[1].endOf('day');
          matchDate = (dktDate.isSame(start) || dktDate.isAfter(start)) && 
                      (dktDate.isSame(end) || dktDate.isBefore(end));
        }
      }
      return matchText && matchDate;
    });
  };

  const filteredDockets = getFilteredDockets();

  const handleDelete = async (id) => {
    try {
      await deleteDocketById(id);
      message.success('Docket deleted');
      fetchDockets();
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
        sorter: (a, b) => a.scrdkt_number.localeCompare(b.scrdkt_number),
        width: 180,
      },
      {
        title: 'Date',
        dataIndex: 'docket_date',
        key: 'docket_date',
        render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '',
        sorter: (a, b) => dayjs(a.docket_date).unix() - dayjs(b.docket_date).unix(),
        width: 120,
      },
      {
        title: 'Type',
        dataIndex: 'docket_type',
        key: 'docket_type',
        render: (type) => <Tag color={type === 'Customer' ? 'blue' : 'purple'}>{type}</Tag>,
        filters: [
            { text: 'Customer', value: 'Customer' },
            { text: 'Weight', value: 'Weight' },
        ],
        onFilter: (value, record) => record.docket_type === value,
        width: 100,
      },
      {
        title: 'Customer / Company',
        dataIndex: 'customer_name',
        key: 'customer_name',
        sorter: (a, b) => (a.customer_name || '').localeCompare(b.customer_name || ''),
      },
      {
        title: 'Total Value',
        dataIndex: 'total_amount',
        key: 'total_amount',
        render: (val) => `AUD$${audFormatterFixed(val)}`,
        sorter: (a, b) => a.total_amount - b.total_amount,
        width: 150,
        align: 'right',
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status) => {
          let color = 'default';
          if (status === 'Printed') color = 'green';
          else if (status === 'Draft') color = 'orange';
          else if (status === 'Saved') color = 'blue';

          return <Tag color={color}>{status || 'Unknown'}</Tag>;
        },
        width: 100,
      },
      {
        title: 'Actions',
        key: 'actions',
        align: 'center',
        width: 120,
        render: (_, record) => (
          <Space>
              <Tooltip title="Edit Docket">
                {/* Ensure you have a route set up for /edit-docket/:id */}
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
          <Input 
            placeholder="Search Docket# or Name" 
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
        dataSource={filteredDockets}
        columns={columns}
        bordered
      />
    </div>
  );
}