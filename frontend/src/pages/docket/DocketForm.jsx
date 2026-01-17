// src/pages/docket/DocketForm.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Row, Col, Input, InputNumber, Space, Divider, Checkbox, Typography, App } from 'antd'; 
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

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
import { SaveDocket, DownloadPDFDocket, PrintDocket, CheckPrintStatus } from '../../scripts/utilities/docketUtils';
import '../../styles/Form.css'; 

const { Text } = Typography;

const generateInitialRows = (count) => {
    return Array.from({ length: count }, (_, index) => ({
        key: Date.now() + index, metal: '', notes: '', gross: null, tare: null, net: 0, price: null, total: 0
    }));
};

export default function DocketForm({ mode = 'new', existingDocket = null }) {
    const { message } = App.useApp(); 
    
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const confirmReset = useConfirmReset();
    
    // --- 1. NEW STATE FOR PRINTING STATUS ---
    const [printing, setPrinting] = useState(false);

    // 1. Initialize Docket ID Hook
    const { scrdktID, resetDocket } = useDocketForm(mode, existingDocket);

    // 2. Data & Calculation States
    const [dataSource, setDataSource] = useState(() => {
        if (existingDocket && existingDocket.items) {
            return existingDocket.items.map(i => ({
                key: i.key || i.id,
                metal: i.metal || '',
                notes: i.notes || '',
                gross: i.gross,
                tare: i.tare,
                net: Math.max(0, (i.gross || 0) - (i.tare || 0)),
                price: i.price,
                total: 0
            }));
        }
        return generateInitialRows(20);
    });

    const [gstEnabled, setGstEnabled] = useState(existingDocket?.include_gst || false);
    const [gstPercentage, setGstPercentage] = useState(existingDocket?.gst_percentage || 10);
    
    const [preGstDeductions, setPreGstDeductions] = useState(() => 
        existingDocket?.deductions?.filter(d => d.type === 'pre') || []
    );
    const [postGstDeductions, setPostGstDeductions] = useState(() => 
        existingDocket?.deductions?.filter(d => d.type === 'post') || []
    );

    // 3. Calculation Logic
    const { itemsWithTotals, grossTotal, gstAmount, finalTotal } = useDocketCalculations({
        items: dataSource,
        preGstDeductions,
        postGstDeductions,
        includeGST: gstEnabled,
        gstPercentage
    });

    // --- AUTOSAVE ON CLOSE LOGIC START ---
    
    // 1. Create a Ref to hold the latest state values (to access them inside the event listener)
    const stateRef = useRef({
        scrdktID,
        itemsWithTotals,
        preGstDeductions,
        postGstDeductions,
        gstEnabled,
        gstPercentage
    });

    // 2. Sync Ref with State changes
    useEffect(() => {
        stateRef.current = {
            scrdktID,
            itemsWithTotals,
            preGstDeductions,
            postGstDeductions,
            gstEnabled,
            gstPercentage
        };
    }, [scrdktID, itemsWithTotals, preGstDeductions, postGstDeductions, gstEnabled, gstPercentage]);

    // 3. Attach Event Listener
    useEffect(() => {
        const handleBeforeUnload = () => {
            // Get latest data from Ref and Form
            const state = stateRef.current;
            const values = form.getFieldsValue();

            // Don't save if no ID
            if (!state.scrdktID) return;

            // Helper for safe values
            const safe = (val) => val ?? "";
            const num = (val) => Number(val ?? 0);

            // Format Date/Time manually since we can't use complex util functions easily here
            let dateStr = null;
            if (values.date && dayjs.isDayjs(values.date)) dateStr = values.date.format('YYYY-MM-DD');
            
            let timeStr = null;
            if (values.time && dayjs.isDayjs(values.time)) timeStr = values.time.format('HH:mm a');

            let dobStr = null;
            if (values.dob && dayjs.isDayjs(values.dob)) dobStr = values.dob.format('YYYY-MM-DD');

            // Construct Payload manually
            const payload = {
                scrdkt_number: state.scrdktID,
                docket_date: dateStr,
                docket_time: timeStr,
                status: "Draft", // Always save as Draft on exit
                is_saved: values.saveDocket ?? true,
                print_qty: num(values.printQty),
                docket_type: safe(values.docketType) || "Customer",
                
                // Company
                company_name: safe(values.companyDetails),
                company_address: safe(values.companyAddress),
                company_phone: safe(values.companyPhone),
                company_email: safe(values.companyEmail),
                company_abn: safe(values.companyABN),

                // Financials
                include_gst: state.gstEnabled,
                gst_percentage: num(state.gstPercentage),

                // Customer
                customer_name: safe(values.name),
                customer_address: safe(values.address),
                customer_phone: safe(values.phone),
                customer_abn: safe(values.abn),
                customer_license_no: safe(values.licenseNo),
                customer_rego_no: safe(values.regoNo),
                customer_dob: dobStr,
                customer_pay_id: safe(values.payId),
                
                // Bank
                bank_bsb: safe(values.bsb),
                bank_account_number: safe(values.accNo),
                
                // Notes
                notes: safe(values.paperNotes),

                // Items (Filter empty ones)
                items: state.itemsWithTotals
                    .filter(i => i.gross > 0 || (i.metal && i.metal.trim() !== ""))
                    .map(i => ({
                        metal: safe(i.metal),
                        notes: safe(i.notes),
                        gross: num(i.gross),
                        tare: num(i.tare),
                        price: num(i.price)
                    })),

                // Deductions
                deductions: [
                    ...state.preGstDeductions.map(d => ({ type: "pre", label: safe(d.label), amount: num(d.amount) })),
                    ...state.postGstDeductions.map(d => ({ type: "post", label: safe(d.label), amount: num(d.amount) })),
                ]
            };

            // Use fetch with keepalive: true to ensure request survives page close
            // Note: Hardcoding URL here as we can't import variables easily into this specific scope if defined outside
            const API_URL = 'http://localhost:8000/api/dockets/saveDocket';
            
            fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                keepalive: true // CRITICAL: This keeps the request alive after unload
            }).catch(err => console.error("Auto-save on exit failed", err));
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [form]); // Re-bind if form instance changes (rare)

    // --- AUTOSAVE END ---

    // 4. Effects
    useEffect(() => {
        if (scrdktID) {
            form.setFieldsValue({ docketNumber: scrdktID });
        }
    }, [scrdktID, form]);

    useEffect(() => {
        if (mode === 'edit' && existingDocket) {
            form.setFieldsValue({
                docketType: existingDocket.docket_type,
                companyDetails: existingDocket.company_name,
                companyAddress: existingDocket.company_address,
                companyPhone: existingDocket.company_phone,
                companyEmail: existingDocket.company_email,
                companyABN: existingDocket.company_abn,
                date: existingDocket.docket_date ? dayjs(existingDocket.docket_date) : dayjs(),
                time: existingDocket.docket_time ? dayjs(existingDocket.docket_time, 'hh:mm a') : dayjs(),
                name: existingDocket.customer_name,
                licenseNo: existingDocket.customer_license_no,
                regoNo: existingDocket.customer_rego_no,
                dob: existingDocket.customer_dob ? dayjs(existingDocket.customer_dob) : null,
                payId: existingDocket.customer_pay_id,
                phone: existingDocket.customer_phone,
                bsb: existingDocket.bank_bsb,
                accNo: existingDocket.bank_account_number,
                abn: existingDocket.customer_abn,
                address: existingDocket.customer_address,
                paperNotes: existingDocket.notes,
                saveDocket: existingDocket.is_saved,
                printQty: existingDocket.print_qty || 2
            });
        }
    }, [mode, existingDocket, form]);

    // --- Handlers ---
    const addRow = (count = 1) => {
        const timestamp = Date.now(); 
        const newRows = Array.from({ length: count }, (_, index) => ({
            key: timestamp + index, metal: '', notes: '', gross: null, tare: null, net: 0, price: null, total: 0
        }));
        setDataSource([...dataSource, ...newRows]);
    };

    const removeRow = (key) => setDataSource(dataSource.filter(item => item.key !== key));
    const handleItemsChange = (key, field, value) => setDataSource(prev => prev.map(item => item.key === key ? { ...item, [field]: value } : item));
    
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

    // --- SAVE HANDLER ---
    const handleSave = async () => {
        try {
            const values = await form.validateFields(); // Validate first
            await SaveDocket({
                scrdktID,
                status: "Saved", 
                values,
                items: itemsWithTotals.filter(item => item.gross > 0 || item.metal),
                totals: { grossTotal, gstAmount, finalTotal },
                deductions: { pre: preGstDeductions, post: postGstDeductions },
                includeGST: gstEnabled,
                gstPercentage
            });

            message.success('Docket saved successfully!');

            if (mode === 'new') {
               resetDocket();
               form.resetFields(); // Optional: clear form
            } else {
               navigate('/view-docket');
            }
        } catch (error) {
            console.error(error);
            message.error('Failed to save docket.');
        }
    };

    const handleDownload = async () => {
        try {
            const values = await form.validateFields();
            const result = await SaveDocket({
                scrdktID,
                status: "Downloaded", 
                values,
                items: itemsWithTotals.filter(item => item.gross > 0 || item.metal),
                totals: { grossTotal, gstAmount, finalTotal },
                deductions: { pre: preGstDeductions, post: postGstDeductions },
                includeGST: gstEnabled,
                gstPercentage
            });

            await DownloadPDFDocket(result.id, scrdktID);
            message.success('Download initiated!');
        } catch (error) {
            console.error(error);
            message.error('Failed to download docket.');
        }
    };

    // --- PRINT HANDLER ---
    const handlePrint = async () => {
        setPrinting(true); 
        try {
            message.info('Preparing docket for printing...');
            const values = await form.validateFields();
            const qty = values.printQty || 1;

            // 1. Save
            const result = await SaveDocket({
                scrdktID,
                status: "Printed", 
                values,
                items: itemsWithTotals.filter(item => item.gross > 0 || item.metal),
                totals: { grossTotal, gstAmount, finalTotal },
                deductions: { pre: preGstDeductions, post: postGstDeductions },
                includeGST: gstEnabled,
                gstPercentage
            });

            // 2. Send Print Request
            const printResponse = await PrintDocket(result.id, qty);
            const filename = printResponse.filename;

            if (!filename) {
                // Fallback if no filename returned
                message.success(`Sent to printer (${qty} copies)`);
                setPrinting(false);
                return;
            }

            // 3. Start Polling Loop (Wait for watcher to delete file)
            const maxRetries = 10; // Wait max 20 seconds (20 * 1s)
            let attempts = 0;
            
            message.info('Sending to printer, please wait...');
            const pollInterval = setInterval(async () => {
                attempts++;
                const status = await CheckPrintStatus(filename);

                if (status === 'completed') {
                    // Success: File is gone!
                    clearInterval(pollInterval);
                    setPrinting(false);
                    message.success(`Printing Started (${qty} copies)`);
                    
                    // Navigate or Reset
                    if (mode === 'new') {
                       resetDocket();
                       form.resetFields(); 
                    } else {
                       navigate('/view-docket');
                    }
                } else if (attempts >= maxRetries) {
                    // Timeout: Watcher didn't pick it up
                    clearInterval(pollInterval);
                    setPrinting(false);
                    message.warning("Sent to queue, but printer script seems slow or offline.");
                }
            }, 1000); // Check every 1 second

        } catch (error) {
            console.error(error);
            message.error('Failed to print docket.');
            setPrinting(false);
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
                            style={{ minWidth: 220, height: 70, fontSize: '28px', marginLeft: '20px' }}
                            onClick={handlePrint}
                            loading={printing}  // AntD loading spinner
                            disabled={printing} // Explicit disable
                        >
                            {printing ? "Printing..." : "Print"}
                        </Button>
                    </Space>

                    <div style={{ width: '400px', borderBottom: '2px solid #f0f0f0' }}></div>
                    
                    <Button onClick={handleSave}>
                        Save Docket
                    </Button>
                    <Button onClick={handleDownload}>
                        Download Docket
                    </Button>
                    <Button type="dashed" onClick={() => confirmReset(() => window.location.reload())}>
                        Reset Form
                    </Button>
                </div>
            </Form>
        </div>
    );
}