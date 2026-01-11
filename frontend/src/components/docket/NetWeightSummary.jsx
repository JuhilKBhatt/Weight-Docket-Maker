// src/components/docket/NetWeightSummary.jsx

import React, { useState, useMemo } from 'react';
import { Button, Modal, Table } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';

export default function NetWeightSummary({ items }) {
    const [open, setOpen] = useState(false);

    // Calculate Net Weights Summary
    const weightSummaryData = useMemo(() => {
        const summary = {};
        items.forEach(item => {
            // Group by Metal type (or "Unspecified" if empty but has weight)
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

    return (
        <>
            {/* --- BOTTOM LEFT FLOATING BUTTON --- */}
            <Button 
                type="primary" 
                size="large"
                icon={<UnorderedListOutlined />} 
                onClick={() => setOpen(true)}
                style={{ 
                    position: 'fixed', // Follows scrolling
                    bottom: 40, 
                    left: 40, 
                    zIndex: 1000,
                    height: '60px',
                    borderRadius: '30px', // Pill shape
                    padding: '0 24px',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.3)', // Drop shadow for visibility
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}
            >
                Net Weights
            </Button>

            {/* --- NET WEIGHTS MODAL --- */}
            <Modal
                title="Total Net Weights Summary"
                open={open}
                onCancel={() => setOpen(false)}
                footer={[
                    <Button key="close" onClick={() => setOpen(false)}>Close</Button>
                ]}
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
        </>
    );
}