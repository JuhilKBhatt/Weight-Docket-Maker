// ./frontend/src/components/docket/CustomerDetails.jsx

import React, { useState, useRef } from 'react';
import { Card, Row, Col, Form, Input, DatePicker, AutoComplete, Button, App } from 'antd';
import { SearchOutlined, IdcardOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import docketService from '../../services/docketService';
import IDScanModal from '../ocr/IDScanModal';

dayjs.extend(customParseFormat);

export default function CustomerDetails({ onCustomerSelect, onCustomerFieldsSync }) {
    const form = Form.useFormInstance(); 
    const { message } = App.useApp();
    
    // Separate Options State for each field
    const [nameOptions, setNameOptions] = useState([]);
    const [abnOptions, setAbnOptions] = useState([]);
    const [payIdOptions, setPayIdOptions] = useState([]);
    const [licOptions, setLicOptions] = useState([]);
    const [idScanOpen, setIdScanOpen] = useState(false);

    const searchTimeouts = useRef({});
    const requestSeq = useRef({ name: 0, licenseNo: 0, payId: 0, abn: 0 });
    const dateFormat = ['DD/MM/YYYY', 'D/M/YYYY'];

    const stripOptionSuffix = (val) => {
        const raw = typeof val === 'string' ? val : (val?.target?.value ?? '');
        return typeof raw === 'string' ? raw.split('__#')[0] : '';
    };

    const matchesFieldQuery = (fieldVal, query, isCodeField = false) => {
        if (!fieldVal) return false;
        if (!query) return true;
        const rawField = String(fieldVal).trim().toLowerCase();
        const rawQuery = String(query).trim().toLowerCase();
        if (rawField.includes(rawQuery)) return true;
        if (isCodeField) {
            const compactField = rawField.replace(/[\s-]+/g, '');
            const compactQuery = rawQuery.replace(/[\s-]+/g, '');
            return compactQuery.length > 0 && compactField.includes(compactQuery);
        }
        return false;
    };

    const parseCustomerDob = (dobVal) => {
        if (!dobVal) return null;
        const strictParsed = dayjs(dobVal, ['YYYY-MM-DD', 'DD/MM/YYYY', 'D/M/YYYY'], true);
        if (strictParsed.isValid()) return strictParsed;
        const fallbackParsed = dayjs(dobVal);
        return fallbackParsed.isValid() ? fallbackParsed : null;
    };

    // Generic Search Handler (isolated per field to prevent race conditions and cross-field false positives)
    const handleSearch = (type, setOptions) => (rawValue) => {
        const value = stripOptionSuffix(rawValue);

        if (searchTimeouts.current[type]) {
            clearTimeout(searchTimeouts.current[type]);
        }

        // Increment request sequence so any in-flight older request for this field is ignored
        const currentSeq = (requestSeq.current[type] || 0) + 1;
        requestSeq.current[type] = currentSeq;

        if (!value || !value.trim()) {
            setOptions([]);
            return;
        }

        searchTimeouts.current[type] = setTimeout(async () => {
            try {
                const data = await docketService.getUniqueCustomers(value.trim(), type);

                // Ignore stale responses if the user typed again or already selected an option
                if (requestSeq.current[type] !== currentSeq) {
                    return;
                }

                const formattedOptions = data
                    .filter((item) => {
                        const d = item?.customer_details || {};
                        if (type === 'abn') return matchesFieldQuery(d.abn, value, true);
                        if (type === 'payId') return matchesFieldQuery(d.payId, value, true);
                        if (type === 'licenseNo') return matchesFieldQuery(d.licenseNo, value, true);
                        return matchesFieldQuery(d.name, value, false);
                    })
                    .map((item, idx) => {
                        const d = item.customer_details || {};

                        let mainText = d.name || 'Unnamed Customer';
                        const metaParts = [];
                        if (d.licenseNo) metaParts.push(`Lic: ${d.licenseNo}`);
                        if (d.payId) metaParts.push(`PayID: ${d.payId}`);
                        if (d.abn) metaParts.push(`ABN: ${d.abn}`);
                        let subText = metaParts.length > 0 ? metaParts.join(' • ') : 'No ID / PayID / ABN on file';
                        let fillValue = d.name || '';

                        if (type === 'abn') {
                            mainText = d.abn;
                            subText = [d.name || 'Unnamed', d.payId ? `PayID: ${d.payId}` : null, d.licenseNo ? `Lic: ${d.licenseNo}` : null]
                                .filter(Boolean)
                                .join(' • ');
                            fillValue = d.abn;
                        } else if (type === 'payId') {
                            mainText = d.payId;
                            subText = [d.name || 'Unnamed', d.licenseNo ? `Lic: ${d.licenseNo}` : null, d.phone ? `Ph: ${d.phone}` : null]
                                .filter(Boolean)
                                .join(' • ');
                            fillValue = d.payId;
                        } else if (type === 'licenseNo') {
                            mainText = d.licenseNo;
                            subText = [d.name || 'Unnamed', d.payId ? `PayID: ${d.payId}` : null, d.phone ? `Ph: ${d.phone}` : null]
                                .filter(Boolean)
                                .join(' • ');
                            fillValue = d.licenseNo;
                        }

                        return {
                            // Unique value per option prevents Ant Design AutoComplete (rc-select)
                            // from selecting the wrong option when two customers share a PayID, ABN, or Name
                            value: `${fillValue}__#${idx}`,
                            fillValue,
                            label: (
                                <div style={{ display: 'flex', flexDirection: 'column', padding: '2px 0' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#000' }}>{mainText}</span>
                                    <span style={{ fontSize: '13px', color: '#666' }}>{subText}</span>
                                </div>
                            ),
                            customer_details: d,
                        };
                    });

                setOptions(formattedOptions);
            } catch (error) {
                if (requestSeq.current[type] === currentSeq) {
                    message.error('Failed to load customers');
                    console.error('Failed to load customers', error);
                }
            }
        }, 250);
    };

    // Auto-fill all customer fields on selection
    const handleSelect = (type, setOptions) => (value, option) => {
        // Cancel any pending search timeouts/requests across all customer fields
        Object.keys(searchTimeouts.current).forEach((k) => {
            if (searchTimeouts.current[k]) {
                clearTimeout(searchTimeouts.current[k]);
            }
        });
        Object.keys(requestSeq.current).forEach((k) => {
            requestSeq.current[k] = (requestSeq.current[k] || 0) + 1;
        });

        const details = option?.customer_details || {};

        const updatedFields = {
            name: details.name || '',
            licenseNo: details.licenseNo || '',
            regoNo: details.regoNo || '',
            dob: parseCustomerDob(details.dob),
            payId: details.payId || '',
            phone: details.phone || '',
            bsb: details.bsb || '',
            accNo: details.accNo || '',
            abn: details.abn || '',
            address: details.address || '',
        };

        const applyFields = () => {
            form.setFieldsValue(updatedFields);
            if (onCustomerFieldsSync) {
                onCustomerFieldsSync({ ...form.getFieldsValue(), ...updatedFields });
            }
        };

        // Apply immediately and on next microtask so AutoComplete's internal onChange never overwrites a field
        applyFields();
        Promise.resolve().then(applyFields);

        message.success('Customer details autofilled');

        // Clear all dropdown option lists to reset state
        setOptions([]);
        setNameOptions([]);
        setLicOptions([]);
        setPayIdOptions([]);
        setAbnOptions([]);

        if (onCustomerSelect && details.name) {
            onCustomerSelect(details.name);
        }
    };

    const handleApplyCustomerIdOcr = async (idData) => {
        const parsedDob = parseCustomerDob(idData.dob);

        const updates = {};
        if (idData.name) updates.name = idData.name;
        if (idData.license_number) updates.licenseNo = idData.license_number;
        if (parsedDob) updates.dob = parsedDob;
        if (idData.address) updates.address = idData.address;

        // Also check if this customer already has PayID / Phone / BSB / Account / ABN in the database
        try {
            let matches = [];
            if (idData.license_number) {
                matches = await docketService.getUniqueCustomers(idData.license_number, 'licenseNo');
            }
            if ((!matches || matches.length === 0) && idData.name) {
                matches = await docketService.getUniqueCustomers(idData.name, 'name');
            }
            const existing = matches?.[0]?.customer_details;
            if (existing) {
                const currentVals = form.getFieldsValue();
                if (!currentVals.payId && existing.payId) updates.payId = existing.payId;
                if (!currentVals.phone && existing.phone) updates.phone = existing.phone;
                if (!currentVals.bsb && existing.bsb) updates.bsb = existing.bsb;
                if (!currentVals.accNo && existing.accNo) updates.accNo = existing.accNo;
                if (!currentVals.abn && existing.abn) updates.abn = existing.abn;
                if (!currentVals.regoNo && existing.regoNo) updates.regoNo = existing.regoNo;
            }
        } catch (err) {
            console.error('Could not backfill historical customer details after ID OCR:', err);
        }

        form.setFieldsValue(updates);
        if (onCustomerFieldsSync) {
            onCustomerFieldsSync({ ...form.getFieldsValue(), ...updates });
        }

        message.success('Customer ID details populated from OCR!');
        if (onCustomerSelect && idData.name) {
            onCustomerSelect(idData.name);
        }
    };

    return (
        <>
        <Card
            title="Customer Details"
            size="large"
            style={{ marginBottom: 20 }}
            extra={
                <Button
                    type="primary"
                    icon={<IdcardOutlined />}
                    onClick={() => setIdScanOpen(true)}
                    style={{ backgroundColor: '#1677ff', fontWeight: 600 }}
                >
                    Scan Customer ID / Licence
                </Button>
            }
        >
            <Row gutter={16}>
                <Col xs={24} md={12}>
                    <Form.Item
                        label="Name"
                        name="name"
                        getValueFromEvent={stripOptionSuffix}
                    >
                        <AutoComplete
                            options={nameOptions}
                            filterOption={false}
                            onSearch={handleSearch('name', setNameOptions)}
                            onSelect={handleSelect('name', setNameOptions)}
                            placeholder="Search Name..."
                            maxLength={254} 
                        >
                            <Input suffix={<SearchOutlined />} />
                        </AutoComplete>
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        label="License No."
                        name="licenseNo"
                        getValueFromEvent={stripOptionSuffix}
                    >
                        <AutoComplete
                            options={licOptions}
                            filterOption={false}
                            onSearch={handleSearch('licenseNo', setLicOptions)}
                            onSelect={handleSelect('licenseNo', setLicOptions)}
                            placeholder="Search License..."
                            maxLength={49}
                        >
                            <Input suffix={<SearchOutlined />} />
                        </AutoComplete>
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item label="Rego No." name="regoNo">
                        <Input maxLength={49} placeholder="Rego No." />
                    </Form.Item>
                </Col>
                
                <Col xs={24} md={12}>
                    <Form.Item label="Date of Birth" name="dob">
                        <DatePicker format={dateFormat} style={{ width: '100%' }} />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        label="PayID"
                        name="payId"
                        getValueFromEvent={stripOptionSuffix}
                    >
                        <AutoComplete
                            options={payIdOptions}
                            filterOption={false}
                            onSearch={handleSearch('payId', setPayIdOptions)}
                            onSelect={handleSelect('payId', setPayIdOptions)}
                            placeholder="Search PayID..."
                            maxLength={99}
                        >
                            <Input suffix={<SearchOutlined />} />
                        </AutoComplete>
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        label="Phone No."
                        name="phone"
                        getValueFromEvent={(e) => e.target.value.replaceAll(/\D/g, '')}
                    >
                        <Input maxLength={49} placeholder="Phone Number" />
                    </Form.Item>
                </Col>
                
                <Col xs={24} md={12}>
                    <Form.Item
                        label="BSB"
                        name="bsb"
                        rules={[
                            {len: 6, message: 'BSB Must be 6 digits' }
                        ]}
                        getValueFromEvent={(e) => e.target.value.replaceAll(/\D/g, '')}
                    >
                        <Input maxLength={6} placeholder="BSB" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        label="Account No."
                        name="accNo"
                        getValueFromEvent={(e) => e.target.value.replaceAll(/\D/g, '')}    
                    >
                        <Input maxLength={254} placeholder="Account No." />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        label="ABN"
                        name="abn"
                        getValueFromEvent={stripOptionSuffix}
                        rules={[
                            { len: 11, message: 'ABN must be 11 digits' } 
                        ]}
                    >
                        <AutoComplete
                            options={abnOptions}
                            filterOption={false}
                            onSearch={handleSearch('abn', setAbnOptions)}
                            onSelect={handleSelect('abn', setAbnOptions)}
                            placeholder="Search ABN..."
                        >
                            <Input maxLength={11} suffix={<SearchOutlined />} />
                        </AutoComplete>
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item label="Address" name="address">
                        <Input maxLength={254} placeholder="Address" />
                    </Form.Item>
                </Col>
            </Row>
        </Card>
        <IDScanModal
            open={idScanOpen}
            onCancel={() => setIdScanOpen(false)}
            onApplyCustomerId={handleApplyCustomerIdOcr}
        />
        </>
    );
}