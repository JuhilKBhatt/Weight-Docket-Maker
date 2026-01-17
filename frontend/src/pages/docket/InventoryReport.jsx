// src/pages/docket/InventoryReport.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Table, DatePicker, Input, Card, Typography, Row, Col, App } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getInventoryReport } from '../../services/inventoryService';
import { audFormatterFixed } from '../../scripts/utilities/AUDformatters'; 

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function InventoryReport() {
    const { message } = App.useApp(); 

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [grandTotal, setGrandTotal] = useState({ netWeight: 0, value: 0 });
    
    const [dateRange, setDateRange] = useState([
        dayjs().startOf('month'), 
        dayjs().endOf('month')
    ]);
    const [metalSearch, setMetalSearch] = useState('');
    
    // Debounce Ref
    const searchDebounce = useRef(null);

    const fetchReport = async (dates, search) => {
        // If dates are cleared, return early
        if (!dates || !dates[0] || !dates[1]) {
            return;
        }

        setLoading(true);
        try {
            const startDate = dates[0].format('YYYY-MM-DD');
            const endDate = dates[1].format('YYYY-MM-DD');
            
            const response = await getInventoryReport(startDate, endDate, search);
            
            setData(response.data);
            setGrandTotal(response.grandTotal);
        } catch (error) {
            console.error(error);
            if (error.response && error.response.data && error.response.data.detail) {
                const details = JSON.stringify(error.response.data.detail);
                message.error(`Server Validation Error: ${details}`);
            } else {
                message.error("Failed to load inventory report.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Initial Load & Date Change
    useEffect(() => {
        fetchReport(dateRange, metalSearch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange]); 

    // Handle Search with Debounce
    const handleSearchChange = (e) => {
        const val = e.target.value;
        setMetalSearch(val);

        if (searchDebounce.current) clearTimeout(searchDebounce.current);

        searchDebounce.current = setTimeout(() => {
            fetchReport(dateRange, val);
        }, 500);
    };

    const columns = [
        {
            title: 'Metal',
            dataIndex: 'metal',
            key: 'metal',
            sorter: (a, b) => a.metal.localeCompare(b.metal),
        },
        {
            title: 'Total Net Weight',
            dataIndex: 'netWeight',
            key: 'netWeight',
            align: 'right',
            render: (val) => <Text>{val.toLocaleString('en-US', { minimumFractionDigits: 2 })} kg</Text>,
            sorter: (a, b) => a.netWeight - b.netWeight,
        },
        {
            title: 'Total Value',
            dataIndex: 'value',
            key: 'value',
            align: 'right',
            render: (val) => <Text>AUD${audFormatterFixed(val)}</Text>,
            sorter: (a, b) => a.value - b.value,
        },
    ];

    return (
        <div className="home-container" style={{ alignItems: 'flex-start' }}>
            <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
                <Title level={2} style={{ textAlign: 'center', marginBottom: 30 }}>
                    Inventory Report
                </Title>

                <Card style={{ marginBottom: 20 }}>
                    <Row gutter={[16, 16]} align="middle" justify="center">
                        <Col>
                            <Text strong>Date Range: </Text>
                        </Col>
                        <Col>
                            <RangePicker 
                                allowClear={false}
                                value={dateRange}
                                onChange={(dates) => setDateRange(dates)}
                                format="DD/MM/YYYY"
                            />
                        </Col>
                        <Col>
                            <Input 
                                placeholder="Search Metal (e.g. Copper)" 
                                prefix={<SearchOutlined />} 
                                value={metalSearch}
                                onChange={handleSearchChange}
                                style={{ width: 250 }}
                            />
                        </Col>
                    </Row>
                </Card>

                <Table 
                    dataSource={data}
                    columns={columns}
                    rowKey="metal"
                    loading={loading}
                    bordered
                    pagination={false} 
                    summary={() => (
                        <Table.Summary fixed>
                            <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                                <Table.Summary.Cell index={0}>
                                    <Text strong style={{ fontSize: '16px' }}>GRAND TOTAL</Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={1} align="right">
                                    <Text strong style={{ fontSize: '16px' }}>
                                        {grandTotal.netWeight.toLocaleString('en-US', { minimumFractionDigits: 2 })} kg
                                    </Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={2} align="right">
                                    <Text strong style={{ fontSize: '16px' }}>
                                        AUD${audFormatterFixed(grandTotal.value)}
                                    </Text>
                                </Table.Summary.Cell>
                            </Table.Summary.Row>
                        </Table.Summary>
                    )}
                />
            </div>
        </div>
    );
}