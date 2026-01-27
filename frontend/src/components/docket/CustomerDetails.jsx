// ./frontend/src/components/docket/CustomerDetails.jsx

import React, { useState, useRef } from 'react';
import { Card, Row, Col, Form, Input, DatePicker, AutoComplete, App } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import docketService from '../../services/docketService';

export default function CustomerDetails({ onCustomerSelect }) {
    const form = Form.useFormInstance(); 
    const { message } = App.useApp();
    
    // Separate Options State for each field
    const [nameOptions, setNameOptions] = useState([]);
    const [abnOptions, setAbnOptions] = useState([]);
    const [payIdOptions, setPayIdOptions] = useState([]);
    const [licOptions, setLicOptions] = useState([]);

    const searchTimeout = useRef(null);
    const dateFormat = ['DD/MM/YYYY', 'D/M/YYYY'];

    // Generic Search Handler
    const handleSearch = (type, setOptions) => (value) => {
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        if (!value) {
            setOptions([]);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            try {
                // Backend searches all fields for the query string
                const data = await docketService.getUniqueCustomers(value);
                
                const formattedOptions = data
                    .filter(item => {
                        // Filter specific fields
                        if (type === 'abn') return item.customer_details.abn;
                        if (type === 'payId') return item.customer_details.payId;
                        if (type === 'licenseNo') return item.customer_details.licenseNo;
                        return true; 
                    })
                    .map(item => {
                        const d = item.customer_details;
                        
                        let mainText = d.name;
                        let subText = `ABN: ${d.abn || 'N/A'}`;
                        let fillValue = d.name; // Default fill

                        if (type === 'abn') {
                            mainText = d.abn;
                            subText = d.name;
                            fillValue = d.abn;
                        } else if (type === 'payId') {
                            mainText = d.payId;
                            subText = d.name;
                            fillValue = d.payId;
                        } else if (type === 'licenseNo') {
                            mainText = d.licenseNo;
                            subText = d.name;
                            fillValue = d.licenseNo;
                        }

                        return {
                            value: fillValue, 
                            label: (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 'bold' }}>{mainText}</span>
                                    <span style={{ fontSize: '12px', color: '#888' }}>{subText}</span>
                                </div>
                            ),
                            customer_details: d
                        };
                    });

                setOptions(formattedOptions);
            } catch (error) {
                message.error("Failed to load customers");
                console.error("Failed to load customers", error);
            }
        }, 300);
    };

    // Auto-fill fields on selection
    const handleSelect = (setOptions) => (value, option) => {
        const details = option.customer_details;
        
        // Force update all fields
        form.setFieldsValue({
            name: details.name || "",
            licenseNo: details.licenseNo || "",
            regoNo: details.regoNo || "",
            dob: details.dob ? dayjs(details.dob) : null,
            payId: details.payId || "",
            phone: details.phone || "",
            bsb: details.bsb || "",
            accNo: details.accNo || "",
            abn: details.abn || "",
            address: details.address || "",
        });
        
        message.success("Customer details autofilled");
        
        // Clear options to reset dropdown state and prevent stale interactions
        setOptions([]);

        if (onCustomerSelect && details.name) {
            onCustomerSelect(details.name);
        }
    };

    return (
        <Card title="Customer Details" size="large" style={{ marginBottom: 20 }}>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item label="Name" name="name">
                        <AutoComplete
                            options={nameOptions}
                            onSearch={handleSearch('name', setNameOptions)}
                            onSelect={handleSelect(setNameOptions)}
                            placeholder="Search Name..."
                            maxLength={254} 
                        >
                            <Input suffix={<SearchOutlined />} />
                        </AutoComplete>
                    </Form.Item>
                </Col>
                <Col span={6}>
                    <Form.Item label="License No." name="licenseNo">
                        <AutoComplete
                            options={licOptions}
                            onSearch={handleSearch('licenseNo', setLicOptions)}
                            onSelect={handleSelect(setLicOptions)}
                            placeholder="Search License..."
                            maxLength={49}
                        >
                            <Input suffix={<SearchOutlined />} />
                        </AutoComplete>
                    </Form.Item>
                </Col>
                <Col span={6}>
                    <Form.Item label="Rego No." name="regoNo">
                        <Input maxLength={49} placeholder="Rego No." />
                    </Form.Item>
                </Col>
                
                <Col span={8}>
                    <Form.Item label="Date of Birth" name="dob">
                        <DatePicker format={dateFormat} style={{ width: '100%' }} />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item label="PayID" name="payId">
                        <AutoComplete
                            options={payIdOptions}
                            onSearch={handleSearch('payId', setPayIdOptions)}
                            onSelect={handleSelect(setPayIdOptions)}
                            placeholder="Search PayID..."
                            maxLength={99}
                        >
                            <Input suffix={<SearchOutlined />} />
                        </AutoComplete>
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item
                        label="Phone No."
                        name="phone"
                        getValueFromEvent={(e) => e.target.value.replaceAll(/\D/g, '')}
                    >
                        <Input maxLength={49} placeholder="Phone Number" />
                    </Form.Item>
                </Col>
                
                <Col span={4}>
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
                <Col span={4}>
                    <Form.Item
                        label="Account No."
                        name="accNo"
                        getValueFromEvent={(e) => e.target.value.replaceAll(/\D/g, '')}    
                    >
                        <Input maxLength={254} placeholder="Account No." />
                    </Form.Item>
                </Col>
                <Col span={6}>
                    <Form.Item
                        label="ABN"
                        name="abn"
                        rules={[
                            { len: 11, message: 'ABN must be 11 digits' } 
                        ]}
                    >
                        <AutoComplete
                            options={abnOptions}
                            onSearch={handleSearch('abn', setAbnOptions)}
                            onSelect={handleSelect(setAbnOptions)}
                            placeholder="Search ABN..."
                            maxLength={11}
                        >
                            <Input suffix={<SearchOutlined />} />
                        </AutoComplete>
                    </Form.Item>
                </Col>
                <Col span={10}>
                    <Form.Item label="Address" name="address">
                        <Input maxLength={254} placeholder="Address" />
                    </Form.Item>
                </Col>
            </Row>
        </Card>
    );
}