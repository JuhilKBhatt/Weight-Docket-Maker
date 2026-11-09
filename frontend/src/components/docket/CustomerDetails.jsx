// ./frontend/src/components/docket/CustomerDetails.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Card, Row, Col, Form, Input, DatePicker, AutoComplete, Button, Tooltip, App } from 'antd';
import { SearchOutlined, IdcardOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import docketService from '../../services/docketService';
import IDScanModal from '../ocr/IDScanModal';

dayjs.extend(customParseFormat);

const CUSTOMER_STRING_FIELDS = [
    'name',
    'licenseNo',
    'regoNo',
    'payId',
    'phone',
    'bsb',
    'accNo',
    'abn',
    'address',
];

const parseCustomerDob = (dobVal) => {
    if (!dobVal) return null;
    if (dayjs.isDayjs(dobVal)) {
        return dobVal.isValid() ? dobVal : null;
    }
    const strictParsed = dayjs(dobVal, ['YYYY-MM-DD', 'DD/MM/YYYY', 'D/M/YYYY'], true);
    if (strictParsed.isValid()) return strictParsed;
    const fallbackParsed = dayjs(dobVal);
    return fallbackParsed.isValid() ? fallbackParsed : null;
};

const formatDobForSnapshot = (dobVal) => {
    const parsed = parseCustomerDob(dobVal);
    return parsed ? parsed.format('YYYY-MM-DD') : '';
};

const selectCustomerFields = (values = {}) => ({
    name: values?.name ?? '',
    licenseNo: values?.licenseNo ?? '',
    regoNo: values?.regoNo ?? '',
    dob: formatDobForSnapshot(values?.dob),
    payId: values?.payId ?? '',
    phone: values?.phone ?? '',
    bsb: values?.bsb ?? '',
    accNo: values?.accNo ?? '',
    abn: values?.abn ?? '',
    address: values?.address ?? '',
});

const isSameCustomerState = (a, b) => {
    if (!a || !b) return false;
    for (const field of CUSTOMER_STRING_FIELDS) {
        if ((a[field] ?? '') !== (b[field] ?? '')) return false;
    }
    return (a.dob ?? '') === (b.dob ?? '');
};

const isCustomerStateEmpty = (state) => {
    if (!state) return true;
    for (const field of CUSTOMER_STRING_FIELDS) {
        if (String(state[field] ?? '').trim() !== '') return false;
    }
    return String(state.dob ?? '').trim() === '';
};

const isFieldPopulated = (val) =>
    val !== undefined && val !== null && String(val).trim() !== '';

const copyTextToClipboard = async (text) => {
    if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
};

function DatePickerWithCopy({ value, onChange, format, onCopy, isCopied, ...rest }) {
    const parsedDob = parseCustomerDob(value);
    const populated = Boolean(parsedDob);

    return (
        <div className={`customer-dob-wrapper ${populated ? 'customer-input-with-addon' : 'customer-input-empty-addon'}`}>
            <DatePicker
                value={value}
                onChange={onChange}
                format={format}
                style={{ width: '100%' }}
                {...rest}
            />
            {populated && (
                <span className="ant-input-group-addon customer-dob-addon">
                    <Tooltip title={isCopied ? 'Copied!' : 'Copy Date of Birth'}>
                        <button
                            type="button"
                            className="customer-copy-addon-btn"
                            aria-label="Copy Date of Birth"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onCopy(parsedDob.format('DD/MM/YYYY'));
                            }}
                        >
                            {isCopied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                        </button>
                    </Tooltip>
                </span>
            )}
        </div>
    );
}

export default function CustomerDetails({ onCustomerSelect, onCustomerFieldsSync }) {
    const form = Form.useFormInstance();
    const { message } = App.useApp();

    // Separate Options State for each field
    const [nameOptions, setNameOptions] = useState([]);
    const [abnOptions, setAbnOptions] = useState([]);
    const [payIdOptions, setPayIdOptions] = useState([]);
    const [licOptions, setLicOptions] = useState([]);
    const [idScanOpen, setIdScanOpen] = useState(false);
    const [copiedField, setCopiedField] = useState(null);

    const searchTimeouts = useRef({});
    const copyTimeoutRef = useRef(null);
    const requestSeq = useRef({ name: 0, licenseNo: 0, payId: 0, abn: 0 });
    const dateFormat = ['DD/MM/YYYY', 'D/M/YYYY'];

    // Watch all Customer Details fields for copy button visibility & undo/redo history
    const watchedCustomerFields = Form.useWatch(selectCustomerFields, form);
    const currentFields = watchedCustomerFields || selectCustomerFields(form?.getFieldsValue?.() || {});

    // Undo / Redo history state for Customer Details fields
    const hasUserInteractedRef = useRef(false);
    const historyRef = useRef({
        stack: [selectCustomerFields(form?.getFieldsValue?.() || {})],
        index: 0,
        isRestoring: false,
    });

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);

    // Record field changes into undo/redo stack
    useEffect(() => {
        if (!watchedCustomerFields) return;
        const hist = historyRef.current;
        const currentTop = hist.stack[hist.index];

        if (hist.isRestoring) {
            if (isSameCustomerState(watchedCustomerFields, currentTop)) {
                hist.isRestoring = false;
            }
            return;
        }

        if (isSameCustomerState(watchedCustomerFields, currentTop)) {
            return;
        }

        // If initial values are loaded on mount (e.g. Edit Docket) before any user interaction,
        // set them as the baseline state so Undo returns to the loaded customer details.
        if (!hasUserInteractedRef.current && hist.stack.length === 1 && isCustomerStateEmpty(currentTop)) {
            hist.stack[0] = { ...watchedCustomerFields };
            hist.index = 0;
            return;
        }

        const nextStack = hist.stack.slice(0, hist.index + 1);
        nextStack.push({ ...watchedCustomerFields });
        if (nextStack.length > 200) {
            nextStack.shift();
        }
        hist.stack = nextStack;
        hist.index = nextStack.length - 1;
    }, [watchedCustomerFields]);

    const applyHistorySnapshot = (snapshot) => {
        if (!snapshot || !form) return;

        // Cancel any pending search timeouts/requests so stale dropdowns don't appear
        Object.keys(searchTimeouts.current).forEach((k) => {
            if (searchTimeouts.current[k]) {
                clearTimeout(searchTimeouts.current[k]);
            }
        });
        Object.keys(requestSeq.current).forEach((k) => {
            requestSeq.current[k] = (requestSeq.current[k] || 0) + 1;
        });
        setNameOptions([]);
        setLicOptions([]);
        setPayIdOptions([]);
        setAbnOptions([]);

        const restoredFields = {
            name: snapshot.name ?? '',
            licenseNo: snapshot.licenseNo ?? '',
            regoNo: snapshot.regoNo ?? '',
            dob: snapshot.dob ? parseCustomerDob(snapshot.dob) : null,
            payId: snapshot.payId ?? '',
            phone: snapshot.phone ?? '',
            bsb: snapshot.bsb ?? '',
            accNo: snapshot.accNo ?? '',
            abn: snapshot.abn ?? '',
            address: snapshot.address ?? '',
        };

        historyRef.current.isRestoring = true;
        form.setFieldsValue(restoredFields);
        if (onCustomerFieldsSync) {
            onCustomerFieldsSync({ ...form.getFieldsValue(), ...restoredFields });
        }
    };

    const flushLiveStateToHistory = () => {
        if (!form) return;
        const hist = historyRef.current;
        if (hist.isRestoring) return;
        const liveState = selectCustomerFields(form.getFieldsValue());
        const currentTop = hist.stack[hist.index];
        if (!isSameCustomerState(liveState, currentTop)) {
            const nextStack = hist.stack.slice(0, hist.index + 1);
            nextStack.push(liveState);
            hist.stack = nextStack;
            hist.index = nextStack.length - 1;
        }
    };

    const performUndo = () => {
        flushLiveStateToHistory();
        const hist = historyRef.current;
        if (hist.index <= 0) return;
        hist.index -= 1;
        applyHistorySnapshot(hist.stack[hist.index]);
    };

    const performRedo = () => {
        flushLiveStateToHistory();
        const hist = historyRef.current;
        if (hist.index >= hist.stack.length - 1) return;
        hist.index += 1;
        applyHistorySnapshot(hist.stack[hist.index]);
    };

    const handleKeyDownCapture = (e) => {
        hasUserInteractedRef.current = true;
        const isMod = e.metaKey || e.ctrlKey;
        if (!isMod || e.altKey) return;

        const key = (e.key || '').toLowerCase();
        if (key === 'z' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            performUndo();
        } else if ((key === 'z' && e.shiftKey) || (key === 'y' && !e.shiftKey)) {
            e.preventDefault();
            e.stopPropagation();
            performRedo();
        }
    };

    const handleBeforeInputCapture = (e) => {
        hasUserInteractedRef.current = true;
        const inputType = e.nativeEvent?.inputType;
        if (inputType === 'historyUndo') {
            e.preventDefault();
            performUndo();
        } else if (inputType === 'historyRedo') {
            e.preventDefault();
            performRedo();
        }
    };

    const handleCopyField = async (fieldKey, label, rawValue) => {
        const text = String(rawValue ?? '').trim();
        if (!text) return;
        try {
            await copyTextToClipboard(text);
            setCopiedField(fieldKey);
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
            copyTimeoutRef.current = setTimeout(() => {
                setCopiedField((prev) => (prev === fieldKey ? null : prev));
            }, 1500);
            message.success(`${label} copied to clipboard`);
        } catch (err) {
            console.error(`Failed to copy ${label}:`, err);
            message.error(`Failed to copy ${label}`);
        }
    };

    const getAddonProps = (fieldKey, label) => {
        const val = currentFields[fieldKey];
        const populated = isFieldPopulated(val);
        const isCopied = copiedField === fieldKey;

        return {
            className: populated ? 'customer-input-with-addon' : 'customer-input-empty-addon',
            addonAfter: populated ? (
                <Tooltip title={isCopied ? 'Copied!' : `Copy ${label}`}>
                    <button
                        type="button"
                        className="customer-copy-addon-btn"
                        aria-label={`Copy ${label}`}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCopyField(fieldKey, label, val);
                        }}
                    >
                        {isCopied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                    </button>
                </Tooltip>
            ) : (
                <span className="empty-addon-placeholder" />
            ),
        };
    };

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
        hasUserInteractedRef.current = true;

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
        hasUserInteractedRef.current = true;
        flushLiveStateToHistory();

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
        <div
            onFocusCapture={() => {
                hasUserInteractedRef.current = true;
            }}
            onKeyDownCapture={handleKeyDownCapture}
            onBeforeInputCapture={handleBeforeInputCapture}
        >
        <Card
            title="Customer Details"
            size="large"
            className="customer-details-card"
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
                        initialValue=""
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
                            <Input
                                type="text"
                                suffix={<SearchOutlined />}
                                {...getAddonProps('name', 'Name')}
                            />
                        </AutoComplete>
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        label="License No."
                        name="licenseNo"
                        initialValue=""
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
                            <Input
                                type="text"
                                suffix={<SearchOutlined />}
                                {...getAddonProps('licenseNo', 'License No.')}
                            />
                        </AutoComplete>
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item label="Rego No." name="regoNo" initialValue="">
                        <Input
                            maxLength={49}
                            placeholder="Rego No."
                            {...getAddonProps('regoNo', 'Rego No.')}
                        />
                    </Form.Item>
                </Col>
                
                <Col xs={24} md={12}>
                    <Form.Item label="Date of Birth" name="dob" initialValue={null}>
                        <DatePickerWithCopy
                            format={dateFormat}
                            isCopied={copiedField === 'dob'}
                            onCopy={(formattedDob) => handleCopyField('dob', 'Date of Birth', formattedDob)}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        label="PayID"
                        name="payId"
                        initialValue=""
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
                            <Input
                                type="text"
                                suffix={<SearchOutlined />}
                                {...getAddonProps('payId', 'PayID')}
                            />
                        </AutoComplete>
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        label="Phone No."
                        name="phone"
                        initialValue=""
                        getValueFromEvent={(e) => e.target.value.replaceAll(/\D/g, '')}
                    >
                        <Input
                            maxLength={49}
                            placeholder="Phone Number"
                            {...getAddonProps('phone', 'Phone No.')}
                        />
                    </Form.Item>
                </Col>
                
                <Col xs={24} md={12}>
                    <Form.Item
                        label="BSB"
                        name="bsb"
                        initialValue=""
                        rules={[
                            {len: 6, message: 'BSB Must be 6 digits' }
                        ]}
                        getValueFromEvent={(e) => e.target.value.replaceAll(/\D/g, '')}
                    >
                        <Input
                            maxLength={6}
                            placeholder="BSB"
                            {...getAddonProps('bsb', 'BSB')}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        label="Account No."
                        name="accNo"
                        initialValue=""
                        getValueFromEvent={(e) => e.target.value.replaceAll(/\D/g, '')}    
                    >
                        <Input
                            maxLength={254}
                            placeholder="Account No."
                            {...getAddonProps('accNo', 'Account No.')}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        label="ABN"
                        name="abn"
                        initialValue=""
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
                            maxLength={11}
                        >
                            <Input
                                type="text"
                                suffix={<SearchOutlined />}
                                {...getAddonProps('abn', 'ABN')}
                            />
                        </AutoComplete>
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item label="Address" name="address" initialValue="">
                        <Input
                            maxLength={254}
                            placeholder="Address"
                            {...getAddonProps('address', 'Address')}
                        />
                    </Form.Item>
                </Col>
            </Row>
        </Card>
        <IDScanModal
            open={idScanOpen}
            onCancel={() => setIdScanOpen(false)}
            onApplyCustomerId={handleApplyCustomerIdOcr}
        />
        </div>
    );
}
