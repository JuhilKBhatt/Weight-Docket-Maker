// src/components/docket/DocketItemsTable.jsx

import React, { useState } from 'react';
import { Table, Input, InputNumber, Typography, Button, Row, Col } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function DocketItemsTable({ items, onItemChange, addRow, removeRow }) {
    
    // Local state to track how many rows to add
    const [rowsToAdd, setRowsToAdd] = useState(1);
    // State to track the currently selected row
    const [selectedRowKey, setSelectedRowKey] = useState(null);

    const columns = [
        {
            title: 'Serial #',
            key: 'serial',
            width: 80,
            align: 'center',
            render: (_, __, index) => <Text strong style={{ fontSize: '18px' }}>{index + 1}</Text>,
        },
        {
            title: 'Metal',
            dataIndex: 'metal',
            render: (_, record) => (
                <Input 
                    placeholder="Metal" 
                    value={record.metal}
                    onChange={(e) => onItemChange(record.key, 'metal', e.target.value)} 
                />
            )
        },
        {
            title: 'Notes',
            dataIndex: 'notes',
            render: (_, record) => (
                <Input 
                    placeholder="Notes" 
                    value={record.notes}
                    onChange={(e) => onItemChange(record.key, 'notes', e.target.value)} 
                />
            )
        },
        {
            title: 'Gross (kg)',
            dataIndex: 'gross',
            render: (_, record) => (
                <InputNumber 
                    // Removed min={0} to allow negative gross typing if needed, 
                    // though usually Gross is positive.
                    style={{ width: '100%' }} 
                    placeholder="0" 
                    value={record.gross}
                    onChange={(val) => onItemChange(record.key, 'gross', val)} 
                />
            )
        },
        {
            title: 'Tare (kg)',
            dataIndex: 'tare',
            render: (_, record) => (
                <InputNumber 
                    // Removed min={0}
                    style={{ width: '100%' }} 
                    placeholder="0" 
                    value={record.tare}
                    onChange={(val) => onItemChange(record.key, 'tare', val)} 
                />
            )
        },
        {
            title: 'Net Weight (kg)',
            dataIndex: 'net',
            render: (text) => {
                const val = Number(text);
                const isNegative = !isNaN(val) && val < 0;
                
                return (
                    <Input 
                        value={text} 
                        readOnly 
                        style={{ 
                            // If negative red. Else default grey.
                            backgroundColor: isNegative ? '#de5959' : '#f0f0f0', 
                            color: isNegative ? '#ffffff' : undefined,
                            cursor: 'default', 
                            fontWeight: 'bold' 
                        }} 
                    />
                );
            }
        },
        {
            title: 'Price/kg ($)',
            dataIndex: 'price',
            render: (_, record) => (
                <InputNumber 
                    step={0.01} 
                    prefix="$" 
                    style={{ width: '100%' }} 
                    placeholder="0.00" 
                    value={record.price}
                    onChange={(val) => onItemChange(record.key, 'price', val)} 
                />
            )
        },
        {
            title: 'Total ($)',
            dataIndex: 'total',
            render: (text) => (
                <Input 
                    prefix="$" 
                    value={text} 
                    readOnly 
                    className="large-total-input" 
                />
            )
        },
        {
            title: '',
            key: 'action',
            width: 50,
            render: (_, record) => (
                <Button 
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent row selection when clicking delete
                        removeRow(record.key);
                    }}
                />
            )
        }
    ];

    return (
        <div style={{ marginBottom: 30 }}>
            <Table
                // Conditionally apply class if key matches state
                rowClassName={(record) => 
                    record.key === selectedRowKey ? 'docket-table-row selected-row' : 'docket-table-row'
                }
                // Handle row click
                onRow={(record) => ({
                    onClick: () => {
                        setSelectedRowKey(record.key);
                    },
                })}
                dataSource={items}
                columns={columns}
                pagination={false}
                bordered
                size="middle"
            />
            
            {/* Control Bar for adding rows */}
            <Row gutter={8} style={{ marginTop: 8 }}>
                <Col flex="auto">
                    <Button 
                        type="dashed" 
                        onClick={() => addRow(rowsToAdd)} 
                        style={{ width: '100%' }}
                        icon={<PlusOutlined />}
                    >
                        Add Rows
                    </Button>
                </Col>
                <Col>
                     <InputNumber 
                        min={1} 
                        max={50} 
                        value={rowsToAdd} 
                        onChange={setRowsToAdd} 
                        style={{ width: 70 }}
                    />
                </Col>
            </Row>
        </div>
    );
}