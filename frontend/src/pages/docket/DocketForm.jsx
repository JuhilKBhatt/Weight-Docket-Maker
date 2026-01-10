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

    // --- Table Calculation Logic ---
    const handleItemsChange = (key, field, value) => {
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
                <Card variant="borderless" style={{ marginBottom: 20 }}>
                    <Row justify="space-between" align="middle">
                        {/* LEFT SIDE */}
                        <Col>
                            <Space size="middle">
                                <Form.Item name="docketType" initialValue="Customer">
                                    <Select>
                                        <Option value="Customer">Customer</Option>
                                        <Option value="Weight">Weight</Option>
                                    </Select>
                                </Form.Item>
                                <Title level={1}>: Docket</Title>
                            </Space>
                        </Col>

                        {/* RIGHT SIDE */}
                        <Col>
                            <Space align="center">
                                <Title level={1}>Company :</Title>
                                <Form.Item name="companyDetails">
                                    <Select>
                                        <Option value="company1">Example Company A</Option>
                                        <Option value="company2">Example Company B</Option>
                                    </Select>
                                </Form.Item>
                            </Space>
                        </Col> 
                    </Row>
                </Card>

                {/* --- CUSTOMER DETAILS --- */}
                <CustomerDetails
                    dateFormat={dateFormat}
                />

                {/* --- ITEMS TABLE --- */}
                <DocketItemsTable 
                    items={dataSource} 
                    onItemChange={handleItemsChange} 
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
                        <Button type="primary" size="large" htmlType="submit" style={{ minWidth: 120 }}>
                            Print
                        </Button>
                    </Space>
                </div>
            </Form>
        </div>
    );
}