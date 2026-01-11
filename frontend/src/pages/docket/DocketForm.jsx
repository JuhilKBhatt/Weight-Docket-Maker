// src/pages/docket/DocketForm.jsx

import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Input, InputNumber, Space, Divider, Checkbox, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

// Components
import InvoiceTotalsSummary from '../../components/TotalsSummary';
import DocketItemsTable from '../../components/docket/DocketItemsTable';
import CustomerDetails from '../../components/docket/CustomerDetails';
import DocketHeader from '../../components/docket/DocketHeader';
import NetWeightSummary from '../../components/docket/NetWeightSummary';

// Hooks
import useDocketCalculations from '../../hooks/docket/useDocketCalculations';
import useDocketForm from '../../hooks/docket/useDocketForm';
import { useConfirmReset } from '../../scripts/utilities/confirmReset';

// Utilities
import { saveDraftDocket } from '../../scripts/utilities/docketUtils';

import '../../styles/Form.css'; 

const { Text } = Typography;

// Helper to generate empty rows
const generateInitialRows = (count) => {
    return Array.from({ length: count }, (_, index) => ({
        key: Date.now() + index, metal: '', notes: '', gross: null, tare: null, net: 0, price: null, total: 0
    }));
};

export default function DocketForm({ mode = 'new' }) {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const confirmReset = useConfirmReset();
    
    // 1. Initialize Docket ID Hook
    const { scrdktID, resetDocket } = useDocketForm(mode);

    // 2. Data & Calculation States
    const [dataSource, setDataSource] = useState(generateInitialRows(20));
    const [gstEnabled, setGstEnabled] = useState(false);
    const [gstPercentage, setGstPercentage] = useState(10);
    const [preGstDeductions, setPreGstDeductions] = useState([]);
    const [postGstDeductions, setPostGstDeductions] = useState([]);

    // 3. Calculation Logic
    const { itemsWithTotals, grossTotal, gstAmount, finalTotal } = useDocketCalculations({
        items: dataSource,
        preGstDeductions,
        postGstDeductions,
        includeGST: gstEnabled,
        gstPercentage
    });

    // 4. Effect: Sync generated ID to the Form Field
    useEffect(() => {
        if (scrdktID) {
            form.setFieldsValue({ docketNumber: scrdktID });
        }
    }, [scrdktID, form]);

    // --- Handlers ---
    const addRow = (count = 1) => {
        const timestamp = Date.now(); 
        const newRows = Array.from({ length: count }, (_, index) => ({
            key: timestamp + index, metal: '', notes: '', gross: null, tare: null, net: 0, price: null, total: 0
        }));
        setDataSource([...dataSource, ...newRows]);
    };

    const removeRow = (key) => setDataSource(dataSource.filter(item => item.key !== key));

    const handleItemsChange = (key, field, value) => {
        setDataSource(prev => prev.map(item => item.key === key ? { ...item, [field]: value } : item));
    };

    const addDeduction = (type) => {
        const newDeduction = { key: Date.now(), label: '', amount: null };
        type === 'pre' ? setPreGstDeductions([...preGstDeductions, newDeduction]) : setPostGstDeductions([...postGstDeductions, newDeduction]);
    };

    const removeDeduction = (type, key) => {
        type === 'pre' ? setPreGstDeductions(preGstDeductions.filter(d => d.key !== key)) : setPostGstDeductions(postGstDeductions.filter(d => d.key !== key));
    };

    const handleDeductionChange = (type, key, field, value) => {
        const updateList = (list) => list.map(item => item.key === key ? { ...item, [field]: value } : item);
        type === 'pre' ? setPreGstDeductions(updateList(preGstDeductions)) : setPostGstDeductions(updateList(postGstDeductions));
    };

    // --- SAVE / SUBMIT HANDLER ---
    const onFinish = async (values) => {
        try {
            await saveDraftDocket({
                scrdktID,
                status: values.saveDocket ? "Saved" : "Printed", 
                values,
                items: itemsWithTotals.filter(item => item.gross > 0 || item.metal),
                totals: { grossTotal, gstAmount, finalTotal },
                deductions: { pre: preGstDeductions, post: postGstDeductions },
                includeGST: gstEnabled,
                gstPercentage
            });

            alert('Docket saved successfully!');

            if (mode === 'new') {
                resetDocket();
                form.resetFields();
                window.location.reload(); 
            }
        } catch (error) {
            console.error(error);
            alert('Failed to save docket.');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1600px', margin: '0 auto', position: 'relative' }}>
            
            {/* --- COMPONENT: NET WEIGHT SUMMARY (Floating Button) --- */}
            <NetWeightSummary items={itemsWithTotals} />

            <Form form={form} layout="vertical">
                
                {/* --- COMPONENT: HEADER --- */}
                <DocketHeader />

                {/* --- COMPONENT: CUSTOMER DETAILS --- */}
                <CustomerDetails />

                {/* --- COMPONENT: ITEMS TABLE --- */}
                <DocketItemsTable 
                    items={itemsWithTotals} 
                    onItemChange={handleItemsChange} 
                    addRow={addRow}       
                    removeRow={removeRow} 
                />

                {/* --- COMPONENT: TOTALS SUMMARY --- */}
                <Row gutter={24} style={{ marginTop: 20 }}>
                    <Col span={12}>
                        <Form.Item label="Docket Notes" name="paperNotes">
                            <Input.TextArea rows={4} placeholder="Additional notes..." />
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
                            <Checkbox style={{ fontSize: '24px', transform: 'scale(1.5)' }}>Save Docket?</Checkbox>
                        </Form.Item>
                    </Space>

                    <div style={{ width: '400px', borderBottom: '2px solid #f0f0f0' }}></div>

                    {/* BOTTOM: Print Section */}
                    <Space size="large" align="center">
                        <Space size="small">
                            <Text style={{ fontSize: '24px' }}>Printing:</Text>
                            <Form.Item name="printQty" noStyle initialValue={2}>
                                <InputNumber min={1} max={10} size="large" style={{ width: 80, fontSize: '24px', height: '45px', paddingTop: '4px' }} />
                            </Form.Item>
                            <Text style={{ fontSize: '24px' }}>Dockets</Text>
                        </Space>
                        
                        <Button 
                            type="primary" 
                            size="large" 
                            onClick={onFinish}
                            style={{ minWidth: 220, height: 70, fontSize: '28px', marginLeft: '20px' }}
                        >
                            Print & Save
                        </Button>
                    </Space>
                    
                    <Button type="dashed" onClick={() => confirmReset(() => window.location.reload())}>
                        Reset Form
                    </Button>
                </div>
            </Form>
        </div>
    );
}