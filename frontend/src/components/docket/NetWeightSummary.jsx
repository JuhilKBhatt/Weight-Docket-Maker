// src/components/docket/NetWeightSummary.jsx

import React, { useState, useMemo } from 'react';
import { Button, Modal, Table, App, Input } from 'antd';
import { UnorderedListOutlined, DollarOutlined, SearchOutlined } from '@ant-design/icons';
import docketService from '../../services/docketService';

export default function NetWeightSummary({ items, form }) {
    const { message } = App.useApp();
    const [open, setOpen] = useState(false);

    // --- PRICES MODAL STATE ---
    const [pricesOpen, setPricesOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [priceList, setPriceList] = useState([]);
    const [currentCustomer, setCurrentCustomer] = useState('');
    
    // Search State
    const [searchText, setSearchText] = useState('');

    // Calculate Net Weights Summary (Existing Logic)
    const weightSummaryData = useMemo(() => {
        const summary = {};
        items.forEach(item => {
            if (item.gross > 0 || item.tare > 0 || item.metal) {
                const metal = item.metal ? item.metal.trim() : "Unspecified";
                if (!summary[metal]) summary[metal] = 0;
                summary[metal] += (item.net || 0);
            }
        });

        return Object.keys(summary).map(metal => ({
            key: metal,
            metal,
            weight: summary[metal]
        }));
    }, [items]);

    // --- FILTER PRICES LIST ---
    const filteredPriceList = useMemo(() => {
        // 1. Filter out items with no price (0, null, undefined)
        // This ensures the list only shows actual history
        const hasHistory = priceList.filter(item => item.price && item.price > 0);

        // 2. Apply Search Filter if exists
        if (!searchText) return hasHistory;
        
        const lowerSearch = searchText.toLowerCase();
        return hasHistory.filter(item => 
            (item.label || '').toLowerCase().includes(lowerSearch)
        );
    }, [priceList, searchText]);

    // --- HANDLE SHOW PRICES ---
    const handleShowPrices = async () => {
        if (!form) return;

        // Get the name currently typed in the form
        const name = form.getFieldValue('name');
        
        if (!name) {
            message.warning("Please enter a Customer Name to view prices.");
            return;
        }

        setCurrentCustomer(name);
        setPricesOpen(true);
        setLoading(true);
        setSearchText(''); // Reset search on open

        try {
            // Fetch metals specifically for this customer
            const data = await docketService.getUniqueMetals('', name);
            setPriceList(data);
        } catch (error) {
            console.error("Failed to load prices", error);
            message.error("Could not load price history.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* --- BOTTOM LEFT FLOATING BUTTONS --- */}
            <div style={{ 
                position: 'fixed', 
                bottom: 40, 
                left: 40, 
                zIndex: 1000,
                display: 'flex',
                gap: '12px' // Space between buttons
            }}>
                {/* 1. Net Weights Button */}
                <Button 
                    type="primary" 
                    size="large"
                    icon={<UnorderedListOutlined />} 
                    onClick={() => setOpen(true)}
                    style={{ 
                        height: '60px',
                        borderRadius: '30px',
                        padding: '0 24px',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
                        fontSize: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    Net Weights
                </Button>

                {/* 2. Customer Prices Button */}
                <Button 
                    size="large"
                    icon={<DollarOutlined />} 
                    onClick={handleShowPrices}
                    style={{ 
                        height: '60px',
                        borderRadius: '30px',
                        padding: '0 24px',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.3)',
                        fontSize: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 'bold'
                    }}
                >
                    Prices
                </Button>
            </div>

            {/* --- NET WEIGHTS MODAL --- */}
            <Modal
                title="Total Net Weights Summary"
                open={open}
                onCancel={() => setOpen(false)}
                footer={[<Button key="close" onClick={() => setOpen(false)}>Close</Button>]}
            >
                <Table 
                    dataSource={weightSummaryData}
                    columns={[
                        { title: 'Metal', dataIndex: 'metal', key: 'metal' },
                        { 
                            title: 'Net Weight (kg)', 
                            dataIndex: 'weight', 
                            key: 'weight', 
                            render: (val) => val.toFixed(2),
                            align: 'right'
                        }
                    ]}
                    pagination={false}
                    summary={(pageData) => {
                        const totalNet = pageData.reduce((sum, item) => sum + item.weight, 0);
                        return (
                            <Table.Summary.Row>
                                <Table.Summary.Cell><strong>Total</strong></Table.Summary.Cell>
                                <Table.Summary.Cell align="right">
                                    <strong>{totalNet.toFixed(2)}</strong>
                                </Table.Summary.Cell>
                            </Table.Summary.Row>
                        );
                    }}
                />
            </Modal>

            {/* --- PRICE HISTORY MODAL --- */}
            <Modal
                title={`Last Prices for: ${currentCustomer}`}
                open={pricesOpen}
                onCancel={() => setPricesOpen(false)}
                footer={[<Button key="close" onClick={() => setPricesOpen(false)}>Close</Button>]}
            >
                <Input 
                    placeholder="Search metal..." 
                    prefix={<SearchOutlined />} 
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ marginBottom: 16 }}
                    allowClear
                />
                <Table 
                    loading={loading}
                    dataSource={filteredPriceList}
                    rowKey="value"
                    pagination={false}
                    scroll={{ y: 400 }} // Added scroll for long lists
                    columns={[
                        { title: 'Metal', dataIndex: 'label', key: 'label' },
                        { 
                            title: 'Last Price Used', 
                            dataIndex: 'price', 
                            key: 'price', 
                            align: 'right',
                            render: (val) => `$${Number(val).toFixed(2)}`
                        }
                    ]}
                />
            </Modal>
        </>
    );
}