// src/pages/docket/DocketForm.jsx

import React, { useState } from 'react';
import { Form, Button, Typography, Row, Col, Input, InputNumber, Space, Divider, Checkbox } from 'antd';

// Components
import InvoiceTotalsSummary from '../../components/TotalsSummary';
import DocketItemsTable from '../../components/docket/DocketItemsTable';
import CustomerDetails from '../../components/docket/CustomerDetails';
import DocketHeader from '../../components/docket/DocketHeader';

// Hooks
import useDocketCalculations from '../../hooks/docket/useDocketCalculations';

import '../../styles/Form.css'; 

const { Text } = Typography;

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

    // --- HOOK: Calculations ---
    const { 
        itemsWithTotals, 
        grossTotal, 
        gstAmount, 
        finalTotal 
    } = useDocketCalculations({
        items: dataSource,
        preGstDeductions,
        postGstDeductions,
        includeGST: gstEnabled,
        gstPercentage
    });

    // --- Table Actions (Add/Remove) ---
    const addRow = (count = 1) => {
        const timestamp = Date.now(); 
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

    // --- Table Data Update ---
    const handleItemsChange = (key, field, value) => {
        setDataSource(prev => prev.map(item => {
            if (item.key === key) {
                return { ...item, [field]: value };
            }
            return item;
        }));
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

    const onFinish = (values) => {
        const payload = {
            ...values,
            // Filter out empty rows, using the calculated items
            items: itemsWithTotals.filter(item => item.gross > 0 || item.metal),
            totals: { grossTotal, gstAmount, finalTotal },
            deductions: { pre: preGstDeductions, post: postGstDeductions }
        };
        console.log('Form Submitted:', payload);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1600px', margin: '0 auto' }}>
            <Form form={form} layout="vertical" onFinish={onFinish}>
                
                {/* --- COMPONENT: HEADER --- */}
                <DocketHeader />

                {/* --- COMPONENT: CUSTOMER DETAILS --- */}
                <CustomerDetails dateFormat={dateFormat} />

                {/* --- COMPONENT: ITEMS TABLE --- */}
                <DocketItemsTable 
                    items={itemsWithTotals} // Pass calculated items
                    onItemChange={handleItemsChange} 
                    addRow={addRow}       
                    removeRow={removeRow} 
                />

                {/* --- COMPONENT: TOTALS SUMMARY --- */}
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
                        calculatedTotals={{ grossTotal, gstAmount, finalTotal }}
                        preGstDeductions={preGstDeductions}
                        postGstDeductions={postGstDeductions}
                        handleDeductionChange={handleDeductionChange}
                        addDeduction={addDeduction}
                        removeDeduction={removeDeduction}
                        currency="AUD"
                    />
                </Row>

                <Divider />
                
                {/* --- ACTION BUTTONS (FOOTER) --- */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '30px' }}>
                    
                    {/* TOP: Save Checkbox */}
                    <Space>
                        <Form.Item name="saveDocket" valuePropName="checked" noStyle initialValue={true}>
                            <Checkbox style={{ fontSize: '24px', transform: 'scale(1.5)' }}>
                                Save Docket?
                            </Checkbox>
                        </Form.Item>
                    </Space>

                    {/* SEPARATOR */}
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