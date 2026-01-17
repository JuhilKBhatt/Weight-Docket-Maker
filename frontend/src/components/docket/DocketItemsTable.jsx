// ./frontend/src/components/docket/DocketItemsTable.jsx

import React, { useState, useRef } from 'react';
import { Table, Input, InputNumber, Typography, Button, Row, Col, AutoComplete, Form } from 'antd'; 
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import docketService from '../../services/docketService'; 
import { audFormatter, audParser, audFormatterFixed } from '../../scripts/utilities/AUDformatters';

const { Text } = Typography;

// --- Helper Component for the Metal Cell ---
const MetalCell = ({ value, onChange, onPriceUpdate }) => {
    const [options, setOptions] = useState([]);
    const timeoutRef = useRef(null);
    
    const form = Form.useFormInstance();

    const handleSearch = (val) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        if (!val) {
            setOptions([]);
            return;
        }

        const customerName = form.getFieldValue('name') || '';

        timeoutRef.current = setTimeout(async () => {
            try {
                const data = await docketService.getUniqueMetals(val, customerName);
                setOptions(data);
            } catch (err) {
                console.error("Failed to fetch metals", err);
            }
        }, 300);
    };

    const handleSelect = (val, option) => {
        onChange(val);
        if (option.price !== undefined && option.price !== null) {
            onPriceUpdate(option.price);
        }
    };

    return (
        <AutoComplete
            value={value}
            options={options}
            onSearch={handleSearch}
            onSelect={handleSelect}
            onChange={onChange}
            placeholder="Metal"
            style={{ width: '100%' }}
        />
    );
};

export default function DocketItemsTable({ items, onItemChange, addRow, removeRow }) {
    
    const [rowsToAdd, setRowsToAdd] = useState(1);
    const [selectedRowKey, setSelectedRowKey] = useState(null);

    // Helper for weight formatting (10,000)
    const weightFormatter = (value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const weightParser = (value) => value.replace(/,/g, '');

    const columns = [
        {
            title: 'Serial #',
            key: 'serial',
            width: '2%', 
            align: 'center',
            render: (_, __, index) => <Text strong style={{ fontSize: '18px' }}>{index + 1}</Text>,
        },
        {
            title: 'Metal',
            dataIndex: 'metal',
            width: '15%',
            render: (_, record) => (
                <MetalCell 
                    value={record.metal}
                    onChange={(val) => onItemChange(record.key, 'metal', val)}
                    onPriceUpdate={(price) => onItemChange(record.key, 'price', price)}
                />
            )
        },
        {
            title: 'Notes',
            dataIndex: 'notes',
            width: '12%', 
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
            width: 130, 
            render: (_, record) => (
                <InputNumber 
                    style={{ width: '100%' }} 
                    placeholder="0" 
                    value={record.gross}
                    onChange={(val) => onItemChange(record.key, 'gross', val)}
                    // CHANGED: Added formatter/parser for comma separation
                    formatter={weightFormatter}
                    parser={weightParser}
                />
            )
        },
        {
            title: 'Tare (kg)',
            dataIndex: 'tare',
            width: 130,
            render: (_, record) => (
                <InputNumber 
                    style={{ width: '100%' }} 
                    placeholder="0" 
                    value={record.tare}
                    onChange={(val) => onItemChange(record.key, 'tare', val)}
                    // CHANGED: Added formatter/parser for comma separation
                    formatter={weightFormatter}
                    parser={weightParser}
                />
            )
        },
        {
            title: 'Net Weight (kg)',
            dataIndex: 'net',
            width: 120,
            render: (text) => {
                const val = Number(text);
                const isNegative = !isNaN(val) && val < 0;
                // CHANGED: Format number with commas (e.g. 10,000)
                const formattedVal = !isNaN(val) ? val.toLocaleString('en-US') : text;
                
                return (
                    <Input 
                        value={formattedVal} 
                        readOnly 
                        style={{ 
                            backgroundColor: isNegative ? '#ffcccc' : '#f0f0f0', 
                            color: isNegative ? '#cf1322' : undefined,
                            cursor: 'default', 
                            fontWeight: 'bold',
                            textAlign: 'right' // Right align numbers usually looks better
                        }} 
                    />
                );
            }
        },
        {
            title: 'Price/kg ($)',
            dataIndex: 'price',
            width: 100,
            render: (_, record) => (
                <InputNumber 
                    step={0.01} 
                    prefix="$" 
                    style={{ width: '100%' }} 
                    placeholder="0.00" 
                    value={record.price === 0 ? null : record.price}
                    onChange={(val) => onItemChange(record.key, 'price', val)} 
                    // CHANGED: Use shared currency formatters
                    formatter={audFormatter}
                    parser={audParser}
                />
            )
        },
        {
            title: 'Total ($)',
            dataIndex: 'total',
            width: 140,
            render: (text) => (
                <Input 
                    prefix="$" 
                    // CHANGED: Format total to currency string (e.g. 100,000.00)
                    value={audFormatterFixed(text)} 
                    readOnly 
                    className="large-total-input" 
                    style={{ textAlign: 'right' }}
                />
            )
        },
        {
            title: '',
            key: 'action',
            width: 50,
            align: 'center',
            render: (_, record) => (
                <Button 
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={(e) => {
                        e.stopPropagation(); 
                        removeRow(record.key);
                    }}
                />
            )
        }
    ];

    return (
        <div style={{ marginBottom: 30 }}>
            <Table
                rowClassName={(record) => 
                    record.key === selectedRowKey ? 'docket-table-row selected-row' : 'docket-table-row'
                }
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
                scroll={{ x: 'max-content' }} 
            />
            
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