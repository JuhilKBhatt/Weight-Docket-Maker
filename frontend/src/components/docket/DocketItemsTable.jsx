// ./frontend/src/components/docket/DocketItemsTable.jsx

import React, { useState, useRef } from 'react';
import { Table, Input, InputNumber, Typography, Button, Row, Col, Select, AutoComplete, Form } from 'antd'; 
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { audFormatter, audParser, audFormatterFixed } from '../../scripts/utilities/AUDformatters';
import { UNIT_OPTIONS as DEFAULT_UNITS, CURRENCY_OPTIONS as DEFAULT_CURRENCIES } from '../../scripts/utilities/invoiceConstants';
import docketService from '../../services/docketService';

const { Text } = Typography;
const { Option } = Select;

// --- Helper Component for the Metal Cell ---
const MetalCell = ({ value, onChange, onPriceUpdate }) => {
    const [options, setOptions] = useState([]);
    const timeoutRef = useRef(null);
    
    // Access the parent form to get the current Customer Name
    const form = Form.useFormInstance();

    const handleSearch = (val) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        if (!val) {
            setOptions([]);
            return;
        }

        // Get the customer name so the backend can find specific pricing history
        const customerName = form.getFieldValue('name') || '';

        timeoutRef.current = setTimeout(async () => {
            try {
                const data = await docketService.getUniqueMetals(val, customerName);
                // Ensure data is mapped correctly for AutoComplete options
                setOptions(data);
            } catch (err) {
                console.error("Failed to fetch metals", err);
            }
        }, 200); // 200ms debounce
    };

    const handleSelect = (val, option) => {
        onChange(val);
        // If the backend returned a price > 0, update it.
        // If 0 or null, set it to null (blank) so it doesn't default to 0.00
        if (option.price && option.price > 0) {
            onPriceUpdate(option.price);
        } else {
            onPriceUpdate(null);
        }
    };

    // New: Handle Blur to autofill price when typing manually (not selecting from dropdown)
    const handleBlur = async () => {
        // If empty, do nothing
        if (!value || !value.trim()) return;

        const customerName = form.getFieldValue('name') || '';

        try {
            // Fetch exact matches or close matches for the typed text
            const data = await docketService.getUniqueMetals(value, customerName);
            
            // Find a match (case-insensitive) to the typed text
            const match = data.find(item => item.value.toLowerCase() === value.trim().toLowerCase());

            if (match) {
                // Apply the same logic as handleSelect
                if (match.price && match.price > 0) {
                    onPriceUpdate(match.price);
                } else {
                    onPriceUpdate(null);
                }
            }
        } catch (err) {
            console.error("Failed to autofill price on blur", err);
        }
    };

    return (
        <AutoComplete
            value={value}
            options={options}
            onSearch={handleSearch}
            onSelect={handleSelect}
            onBlur={handleBlur}
            onChange={onChange}
            placeholder="Metal"
            style={{ width: '100%' }}
            placement="topLeft"
        >
            <Input />
        </AutoComplete>
    );
};

export default function DocketItemsTable({ 
    items, onItemChange, addRow, removeRow, 
    currency = 'AUD', setCurrency,
    currencyOptions = [], unitOptions = [] 
}) {
    
    const [rowsToAdd, setRowsToAdd] = useState(1);
    const [selectedRowKey, setSelectedRowKey] = useState(null);

    const activeCurrencies = currencyOptions.length > 0 ? currencyOptions : DEFAULT_CURRENCIES;
    const activeUnits = unitOptions.length > 0 ? unitOptions : DEFAULT_UNITS;

    // Helper: Get symbol (e.g. "AUD$")
    const currentSymbolLabel = activeCurrencies.find(c => c.code === currency)?.label || `${currency}$`;

    const weightFormatter = (value) => `${value}`.replaceAll(/\B(?=(\d{3})+(?!\d))/g, ',');
    const weightParser = (value) => value.replaceAll(/,/g, '');

    const renderUnitSelector = (record) => (
      <Select
        value={record.unit || 'kg'}
        style={{ width: 80, margin: '-5px 0' }} // Compact width
        popupMatchSelectWidth={false} // Allow dropdown to be wider than the button
        showSearch
        optionFilterProp="children"
        onChange={(val) => onItemChange(record.key, 'unit', val)}
      >
        {activeUnits.map(unit => (
          <Option key={unit.value} value={unit.value}>{unit.label}</Option>
        ))}
      </Select>
    );

    const renderCurrencySelector = () => (
      <Select
        value={currency} 
        style={{ width: 100, margin: '-5px 0' }} // Compact width
        popupMatchSelectWidth={false} // Allow dropdown to be wider than the button
        showSearch
        optionFilterProp="children"
        onChange={(val) => setCurrency(val)}
      >
        {activeCurrencies.map(curr => (
          <Option key={curr.code} value={curr.code}>{curr.label}</Option>
        ))}
      </Select>
    );

    const columns = [
        { 
            title: '#', 
            key: 'serial', 
            width: 10,
            align: 'center', 
            render: (_, __, index) => <Text strong style={{ fontSize: '18px' }}>{index + 1}</Text> 
        },
        { 
            title: 'Metal', 
            dataIndex: 'metal', 
            width: '12%', // Increased width for better visibility
            render: (_, record) => (
                <MetalCell 
                    value={record.metal}
                    onChange={(val) => onItemChange(record.key, 'metal', val)}
                    onPriceUpdate={(newPrice) => onItemChange(record.key, 'price', newPrice)}
                />
            )
        }, 
        { 
            title: 'Notes', 
            dataIndex: 'notes', 
            width: '12%', // Increased width
            render: (_, record) => (
                <Input 
                    value={record.notes} 
                    onChange={(e) => onItemChange(record.key, 'notes', e.target.value)} 
                />
            ) 
        },
        { 
            title: 'Gross', 
            dataIndex: 'gross', 
            width: 80, // Compact
            render: (_, record) => (
                <InputNumber 
                    style={{ width: '100%' }} 
                    value={record.gross} 
                    onChange={(val) => onItemChange(record.key, 'gross', val)} 
                    formatter={weightFormatter} 
                    parser={weightParser} 
                />
            ) 
        },
        { 
            title: 'Tare', 
            dataIndex: 'tare', 
            width: 80, // Compact
            render: (_, record) => (
                <InputNumber 
                    style={{ width: '100%' }} 
                    value={record.tare} 
                    onChange={(val) => onItemChange(record.key, 'tare', val)} 
                    formatter={weightFormatter} 
                    parser={weightParser} 
                />
            ) 
        },
        {
            title: 'Net Weight',
            dataIndex: 'net',
            width: 100, // Compact
            render: (text, record) => {
                const val = Number(text);
                const isNegative = !isNaN(val) && val < 0;
                return (
                    <Input 
                        value={!isNaN(val) ? val.toLocaleString('en-US') : text} 
                        addonAfter={renderUnitSelector(record)}
                        readOnly 
                        style={{ backgroundColor: isNegative ? '#ffcccc' : '#f0f0f0', color: isNegative ? '#cf1322' : undefined, textAlign: 'right', fontWeight: 'bold' }} 
                    />
                );
            }
        },
        {
            title: 'Price / unit',
            dataIndex: 'price',
            width: 100, // Compact
            render: (_, record) => (
                <InputNumber 
                    addonBefore={renderCurrencySelector()}
                    style={{ width: '100%' }} 
                    value={record.price}
                    onChange={(val) => onItemChange(record.key, 'price', val)} 
                    formatter={audFormatter} parser={audParser}
                />
            )
        },
        {
            title: 'Total',
            dataIndex: 'total',
            width: 125, // Compact
            render: (text) => (
                <Input prefix={currentSymbolLabel} value={audFormatterFixed(text)} readOnly style={{ textAlign: 'right' }} />
            )
        },
        {
            key: 'action',
            width: 1,
            render: (_, record) => <Button type="text" style={{ width: 10, marginRight:-10}} danger icon={<DeleteOutlined />} onClick={() => removeRow(record.key)} />
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
                <Col flex="auto"><Button type="dashed" onClick={() => addRow(rowsToAdd)} style={{ width: '100%' }} icon={<PlusOutlined />}>Add Rows</Button></Col>
                <Col><InputNumber min={1} max={50} value={rowsToAdd} onChange={setRowsToAdd} style={{ width: 80 }} /></Col>
            </Row>
        </div>
    );
}