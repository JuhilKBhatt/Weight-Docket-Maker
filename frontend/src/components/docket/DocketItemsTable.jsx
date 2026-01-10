// ./frontend/src/components/docket/DocketItemsTable.jsx

import React from 'react';
import { Table, Input, InputNumber, Typography } from 'antd';

const { Text } = Typography;

export default function DocketItemsTable({ items, onItemChange }) {

    // Columns configuration moved here to keep the parent clean
    const columns = [
        {
            title: 'Serial #',
            dataIndex: 'key',
            width: 80,
            align: 'center',
            render: (text) => <Text strong style={{ fontSize: '18px' }}>{text + 1}</Text>,
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
                    min={0} 
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
                    min={0} 
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
            render: (text) => (
                <Input 
                    value={text} 
                    readOnly 
                    style={{ backgroundColor: '#f0f0f0', cursor: 'default', fontWeight: 'bold' }} 
                />
            )
        },
        {
            title: 'Price/kg ($)',
            dataIndex: 'price',
            render: (_, record) => (
                <InputNumber 
                    min={0} 
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
    ];

    return (
        <Table
            rowClassName={() => 'docket-table-row'}
            dataSource={items}
            columns={columns}
            pagination={false}
            bordered
            size="middle"
            style={{ marginBottom: 30 }}
        />
    );
}