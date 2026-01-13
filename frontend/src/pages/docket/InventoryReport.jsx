// src/pages/docket/InventoryReport.jsx

import React, { useState, useEffect } from 'react';
import { Table, DatePicker, Input, Card, Typography, Row, Col, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getInventoryReport } from '../../services/inventoryService';
import { audFormatterFixed } from '../../scripts/utilities/AUDformatters'; 

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function InventoryReport() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [grandTotal, setGrandTotal] = useState({ netWeight: 0, value: 0 });
    
    // Default filters: Current Month
    const [dateRange, setDateRange] = useState([
        dayjs().startOf('month'), 
        dayjs().endOf('month')
    ]);
    const [metalSearch, setMetalSearch] = useState('');

    const fetchReport = async () => {
        // If dates are cleared, return early or handle as needed
        if (!dateRange || !dateRange[0] || !dateRange[1]) {
            return;
        }

        setLoading(true);
        try {
            const startDate = dateRange[0].format('YYYY-MM-DD');
            const endDate = dateRange[1].format('YYYY-MM-DD');
            
            const response = await getInventoryReport(startDate, endDate, metalSearch);
            
            setData(response.data);
            setGrandTotal(response.grandTotal);
        } catch (error) {
            console.error(error);
            message.error("Failed to load inventory report.");
        } finally {
            setLoading(false);
        }
    };

    // Trigger fetch automatically on mount AND when dateRange or metalSearch changes
    useEffect(() => {
        fetchReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange, metalSearch]);

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
                                onChange={(e) => setMetalSearch(e.target.value)}
                                style={{ width: 250 }}
                            />
                        </Col>
                        {/* Filter Button removed; logic moved to useEffect */}
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