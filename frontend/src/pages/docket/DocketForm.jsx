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
import docketService from '../../services/docketService'; 
import '../../styles/Form.css'; 

const { Text } = Typography;

export default function DocketForm({ mode = 'new', existingDocket = null }) {
    const { message } = App.useApp(); 
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const confirmReset = useConfirmReset();
    
    const { savedCompaniesFrom } = useInvoiceSelectors();

    const [printing, setPrinting] = useState(false);
    const { scrdktID, resetDocket } = useDocketForm(mode, existingDocket);

    const [currencyOptions, setCurrencyOptions] = useState([]);
    const [unitOptions, setUnitOptions] = useState([]);
    const [defaultUnit, setDefaultUnit] = useState('kg');

    const [dataSource, setDataSource] = useState([]); 
    
    const [gstEnabled, setGstEnabled] = useState(false);
    const [gstPercentage, setGstPercentage] = useState(10);
    const [currency, setCurrency] = useState('AUD');
    
    const [preGstDeductions, setPreGstDeductions] = useState([]);
    const [postGstDeductions, setPostGstDeductions] = useState([]);

    const formValuesRef = useRef({});

    const handleValuesChange = (_, allValues) => {
        formValuesRef.current = allValues;
    };

    const generateInitialRows = (count, unit = 'kg') => {
        return Array.from({ length: count }, (_, index) => ({
            key: Date.now() + index, metal: '', notes: '', gross: null, tare: null, net: 0, price: null, total: 0, unit
        }));
    };

    // --- PRICE AUTOFILL LOGIC (New) ---
    const handleCustomerSelect = async (customerName) => {
        if (!customerName) return;
        
        const rowsToUpdate = dataSource.filter(item => item.metal && (!item.price || item.price === 0));
        
        if (rowsToUpdate.length === 0) return;

        message.loading({ content: "Fetching prices...", key: "pricing" });

        const updatedRows = await Promise.all(rowsToUpdate.map(async (row) => {
            try {
                const results = await docketService.getUniqueMetals(row.metal, customerName);
                const match = results.find(r => r.value.toLowerCase() === row.metal.toLowerCase());
                
                if (match && match.price > 0) {
                    return { ...row, price: match.price };
                }
            } catch (error) {
                console.error("Error autofilling price for", row.metal, error);
            }
            return row;
        }));

        setDataSource(prev => prev.map(prevRow => {
            const updated = updatedRows.find(u => u.key === prevRow.key);
            return updated || prevRow;
        }));
        
        const count = updatedRows.filter(r => r.price > 0 && r.price !== 0).length;
        if (count > 0) {
            message.success({ content: `Autofilled prices for ${count} items.`, key: "pricing" });
        } else {
            message.info({ content: "No price history found for these items.", key: "pricing" });
        }
    };

    useEffect(() => {
        if (scrdktID) {
            form.setFieldsValue({ docketNumber: scrdktID });
            formValuesRef.current = { ...form.getFieldsValue(), docketNumber: scrdktID };
        }
    }, [scrdktID, form]);

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

                if (mode === 'new') {
                    // DOCKET SPECIFIC DEFAULTS
                    const defCurrency = defaults.default_docket_currency || defaults.default_currency || 'AUD';
                    setCurrency(defCurrency);
                    
                    const defUnit = defaults.default_docket_unit || defaults.default_unit || 'kg';
                    setDefaultUnit(defUnit);

                    if (defaults.default_docket_gst_enabled) {
                        setGstEnabled(defaults.default_docket_gst_enabled === 'true');
                    }
                    
                    const defGstPct = Number(defaults.default_docket_gst_percentage) || Number(defaults.default_gst_percentage) || 10;
                    setGstPercentage(defGstPct);
                    
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

                    // Re-initialize rows with the new default unit
                    setDataSource(generateInitialRows(20, defUnit));
                    formValuesRef.current = form.getFieldsValue();
                }
            } catch (err) {
                console.error("Error loading settings", err);
            }
        }
        loadSettings();
    }, [mode, savedCompaniesFrom]); 

    useEffect(() => {
        if (mode === 'edit' && existingDocket) {
            message.info('Docket loaded for editing.', 0.8);
            setCurrency(existingDocket.currency || 'AUD');
            setGstEnabled(existingDocket.include_gst);
            setGstPercentage(existingDocket.gst_percentage);
            
            const items = existingDocket.items.map(i => ({
                key: i.key || i.id,
                metal: i.metal || '',
                notes: i.notes || '',
                gross: i.gross,
                tare: i.tare,
                net: (i.gross || 0) - (i.tare || 0),
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
            formValuesRef.current = initialValues;
        }
    }, [mode, existingDocket, form]);

    const { itemsWithTotals, grossTotal, gstAmount, finalTotal } = useDocketCalculations({
        items: dataSource,
        preGstDeductions,
        postGstDeductions,
        includeGST: gstEnabled,
        gstPercentage
    });

    // --- AUTOSAVE LOGIC ---
    const stateRef = useRef({ scrdktID, itemsWithTotals, preGstDeductions, postGstDeductions, gstEnabled, gstPercentage, currency });
    
    useEffect(() => { 
        stateRef.current = { scrdktID, itemsWithTotals, preGstDeductions, postGstDeductions, gstEnabled, gstPercentage, currency }; 
    }, [scrdktID, itemsWithTotals, preGstDeductions, postGstDeductions, gstEnabled, gstPercentage, currency]);

    useEffect(() => {
        const performAutoSave = () => {
            const state = stateRef.current;
            if (!state.scrdktID) return;

            const values = formValuesRef.current || {};
            const safe = (val) => val ?? "";
            const num = (val) => Number(val ?? 0);

            let dateStr = null;
            if (values.date) {
                 if (dayjs.isDayjs(values.date)) dateStr = values.date.format('YYYY-MM-DD');
                 else if (typeof values.date === 'string') dateStr = values.date.substring(0, 10);
            }
            
            let timeStr = null;
            if (values.time && dayjs.isDayjs(values.time)) timeStr = values.time.format('HH:mm a');

            let dobStr = null;
            if (values.dob && dayjs.isDayjs(values.dob)) dobStr = values.dob.format('YYYY-MM-DD');

            const payload = {
                scrdkt_number: state.scrdktID,
                docket_date: dateStr,
                docket_time: timeStr,
                status: "Draft", 
                is_saved: values.saveDocket ?? true,
                print_qty: num(values.printQty),
                docket_type: safe(values.docketType) || "Customer",
                currency: safe(state.currency) || "AUD",
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

            const API_URL = 'http://localhost:8000/api/dockets/saveDocket';
            fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true 
            }).catch((error) => {
                console.error('Auto-save failed:', error);
            });
        };

        window.addEventListener('beforeunload', performAutoSave);
        return () => {
            window.removeEventListener('beforeunload', performAutoSave);
            performAutoSave();
        };
    }, []); 

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
            
            // Get correct symbol from options
            const currentOption = currencyOptions.find(c => c.code === currency);
            const symbol = currentOption ? currentOption.symbol : '$';

            await SaveDocket({
                scrdktID,
                status: "Saved", 
                values,
                items: itemsWithTotals.filter(item => item.gross > 0 || item.metal),
                totals: { grossTotal, gstAmount, finalTotal },
                deductions: { pre: preGstDeductions, post: postGstDeductions },
                includeGST: gstEnabled,
                gstPercentage,
                currency,
                currencySymbol: symbol
            });
            message.success('Docket saved successfully!');
            if (mode === 'new') { resetDocket(); form.resetFields(); setDataSource(generateInitialRows(20, defaultUnit)); formValuesRef.current = {}; }
            else { navigate('/view-docket'); }
        } catch (error) { console.error(error); message.error('Failed to save docket.'); }
    };

    const handleDownload = async () => {
        try {
            const values = await form.validateFields();
            
            // Get correct symbol from options
            const currentOption = currencyOptions.find(c => c.code === currency);
            const symbol = currentOption ? currentOption.symbol : '$';

            const result = await SaveDocket({
                scrdktID,
                status: "Downloaded", 
                values,
                items: itemsWithTotals.filter(item => item.gross > 0 || item.metal),
                totals: { grossTotal, gstAmount, finalTotal },
                deductions: { pre: preGstDeductions, post: postGstDeductions },
                includeGST: gstEnabled,
                gstPercentage,
                currency,
                currencySymbol: symbol
            });

            await DownloadPDFDocket(result.id, scrdktID);
            message.success('Download initiated!');
        } catch (error) {
            console.error(error);
            message.error('Failed to download docket.');
        }
    };

    const handlePrint = async () => {
        setPrinting(true); 
        try {
            message.info('Preparing docket for printing...');
            const values = await form.validateFields();
            const qty = values.printQty || 1;

            // Get correct symbol from options
            const currentOption = currencyOptions.find(c => c.code === currency);
            const symbol = currentOption ? currentOption.symbol : '$';

            const result = await SaveDocket({
                scrdktID,
                status: "Printed", 
                values,
                items: itemsWithTotals.filter(item => item.gross > 0 || item.metal),
                totals: { grossTotal, gstAmount, finalTotal },
                deductions: { pre: preGstDeductions, post: postGstDeductions },
                includeGST: gstEnabled,
                gstPercentage,
                currency,
                currencySymbol: symbol
            });

            const printResponse = await PrintDocket(result.id, qty);
            const filename = printResponse.filename;

            if (!filename) {
                message.success(`Sent to printer (${qty} copies)`);
                setPrinting(false);
                return;
            }

            const maxRetries = 10; 
            let attempts = 0;
            
            message.info('Sending to printer, please wait...');
            const pollInterval = setInterval(async () => {
                attempts++;
                const status = await CheckPrintStatus(filename);

                if (status === 'completed') {
                    clearInterval(pollInterval);
                    setPrinting(false);
                    message.success(`Printing Started (${qty} copies)`);
                    
                    if (mode === 'new') {
                       resetDocket();
                       form.resetFields(); 
                       setCurrency('AUD');
                       setDataSource(generateInitialRows(20, defaultUnit));
                       formValuesRef.current = {};
                    } else {
                       navigate('/view-docket');
                    }
                } else if (attempts >= maxRetries) {
                    clearInterval(pollInterval);
                    setPrinting(false);
                    message.warning("Sent to queue, but printer script seems slow or offline.");
                }
            }, 1000); 

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
            <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>
                <DocketHeader />
                <CustomerDetails onCustomerSelect={handleCustomerSelect} />
                <DocketItemsTable 
                    items={itemsWithTotals} 
                    onItemChange={handleItemsChange} 
                    addRow={addRow}       
                    removeRow={removeRow} 
                    currency={currency}
                    setCurrency={setCurrency}
                    currencyOptions={currencyOptions}
                    unitOptions={unitOptions}
                />

                <Row gutter={24} style={{ marginTop: 20 }}>
                    <Col span={12}>
                        <Form.Item label="Docket Notes" name="paperNotes">
                            <Input.TextArea rows={4} maxLength={280} placeholder="Additional notes..." />
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
                        setCurrency={setCurrency}
                        currencySymbol={currencyOptions.find(c => c.code === currency)?.symbol || '$'} // Pass symbol
                    />
                </Row>
                <Divider />
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '30px' }}>
                    <Space>
                        <Form.Item name="saveDocket" valuePropName="checked" noStyle initialValue={true}>
                            <Checkbox style={{ fontSize: '24px', transform: 'scale(1.5)' }}>Save Docket?</Checkbox>
                        </Form.Item>
                    </Space>

                    <div style={{ width: '400px', borderBottom: '2px solid #f0f0f0' }}></div>

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
                            loading={printing}  
                            disabled={printing} 
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