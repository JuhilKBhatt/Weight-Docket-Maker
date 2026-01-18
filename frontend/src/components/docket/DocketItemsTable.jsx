// ./frontend/src/components/docket/DocketItemsTable.jsx

import React, { useState } from 'react';
import { Table, Input, InputNumber, Typography, Button, Row, Col, Select } from 'antd'; 
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { audFormatter, audParser, audFormatterFixed } from '../../scripts/utilities/AUDformatters';
import { UNIT_OPTIONS as DEFAULT_UNITS, CURRENCY_OPTIONS as DEFAULT_CURRENCIES } from '../../scripts/utilities/invoiceConstants';

const { Text } = Typography;
const { Option } = Select;

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

    const weightFormatter = (value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const weightParser = (value) => value.replace(/,/g, '');

    const renderUnitSelector = (record) => (
      <Select
        value={record.unit || 'kg'}
        style={{ width: 70, margin: '-5px 0' }}
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
        style={{ width: 98, margin: '-5px 0' }}
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
        { title: 'Serial #', key: 'serial', width: '2%', align: 'center', render: (_, __, index) => <Text strong style={{ fontSize: '18px' }}>{index + 1}</Text> },
        { title: 'Metal', dataIndex: 'metal', width: '15%', render: (_, record) => <Input value={record.metal} onChange={(val) => onItemChange(record.key, 'metal', val.target.value)} /> }, // Simplified Metal for brevity, use MetalCell in real code
        { title: 'Notes', dataIndex: 'notes', width: '12%', render: (_, record) => <Input value={record.notes} onChange={(e) => onItemChange(record.key, 'notes', e.target.value)} /> },
        { title: 'Gross', dataIndex: 'gross', width: 130, render: (_, record) => <InputNumber style={{ width: '100%' }} value={record.gross} onChange={(val) => onItemChange(record.key, 'gross', val)} formatter={weightFormatter} parser={weightParser} /> },
        { title: 'Tare', dataIndex: 'tare', width: 130, render: (_, record) => <InputNumber style={{ width: '100%' }} value={record.tare} onChange={(val) => onItemChange(record.key, 'tare', val)} formatter={weightFormatter} parser={weightParser} /> },
        {
            title: 'Net Weight',
            dataIndex: 'net',
            width: 150,
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
            width: 140,
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
            width: 140,
            render: (text) => (
                <Input prefix={currentSymbolLabel} value={audFormatterFixed(text)} readOnly style={{ textAlign: 'right' }} />
            )
        },
        {
            key: 'action',
            width: 50,
            render: (_, record) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeRow(record.key)} />
        }
    ];

    return (
        <div style={{ marginBottom: 30 }}>
            <Table
                dataSource={items}
                columns={columns}
                pagination={false}
                bordered
                size="middle"
                scroll={{ x: 'max-content' }} 
            />
            <Row gutter={8} style={{ marginTop: 8 }}>
                <Col flex="auto"><Button type="dashed" onClick={() => addRow(rowsToAdd)} style={{ width: '100%' }} icon={<PlusOutlined />}>Add Rows</Button></Col>
                <Col><InputNumber min={1} max={50} value={rowsToAdd} onChange={setRowsToAdd} style={{ width: 70 }} /></Col>
            </Row>
        </div>
    );
}