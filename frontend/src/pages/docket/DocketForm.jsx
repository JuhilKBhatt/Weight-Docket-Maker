// ./frontend/src/pages/docket/DocketForm.jsx

import React, { useState, useEffect } from 'react';
import { Form, Button, Typography, Row, Col, Input, Select, Table, InputNumber, Card, Space, Divider, Checkbox, DatePicker } from 'antd';
import InvoiceTotalsSummary from '../../components/TotalsSummary';
import '../../styles/Form.css'; 

const { Title, Text } = Typography;
const { Option } = Select;

// Helper for initial rows
const generateInitialRows = (count) => {
    return Array.from({ length: count }, (_, index) => ({
        key: index,
        metal: '',
        notes: '',
        gross: null,
        tare: null,
        net: 0,
        price: null,
        total: 0
    }));
};

export default function DocketForm() {
    const [form] = Form.useForm();
    const dateFormat = 'DD/MM/YYYY';
    
    // --- Data States ---
    const [dataSource, setDataSource] = useState(generateInitialRows(24));
    
    // --- Totals & Deductions States (Required for Summary Component) ---
    const [gstEnabled, setGstEnabled] = useState(false);
    const [gstPercentage, setGstPercentage] = useState(10);
    const [preGstDeductions, setPreGstDeductions] = useState([]);
    const [postGstDeductions, setPostGstDeductions] = useState([]);
    
    // Object structure matches what InvoiceTotalsSummary expects
    const [calculatedTotals, setCalculatedTotals] = useState({
        grossTotal: 0,
        gstAmount: 0,
        finalTotal: 0
    });

    // --- Table Calculation Logic ---
    const handleTableCalculation = (key, field, value) => {
        const newData = [...dataSource];
        const index = newData.findIndex((item) => item.key === key);
        const item = newData[index];

        item[field] = value;

        const gross = parseFloat(item.gross) || 0;
        const tare = parseFloat(item.tare) || 0;
        const price = parseFloat(item.price) || 0;

        const net = Math.max(0, gross - tare);
        const total = net * price;

        item.net = parseFloat(net.toFixed(2));
        item.total = parseFloat(total.toFixed(2));

        newData.splice(index, 1, item);
        setDataSource(newData);
    };

    // --- Deduction Handlers (Replicated for Docket) ---
    const addDeduction = (type) => {
        const newDeduction = { key: Date.now(), label: '', amount: null };
        if (type === 'pre') setPreGstDeductions([...preGstDeductions, newDeduction]);
        else setPostGstDeductions([...postGstDeductions, newDeduction]);
    };

    const removeDeduction = (type, key) => {
        if (type === 'pre') setPreGstDeductions(preGstDeductions.filter(d => d.key !== key));
        else setPostGstDeductions(postGstDeductions.filter(d => d.key !== key));
    };

    const handleDeductionChange = (type, key, field, value) => {
        const updateList = (list) => list.map(item => item.key === key ? { ...item, [field]: value } : item);
        if (type === 'pre') setPreGstDeductions(updateList(preGstDeductions));
        else setPostGstDeductions(updateList(postGstDeductions));
    };

    // --- Master Calculation Effect ---
    useEffect(() => {
        // 1. Sum of Docket Items
        const itemsTotal = dataSource.reduce((acc, curr) => acc + (curr.total || 0), 0);

        // 2. Sum of Pre-GST Deductions
        const preDedTotal = preGstDeductions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
        
        // 3. Gross Total (Subtotal)
        const grossTotal = Math.max(0, itemsTotal - preDedTotal);

        // 4. GST
        const gstAmount = gstEnabled ? grossTotal * (gstPercentage / 100) : 0;

        // 5. Sum of Post-GST Deductions
        const postDedTotal = postGstDeductions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

        // 6. Final Total
        const finalTotal = Math.max(0, grossTotal + gstAmount - postDedTotal);

        setCalculatedTotals({
            grossTotal,
            gstAmount,
            finalTotal
        });

    }, [dataSource, gstEnabled, gstPercentage, preGstDeductions, postGstDeductions]);


    // --- Table Columns ---
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
                <Input placeholder="Metal" onChange={(e) => handleTableCalculation(record.key, 'metal', e.target.value)} />
            )
        },
        {
            title: 'Notes',
            dataIndex: 'notes',
            render: (_, record) => (
                <Input placeholder="Notes" onChange={(e) => handleTableCalculation(record.key, 'notes', e.target.value)} />
            )
        },
        {
            title: 'Gross (kg)',
            dataIndex: 'gross',
            render: (_, record) => (
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" onChange={(val) => handleTableCalculation(record.key, 'gross', val)} />
            )
        },
        {
            title: 'Tare (kg)',
            dataIndex: 'tare',
            render: (_, record) => (
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" onChange={(val) => handleTableCalculation(record.key, 'tare', val)} />
            )
        },
        {
            title: 'Net Weight (kg)',
            dataIndex: 'net',
            render: (text) => <Input value={text} readOnly style={{ backgroundColor: '#f0f0f0', cursor: 'default', fontWeight: 'bold' }} />
        },
        {
            title: 'Price/kg ($)',
            dataIndex: 'price',
            render: (_, record) => (
                <InputNumber min={0} step={0.01} prefix="$" style={{ width: '100%' }} placeholder="0.00" onChange={(val) => handleTableCalculation(record.key, 'price', val)} />
            )
        },
        {
            title: 'Total ($)',
            dataIndex: 'total',
            render: (text) => <Input prefix="$" value={text} readOnly className="large-total-input" />
        },
    ];

    const onFinish = (values) => {
        const payload = {
            ...values,
            items: dataSource.filter(item => item.gross > 0 || item.metal),
            totals: calculatedTotals,
            deductions: { pre: preGstDeductions, post: postGstDeductions }
        };
        console.log('Form Submitted:', payload);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
            <Form form={form} layout="vertical" onFinish={onFinish}>
                
                {/* --- HEADER --- */}
                <Card variant="borderless" style={{ marginBottom: 20 }}>
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Form.Item name="docketType" initialValue="Customer" noStyle>
                                <Select style={{ width: 150, fontSize: '18px' }}>
                                    <Option value="Customer">Customer</Option>
                                    <Option value="Weight">Weight</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col>
                            <Title level={1} style={{ margin: 0 }}>Docket</Title>
                        </Col>
                        {/* Removed GST Checkbox from here, it is now in the Summary component */}
                        <Col></Col> 
                    </Row>
                </Card>

                {/* --- CUSTOMER DETAILS --- */}
                <Card title="Customer Details" size="small" style={{ marginBottom: 20 }}>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item label="Name" name="name">
                                <Input placeholder="Full Name" />
                            </Form.Item>
                        </Col>
                        <Col span={8}><Form.Item label="License No." name="licenseNo"><Input placeholder="License No." /></Form.Item></Col>
                        <Col span={8}><Form.Item label="Rego No." name="regoNo"><Input placeholder="Rego No." /></Form.Item></Col>
                        <Col span={8}>
                            <Form.Item label="Date of Birth" name="dob">
                                <DatePicker format={dateFormat}/>
                            </Form.Item>
                        </Col>
                        <Col span={8}><Form.Item label="PayID" name="payId"><Input placeholder="PayID" /></Form.Item></Col>
                        <Col span={8}><Form.Item label="Phone No." name="phone"><Input placeholder="Phone Number" /></Form.Item></Col>
                        <Col span={6}><Form.Item label="BSB" name="bsb"><Input placeholder="BSB" /></Form.Item></Col>
                        <Col span={6}><Form.Item label="Account No." name="accNo"><Input placeholder="Account No." /></Form.Item></Col>
                        <Col span={6}><Form.Item label="ABN" name="abn"><Input placeholder="ABN" /></Form.Item></Col>
                        <Col span={6}><Form.Item label="Address" name="address"><Input placeholder="Address" /></Form.Item></Col>
                    </Row>
                </Card>

                {/* --- WEIGHT TABLE --- */}
                <Table
                    rowClassName={() => 'docket-table-row'}
                    dataSource={dataSource}
                    columns={columns}
                    pagination={false}
                    bordered
                    size="middle"
                    style={{ marginBottom: 30 }}
                />

                {/* --- TOTALS SECTION --- */}
                <Row gutter={24} style={{ marginTop: 20 }}>
                    {/* Notes */}
                    <Col span={12}>
                        <Form.Item label="Docket Notes" name="paperNotes">
                            <Input.TextArea rows={4} placeholder="Additional notes for this docket..." />
                        </Form.Item>
                    </Col>

                    {/* Totals Summary Component */}
                    <InvoiceTotalsSummary
                        includeGST={gstEnabled}
                        setIncludeGST={setGstEnabled}
                        gstPercentage={gstPercentage}
                        setGstPercentage={setGstPercentage}
                        calculatedTotals={calculatedTotals}
                        preGstDeductions={preGstDeductions}
                        postGstDeductions={postGstDeductions}
                        handleDeductionChange={handleDeductionChange}
                        addDeduction={addDeduction}
                        removeDeduction={removeDeduction}
                        currency="AUD"
                    />
                </Row>

                {/* --- ACTION BUTTONS --- */}
                <Divider />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0' }}>
                    <Space>
                        <Form.Item name="saveDocket" valuePropName="checked" noStyle initialValue={true}>
                            <Checkbox>Save Docket?</Checkbox>
                        </Form.Item>
                    </Space>
                    <Space>
                        <Button size="large" style={{ minWidth: 120 }}>
                            Save
                        </Button>
                    </Space>
                    <Space size="large">
                        <Space>
                            <Text>Printing:</Text>
                            <Form.Item name="printQty" noStyle initialValue={2}>
                                <InputNumber min={1} max={10} style={{ width: 60 }} />
                            </Form.Item>
                            <Text>Dockets</Text>
                        </Space>
                        <Button type="primary" size="large" style={{ minWidth: 120 }}>
                            Print
                        </Button>
                    </Space>
                </div>
            </Form>
        </div>
    );
}