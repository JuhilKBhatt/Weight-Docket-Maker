// ./frontend/src/pages/docket/DocketForm.jsx

import React, { useState, useEffect } from 'react';
import { Form, Button, Typography, Row, Col, Input, Select, InputNumber, Card, Space, Divider, Checkbox } from 'antd';

// Components
import InvoiceTotalsSummary from '../../components/TotalsSummary';
import DocketItemsTable from '../../components/docket/DocketItemsTable';
import CustomerDetails from '../../components/docket/CustomerDetails';

import '../../styles/Form.css'; 

const { Title, Text } = Typography;
const { Option } = Select;

// Helper for initial rows
// We use Date.now() + index to ensure unique keys on initial load
const generateInitialRows = (count) => {
    return Array.from({ length: count }, (_, index) => ({
        key: Date.now() + index, 
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
    const [dataSource, setDataSource] = useState(generateInitialRows(20));
    
    // --- Totals & Deductions States ---
    const [gstEnabled, setGstEnabled] = useState(false);
    const [gstPercentage, setGstPercentage] = useState(10);
    const [preGstDeductions, setPreGstDeductions] = useState([]);
    const [postGstDeductions, setPostGstDeductions] = useState([]);
    
    const [calculatedTotals, setCalculatedTotals] = useState({
        grossTotal: 0,
        gstAmount: 0,
        finalTotal: 0
    });

// --- Table Actions (Add/Remove) ---
    const addRow = (count = 1) => {
        const timestamp = Date.now(); // Get time once
        
        const newRows = Array.from({ length: count }, (_, index) => ({
            key: timestamp + index, 
            metal: '',
            notes: '',
            gross: null,
            tare: null,
            net: 0,
            price: null,
            total: 0
        }));
        
        setDataSource([...dataSource, ...newRows]);
    };

    const removeRow = (key) => {
        setDataSource(dataSource.filter(item => item.key !== key));
    };

    // --- Table Calculation Logic ---
    const handleItemsChange = (key, field, value) => {
        const newData = [...dataSource];
        const index = newData.findIndex((item) => item.key === key);
        if (index === -1) return; // Guard clause in case row is deleted fast

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

    // --- Deduction Handlers ---
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
        const itemsTotal = dataSource.reduce((acc, curr) => acc + (curr.total || 0), 0);
        const preDedTotal = preGstDeductions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
        
        const grossTotal = Math.max(0, itemsTotal - preDedTotal);
        const gstAmount = gstEnabled ? grossTotal * (gstPercentage / 100) : 0;
        const postDedTotal = postGstDeductions.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
        const finalTotal = Math.max(0, grossTotal + gstAmount - postDedTotal);

        setCalculatedTotals({
            grossTotal,
            gstAmount,
            finalTotal
        });

    }, [dataSource, gstEnabled, gstPercentage, preGstDeductions, postGstDeductions]);

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
                <Card style={{ marginBottom: 20 }}>
                    <Row justify="space-between" align="middle">
                        {/* LEFT SIDE: Vertically centered automatically by Row align="middle" */}
                        <Col>
                            <Space size="middle">
                                <Form.Item name="docketType" initialValue="Customer" noStyle>
                                    <Select size="large" style={{ width: 180, fontSize: '18px' }}>
                                        <Option value="Customer">Customer</Option>
                                        <Option value="Weight">Weight</Option>
                                    </Select>
                                </Form.Item>
                                <Title level={1} style={{ margin: 0 }}>Docket</Title>
                            </Space>
                        </Col>

                        {/* RIGHT SIDE: Stacked vertically */}
                        <Col>
                            <Space direction="vertical" align="end" size={0}>
                                {/* Top: Company Selector */}
                                <Space align="center" style={{ marginBottom: 8 }}>
                                    <Title level={4} style={{ margin: 0 }}>Company:</Title>
                                    <Form.Item name="companyDetails" noStyle>
                                        <Select size="large" style={{ width: 300 }} placeholder="Select Company">
                                            <Option value="company1">Example Company A</Option>
                                            <Option value="company2">Example Company B</Option>
                                        </Select>
                                    </Form.Item>
                                </Space>

                                {/* Bottom: Docket Number */}
                                <Space align="center">
                                    <Title level={4} style={{ margin: 0 }}>Docket #:</Title>
                                    <Form.Item name="docketNumber" noStyle>
                                        <InputNumber size="large" readOnly style={{ width: 150 }} placeholder="#" />
                                    </Form.Item>
                                </Space>
                            </Space>
                        </Col> 
                    </Row>
                </Card>

                {/* --- CUSTOMER DETAILS --- */}
                <CustomerDetails dateFormat={dateFormat} />

                {/* --- ITEMS TABLE --- */}
                <DocketItemsTable 
                    items={dataSource} 
                    onItemChange={handleItemsChange} 
                    addRow={addRow}       // PASSING PROP
                    removeRow={removeRow} // PASSING PROP
                />

                {/* --- TOTALS SUMMARY --- */}
                <Row gutter={24} style={{ marginTop: 20 }}>
                    <Col span={12}>
                        <Form.Item label="Docket Notes" name="paperNotes">
                            <Input.TextArea rows={4} placeholder="Additional notes for this docket..." />
                        </Form.Item>
                    </Col>
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

                <Divider />
                {/* --- ACTION BUTTONS --- */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '30px' }}>
                    
                    {/* TOP: Save Checkbox */}
                    <Space>
                        <Form.Item name="saveDocket" valuePropName="checked" noStyle initialValue={true}>
                            <Checkbox style={{ fontSize: '24px', transform: 'scale(1.5)' }}>
                                Save Docket?
                            </Checkbox>
                        </Form.Item>
                    </Space>

                    {/* SEPARATOR: Light horizontal line */}
                    <div style={{ width: '400px', borderBottom: '2px solid #f0f0f0' }}></div>

                    {/* BOTTOM: Print Section */}
                    <Space size="large" align="center">
                        <Space size="small">
                            <Text style={{ fontSize: '24px' }}>Printing:</Text>
                            <Form.Item name="printQty" noStyle initialValue={2}>
                                <InputNumber 
                                    min={1} 
                                    max={10} 
                                    size="large" 
                                    style={{ width: 80, fontSize: '24px', height: '45px', paddingTop: '4px' }} 
                                />
                            </Form.Item>
                            <Text style={{ fontSize: '24px' }}>Dockets</Text>
                        </Space>
                        
                        <Button 
                            type="primary" 
                            size="large" 
                            htmlType="submit" 
                            style={{ minWidth: 220, height: 70, fontSize: '28px', marginLeft: '20px' }}
                        >
                            Print
                        </Button>
                    </Space>

                </div>
            </Form>
        </div>
    );
}