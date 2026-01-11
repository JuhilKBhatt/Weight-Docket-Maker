// ./frontend/src/components/docket/CustomerDetails.jsx

import React from 'react';
import { Card, Row, Col, Form, Input, DatePicker, Select } from 'antd';
import {SearchOutlined} from '@ant-design/icons';

export default function CustomerDetails() {
    const dateFormat = ['DD/MM/YYYY', 'D/M/YYYY'];
    return (
        <Card title="Customer Details" size="large" style={{ marginBottom: 20 }}>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item label="Name" name="name">
                        <Input placeholder="Full Name" addonAfter={<SearchOutlined />} />
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