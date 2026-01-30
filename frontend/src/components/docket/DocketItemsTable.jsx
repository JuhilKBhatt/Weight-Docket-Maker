// ./frontend/src/components/docket/DocketItemsTable.jsx

import React, { useState, useRef, useMemo } from 'react';
import { Table, Input, InputNumber, Typography, Button, Row, Col, Select, AutoComplete, Form } from 'antd'; 
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { audFormatter, audParser, audFormatterFixed, isValidInput } from '../../scripts/utilities/AUDFormatters';
import docketService from '../../services/docketService';

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
        }, 200); 
    };

    const handleSelect = (val, option) => {
        onChange(val);
        if (option.price && option.price > 0) {
            onPriceUpdate(option.price);
        } else {
            onPriceUpdate(null);
        }
    };

    const handleBlur = async () => {
        if (!value || !value.trim()) return;
        const customerName = form.getFieldValue('name') || '';
        try {
            const data = await docketService.getUniqueMetals(value, customerName);
            const match = data.find(item => item.value.toLowerCase() === value.trim().toLowerCase());
            if (match) {
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
            maxLength={99} 
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

    // Memoize options
    const activeCurrencies = useMemo(() => 
        currencyOptions.length > 0 ? currencyOptions : [{ code: 'AUD', label: 'AUD$', symbol: '$' }],
    [currencyOptions]);

    const activeUnits = useMemo(() => 
        unitOptions.length > 0 ? unitOptions : [{ value: 'kg', label: 'kg' }],
    [unitOptions]);

    const currentSymbolLabel = useMemo(() => 
        activeCurrencies.find(c => c.code === currency)?.label || `${currency}$`,
    [activeCurrencies, currency]);

    const onInputChange = (key, field, e, maxDecimals = 2) => {
        const rawValue = e.target.value;
        const parsedValue = audParser(rawValue);
        
        if (isValidInput(parsedValue, maxDecimals)) {
            onItemChange(key, field, parsedValue);
        }
    };

    // Wrap columns in useMemo to prevent unnecessary re-renders
    const columns = useMemo(() => [
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
            width: '12%', 
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
            width: '12%', 
            render: (_, record) => (
                <Input 
                    value={record.notes} 
                    onChange={(e) => onItemChange(record.key, 'notes', e.target.value)}
                    maxLength={254}
                />
            ) 
        },
        { 
            title: 'Gross', 
            dataIndex: 'gross', 
            width: 80, 
            render: (_, record) => (
                <Input 
                    style={{ width: '100%' }} 
                    value={audFormatter(record.gross)} 
                    onChange={(e) => onInputChange(record.key, 'gross', e, 3)} 
                />
            ) 
        },
        { 
            title: 'Tare', 
            dataIndex: 'tare', 
            width: 80, 
            render: (_, record) => (
                <Input 
                    style={{ width: '100%' }} 
                    value={audFormatter(record.tare)} 
                    onChange={(e) => onInputChange(record.key, 'tare', e, 3)} 
                />
            ) 
        },
        {
            title: 'Net Weight',
            dataIndex: 'net',
            width: 100, 
            render: (text, record) => {
                const val = Number(text);
                const isNegative = !isNaN(val) && val < 0;
                const displayVal = !isNaN(val) 
                    ? val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 }) 
                    : text;
                return (
                    <Input 
                        value={displayVal} 
                        className={isNegative ? 'negative-net-weight' : ''}
                        addonAfter={
                            <Select
                                value={record.unit || 'kg'}
                                style={{ width: 80, margin: '-5px 0' }} 
                                popupMatchSelectWidth={false}
                                showSearch
                                optionFilterProp="children"
                                onChange={(val) => onItemChange(record.key, 'unit', val)}
                            >
                                {activeUnits.map(unit => (
                                <Option key={unit.value} value={unit.value}>{unit.label}</Option>
                                ))}
                            </Select>
                        }
                        readOnly 
                        style={{ 
                            textAlign: 'right', 
                            fontWeight: 'bold',
                            opacity: 1, 
                        }} 
                    />
                );
            }
        },
        {
            title: 'Price / unit',
            dataIndex: 'price',
            width: 100, 
            render: (_, record) => (
                <Input 
                    addonBefore={
                        <Select
                            value={currency} 
                            style={{ width: 100, margin: '-5px 0' }}
                            popupMatchSelectWidth={false}
                            showSearch
                            optionFilterProp="children"
                            onChange={(val) => setCurrency(val)}
                        >
                            {activeCurrencies.map(curr => (
                            <Option key={curr.code} value={curr.code}>{curr.label}</Option>
                            ))}
                        </Select>
                    }
                    style={{ width: '100%' }} 
                    value={audFormatter(record.price)}
                    onChange={(e) => onInputChange(record.key, 'price', e, 2)}
                />
            )
        },
        {
            title: 'Total',
            dataIndex: 'total',
            width: 125, 
            render: (text) => (
                <Input prefix={currentSymbolLabel} value={audFormatterFixed(text)} readOnly style={{ textAlign: 'right' }} />
            )
        },
        {
            key: 'action',
            width: 1,
            render: (_, record) => <Button type="text" style={{ width: 10, marginRight:-10}} danger icon={<DeleteOutlined />} onClick={() => removeRow(record.key)} />
        }
    ], [currency, activeCurrencies, activeUnits, currentSymbolLabel, items]); 

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