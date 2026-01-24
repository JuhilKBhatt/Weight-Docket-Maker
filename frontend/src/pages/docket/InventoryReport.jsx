// src/pages/docket/InventoryReport.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Table, DatePicker, Input, Card, Typography, Row, Col, App } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getInventoryReport } from '../../services/inventoryService';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function InventoryReport() {
    const { message } = App.useApp(); 

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [grandTotals, setGrandTotals] = useState({ weights: {}, values: {} });
    
    const [dateRange, setDateRange] = useState([
        dayjs().startOf('month'), 
        dayjs().endOf('month')
    ]);
    const [metalSearch, setMetalSearch] = useState('');
    
    // Fetch Report Data
    const fetchReport = async (dates, search, isBackground = false) => {
        if (!dates || !dates[0] || !dates[1]) return;

        if (!isBackground) setLoading(true);
        
        try {
            const startDate = dates[0].format('YYYY-MM-DD');
            const endDate = dates[1].format('YYYY-MM-DD');
            
            const response = await getInventoryReport(startDate, endDate, search);
            
            setData(response.data);
            setGrandTotals(response.grandTotals);
        } catch (error) {
            console.error(error);
            if (!isBackground) {
                message.error("Failed to load inventory report.");
            }
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    // Initial Load & Polling
    useEffect(() => {
        fetchReport(dateRange, metalSearch);
        const intervalId = setInterval(() => {
            fetchReport(dateRange, metalSearch, true); 
        }, 5000);
        return () => clearInterval(intervalId);
    }, [dateRange, metalSearch]); 

    // Handle Search
    const handleSearchChange = (e) => {
        setMetalSearch(e.target.value);
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
            key: 'netWeight',
            align: 'right',
            render: (_, record) => (
                <Text>
                    {record.netWeight.toLocaleString('en-US', { minimumFractionDigits: 2 })} {record.unit}
                </Text>
            ),
            sorter: (a, b) => a.netWeight - b.netWeight,
        },
        {
            title: 'Total Value',
            key: 'value',
            align: 'right',
            render: (_, record) => (
                <Text>
                    {record.currency}{record.currencySymbol} {record.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
            ),
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
                                placeholder="Search Metal..." 
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
                    rowKey={(record) => `${record.metal}-${record.unit}-${record.currency}`}
                    loading={loading}
                    bordered
                    pagination={false} 
                    summary={() => (
                        <Table.Summary fixed>
                            <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                                <Table.Summary.Cell index={0}>
                                    <Text strong style={{ fontSize: '20' }}>GRAND TOTALS</Text>
                                </Table.Summary.Cell>
                                
                                {/* Weights Summary */}
                                <Table.Summary.Cell index={1} align="right">
                                    {Object.entries(grandTotals.weights).map(([unit, weight]) => (
                                        <div key={unit}>
                                            <Text strong style={{ fontSize: '22px' }}>
                                                {weight.toLocaleString('en-US', { minimumFractionDigits: 2 })} {unit}
                                            </Text>
                                        </div>
                                    ))}
                                </Table.Summary.Cell>
                                
                                {/* Values Summary */}
                                <Table.Summary.Cell index={2} align="right">
                                    {Object.entries(grandTotals.values).map(([curr, { amount, symbol }]) => (
                                        <div key={curr}>
                                            <Text strong style={{ fontSize: '22px' }}>
                                                {curr}{symbol} {amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </Text>
                                        </div>
                                    ))}
                                </Table.Summary.Cell>
                            </Table.Summary.Row>
                        </Table.Summary>
                    )}
                />
            </div>
        </div>
    );
}