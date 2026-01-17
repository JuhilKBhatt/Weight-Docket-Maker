// ./frontend/src/components/docket/CustomerDetails.jsx

import React, { useState, useRef } from 'react'; // Removed useEffect
import { Card, Row, Col, Form, Input, DatePicker, AutoComplete, App } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import docketService from '../../services/docketService';

export default function CustomerDetails() {
    const form = Form.useFormInstance(); 
    const [options, setOptions] = useState([]);
    const { message } = App.useApp();
    
    // Ref for debounce timer
    const searchTimeout = useRef(null);

    const dateFormat = ['DD/MM/YYYY', 'D/M/YYYY'];

    // Updated Search Handler with Debounce
    const handleSearch = (value) => {
        // Clear existing timeout
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        // Only search if value exists
        if (!value) {
            setOptions([]);
            return;
        }

        // Set new timeout (300ms delay)
        searchTimeout.current = setTimeout(async () => {
            try {
                const data = await docketService.getUniqueCustomers(value);
                setOptions(data);
            } catch (error) {
                message.error("Failed to load customers");
                console.error("Failed to load customers", error);
            }
        }, 300);
    };

    // Auto-fill fields on selection
    const handleSelect = (value, option) => {
        const details = option.customer_details;
        
        form.setFieldsValue({
            name: details.name,
            licenseNo: details.licenseNo,
            regoNo: details.regoNo,
            dob: details.dob ? dayjs(details.dob) : null,
            payId: details.payId,
            phone: details.phone,
            bsb: details.bsb,
            accNo: details.accNo,
            abn: details.abn,
            address: details.address,
        });
        
        message.success("Customer details autofilled");
    };

    return (
        <Card title="Customer Details" size="large" style={{ marginBottom: 20 }}>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item label="Name" name="name">
                        <AutoComplete
                            options={options}
                            onSearch={handleSearch}
                            onSelect={handleSelect}
                            placeholder="Type to search..."
                        >
                            <Input suffix={<SearchOutlined />} />
                        </AutoComplete>
                    </Form.Item>
                </Col>
                <Col span={6}>
                    <Form.Item label="License No." name="licenseNo">
                        <Input placeholder="License No." />
                    </Form.Item>
                </Col>
                <Col span={6}>
                    <Form.Item label="Rego No." name="regoNo">
                        <Input placeholder="Rego No." />
                    </Form.Item>
                </Col>
                
                <Col span={8}>
                    <Form.Item label="Date of Birth" name="dob">
                        <DatePicker format={dateFormat} style={{ width: '100%' }} />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item label="PayID" name="payId">
                        <Input placeholder="PayID" />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item
                        label="Phone No."
                        name="phone"
                        getValueFromEvent={(e) => e.target.value.replaceAll(/\D/g, '')}
                    >
                        <Input placeholder="Phone Number" />
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
                        <Input placeholder="Account No." />
                    </Form.Item>
                </Col>
                <Col span={6}>
                    <Form.Item
                        label="ABN"
                        name="abn"
                        rules={[
                            { len: 11, message: 'ABN must be 11 digits' } 
                        ]}
                        getValueFromEvent={(e) => e.target.value.replaceAll(/\D/g, '')}
                    >
                        <Input maxLength={11} placeholder="ABN" />
                    </Form.Item>
                </Col>
                <Col span={10}>
                    <Form.Item label="Address" name="address">
                        <Input placeholder="Address" />
                    </Form.Item>
                </Col>
            </Row>
        </Card>
    );
}