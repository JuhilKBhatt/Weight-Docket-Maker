// ./frontend/src/components/docket/CustomerDetails.jsx

import React from 'react';
import { Card, Row, Col, Form, Input, DatePicker } from 'antd';

export default function CustomerDetails({ dateFormat = 'DD/MM/YYYY' }) {
    return (
        <Card title="Customer Details" size="small" style={{ marginBottom: 20 }}>
            <Row gutter={16}>
                <Col span={8}>
                    <Form.Item label="Name" name="name">
                        <Input placeholder="Full Name" />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item label="License No." name="licenseNo">
                        <Input placeholder="License No." />
                    </Form.Item>
                </Col>
                <Col span={8}>
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
                    <Form.Item label="Phone No." name="phone">
                        <Input placeholder="Phone Number" />
                    </Form.Item>
                </Col>
                
                <Col span={6}>
                    <Form.Item label="BSB" name="bsb">
                        <Input placeholder="BSB" />
                    </Form.Item>
                </Col>
                <Col span={6}>
                    <Form.Item label="Account No." name="accNo">
                        <Input placeholder="Account No." />
                    </Form.Item>
                </Col>
                <Col span={6}>
                    <Form.Item label="ABN" name="abn">
                        <Input placeholder="ABN" />
                    </Form.Item>
                </Col>
                <Col span={6}>
                    <Form.Item label="Address" name="address">
                        <Input placeholder="Address" />
                    </Form.Item>
                </Col>
            </Row>
        </Card>
    );
}