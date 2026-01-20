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
import useInvoiceSelectors from '../../hooks/invoice/useInvoiceSelectors';

// Utilities
import { SaveDocket, DownloadPDFDocket, PrintDocket, CheckPrintStatus } from '../../scripts/utilities/docketUtils';
import { getDefaults, getCurrencies, getUnits } from '../../services/settingsService';
import '../../styles/Form.css'; 

const { Text } = Typography;

export default function DocketForm({ mode = 'new', existingDocket = null }) {
    const { message } = App.useApp(); 
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const confirmReset = useConfirmReset();
    
    // Fetch Company List for Defaults
    const { savedCompaniesFrom } = useInvoiceSelectors();

    const [printing, setPrinting] = useState(false);
    const { scrdktID, resetDocket } = useDocketForm(mode, existingDocket);

    // Options State
    const [currencyOptions, setCurrencyOptions] = useState([]);
    const [unitOptions, setUnitOptions] = useState([]);
    const [defaultUnit, setDefaultUnit] = useState('kg');

    // Data State
    const [dataSource, setDataSource] = useState([]); 
    
    // Financial Settings
    const [gstEnabled, setGstEnabled] = useState(false);
    const [gstPercentage, setGstPercentage] = useState(10);
    const [currency, setCurrency] = useState('AUD');
    
    const [preGstDeductions, setPreGstDeductions] = useState([]);
    const [postGstDeductions, setPostGstDeductions] = useState([]);

    // --- 1. NEW: Form Values Ref (To survive unmount) ---
    const formValuesRef = useRef({});

    // Update the ref whenever the form changes
    const handleValuesChange = (_, allValues) => {
        formValuesRef.current = allValues;
    };

    // --- INIT ROWS HELPER ---
    const generateInitialRows = (count, unit = 'kg') => {
        return Array.from({ length: count }, (_, index) => ({
            key: Date.now() + index, metal: '', notes: '', gross: null, tare: null, net: 0, price: null, total: 0, unit
        }));
    };

    // --- SYNC ID TO FORM ---
    useEffect(() => {
        if (scrdktID) {
            form.setFieldsValue({ docketNumber: scrdktID });
            // Update ref immediately
            formValuesRef.current = { ...form.getFieldsValue(), docketNumber: scrdktID };
        }
    }, [scrdktID, form]);

    // --- FETCH SETTINGS & DEFAULTS ---
    useEffect(() => {
        async function loadSettings() {
            try {
                const [defaults, curs, units] = await Promise.all([
                    getDefaults(),
                    getCurrencies(),
                    getUnits()
                ]);
                
                setCurrencyOptions(curs);
                setUnitOptions(units);

                // --- APPLY DEFAULTS (Only in New Mode) ---
                if (mode === 'new') {
                    if (defaults.default_currency) setCurrency(defaults.default_currency);
                    
                    const defUnit = defaults.default_unit || 'kg';
                    setDefaultUnit(defUnit);

                    if (defaults.default_gst_enabled) setGstEnabled(defaults.default_gst_enabled === 'true');
                    if (defaults.default_gst_percentage) setGstPercentage(Number(defaults.default_gst_percentage));
                    
                    // Default Bill From Company
                    const defaultCompId = Number(defaults.default_bill_from);
                    if (defaultCompId && savedCompaniesFrom.length > 0) {
                        const match = savedCompaniesFrom.find(c => c.id === defaultCompId);
                        if (match) {
                            form.setFieldsValue({
                                companyDetails: match.name,
                                companyAddress: match.address,
                                companyPhone: match.phone,
                                companyEmail: match.email,
                                companyABN: match.abn
                            });
                        }
                    }

                    // Init Table with Default Unit
                    setDataSource(generateInitialRows(20, defUnit));
                    // Initial sync to ref
                    formValuesRef.current = form.getFieldsValue();
                }
            } catch (err) {
                console.error("Error loading settings", err);
            }
        }

        // Trigger load
        loadSettings();
    }, [mode, savedCompaniesFrom]); 

    // --- INIT EDIT MODE ---
    useEffect(() => {
        if (mode === 'edit' && existingDocket) {
            message.info('Docket loaded for editing.', 0.8);
            setCurrency(existingDocket.currency || 'AUD');
            setGstEnabled(existingDocket.include_gst);
            setGstPercentage(existingDocket.gst_percentage);
            
            // Map Items
            const items = existingDocket.items.map(i => ({
                key: i.key || i.id,
                metal: i.metal || '',
                notes: i.notes || '',
                gross: i.gross,
                tare: i.tare,
                net: Math.max(0, (i.gross || 0) - (i.tare || 0)),
                price: i.price,
                total: 0,
                unit: i.unit || 'kg'
            }));
            setDataSource(items);
            
            setPreGstDeductions(existingDocket.deductions?.filter(d => d.type === 'pre') || []);
            setPostGstDeductions(existingDocket.deductions?.filter(d => d.type === 'post') || []);

            const initialValues = {
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
            };
            
            form.setFieldsValue(initialValues);
            formValuesRef.current = initialValues; // Sync Ref
        }
    }, [mode, existingDocket, form]);

    // 3. Calculation Logic
    const { itemsWithTotals, grossTotal, gstAmount, finalTotal } = useDocketCalculations({
        items: dataSource,
        preGstDeductions,
        postGstDeductions,
        includeGST: gstEnabled,
        gstPercentage
    });

    // --- AUTOSAVE LOGIC START ---
    
    // 1. Keep state ref updated
    const stateRef = useRef({ scrdktID, itemsWithTotals, preGstDeductions, postGstDeductions, gstEnabled, gstPercentage, currency });
    
    useEffect(() => { 
        stateRef.current = { scrdktID, itemsWithTotals, preGstDeductions, postGstDeductions, gstEnabled, gstPercentage, currency }; 
    }, [scrdktID, itemsWithTotals, preGstDeductions, postGstDeductions, gstEnabled, gstPercentage, currency]);

    // 2. The Auto-Save Effect
    useEffect(() => {
        const performAutoSave = () => {
            message.info('Auto-saving docket...', 0.5);
            const state = stateRef.current;
            // If no ID, nothing to save
            if (!state.scrdktID) return;

            // USE REF VALUES INSTEAD OF form.getFieldsValue() to ensure access on unmount
            const values = formValuesRef.current || {};
            
            // Helpers
            const safe = (val) => val ?? "";
            const num = (val) => Number(val ?? 0);

            // Date Formatting
            let dateStr = null;
            if (values.date) {
                 if (dayjs.isDayjs(values.date)) dateStr = values.date.format('YYYY-MM-DD');
                 else if (typeof values.date === 'string') dateStr = values.date.substring(0, 10);
            }
            
            let timeStr = null;
            if (values.time && dayjs.isDayjs(values.time)) timeStr = values.time.format('HH:mm a');

            let dobStr = null;
            if (values.dob && dayjs.isDayjs(values.dob)) dobStr = values.dob.format('YYYY-MM-DD');

            // Construct Payload
            const payload = {
                scrdkt_number: state.scrdktID,
                docket_date: dateStr,
                docket_time: timeStr,
                status: "Draft", 
                is_saved: values.saveDocket ?? true,
                print_qty: num(values.printQty),
                docket_type: safe(values.docketType) || "Customer",
                currency: safe(state.currency) || "AUD",
                
                // Add Symbol (required by new backend)
                currency_symbol: "$", 

                company_name: safe(values.companyDetails),
                company_address: safe(values.companyAddress),
                company_phone: safe(values.companyPhone),
                company_email: safe(values.companyEmail),
                company_abn: safe(values.companyABN),

                include_gst: state.gstEnabled,
                gst_percentage: num(state.gstPercentage),

                customer_name: safe(values.name),
                customer_address: safe(values.address),
                customer_phone: safe(values.phone),
                customer_abn: safe(values.abn),
                customer_license_no: safe(values.licenseNo),
                customer_rego_no: safe(values.regoNo),
                customer_dob: dobStr,
                customer_pay_id: safe(values.payId),
                
                bank_bsb: safe(values.bsb),
                bank_account_number: safe(values.accNo),
                
                notes: safe(values.paperNotes),

                items: state.itemsWithTotals
                    .filter(i => i.gross > 0 || (i.metal && i.metal.trim() !== ""))
                    .map(i => ({
                        metal: safe(i.metal),
                        notes: safe(i.notes),
                        gross: num(i.gross),
                        tare: num(i.tare),
                        price: num(i.price),
                        unit: safe(i.unit) || 'kg'
                    })),

                deductions: [
                    ...state.preGstDeductions.map(d => ({ type: "pre", label: safe(d.label), amount: num(d.amount) })),
                    ...state.postGstDeductions.map(d => ({ type: "post", label: safe(d.label), amount: num(d.amount) })),
                ]
            };

            // Send Beacon / Fetch with keepalive
            const API_URL = 'http://localhost:8000/api/dockets/saveDocket';
            
            fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true 
            }).catch((error) => {
                message.error('Auto-save failed.');
                console.error('Auto-save failed:', error);
            });
        };

        // Attach to Window Close
        window.addEventListener('beforeunload', performAutoSave);

        // Attach to Component Unmount (Back Button / Navigation)
        return () => {
            window.removeEventListener('beforeunload', performAutoSave);
            performAutoSave(); // Trigger on unmount
        };
    }, []); 

    // --- AUTOSAVE END ---
    
    // --- Handlers ---
    const addRow = (count = 1) => {
        const timestamp = Date.now(); 
        const newRows = Array.from({ length: count }, (_, index) => ({
            key: timestamp + index, metal: '', notes: '', gross: null, tare: null, net: 0, price: null, total: 0, unit: defaultUnit
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

    const handleSave = async () => {
        try {
            const values = await form.validateFields(); 
            await SaveDocket({
                scrdktID,
                status: "Saved", 
                values,
                items: itemsWithTotals.filter(item => item.gross > 0 || item.metal),
                totals: { grossTotal, gstAmount, finalTotal },
                deductions: { pre: preGstDeductions, post: postGstDeductions },
                includeGST: gstEnabled,
                gstPercentage,
                currency
            });
            message.success('Docket saved successfully!');
            if (mode === 'new') { resetDocket(); form.resetFields(); setDataSource(generateInitialRows(20, defaultUnit)); formValuesRef.current = {}; }
            else { navigate('/view-docket'); }
        } catch (error) { console.error(error); message.error('Failed to save docket.'); }
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
                gstPercentage,
                currency
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
                gstPercentage,
                currency
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
                       setCurrency('AUD');
                       formValuesRef.current = {};
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
        <div style={{ padding: '20px'}}>
            <Typography.Title style={{textAlign: 'center', marginTop: 20}} level={1}>
                {mode === 'new' ? 'Create New Docket' : mode === 'edit' ? 'Edit Docket' : 'View Invoice'}
            </Typography.Title>
            <NetWeightSummary items={itemsWithTotals} form={form} />
            {/* ADDED onValuesChange to keep ref sync'd for auto-save */}
            <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>
                <DocketHeader />
                <CustomerDetails />
                <DocketItemsTable 
                    items={itemsWithTotals} 
                    onItemChange={handleItemsChange} 
                    addRow={addRow}       
                    removeRow={removeRow} 
                    currency={currency}
                    setCurrency={setCurrency}
                    // Pass Options
                    currencyOptions={currencyOptions}
                    unitOptions={unitOptions}
                />

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
                        currency={currency}
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
                    <Button type="dashed"
                    onClick={
                        () => confirmReset(() => {
                            resetDocket();
                            form.resetFields();
                            setCurrency('AUD');
                            setDataSource(generateInitialRows(20, defaultUnit));
                            formValuesRef.current = {};
                        })
                    }>
                        Reset Form
                    </Button>
                </div>
            </Form>
        </div>
    );
}