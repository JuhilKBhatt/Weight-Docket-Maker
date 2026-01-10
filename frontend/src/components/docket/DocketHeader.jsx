// ./frontend/src/components/docket/CustomerInfo.jsx

import React from 'react';
import { Card, Row, Col, Space, Form, Select, Typography, InputNumber } from 'antd';

const { Title } = Typography;
const { Option } = Select;

export default function DocketHeader() {
    return (
        <Card style={{ marginBottom: 20 }}>
            <Row justify="space-between" align="middle">
                
                {/* LEFT SIDE: Docket Type + Title */}
                <Col>
                    <Space size="middle">
                        <Form.Item name="docketType" initialValue="Customer" noStyle>
                            <Select size="large" style={{ width: 180, fontSize: '18px' }}>
                                <Option value="Customer">Customer</Option>
                                <Option value="Weight">Weight</Option>
                            </Select>
                        </Form.Item>
                        <Title level={1} style={{ margin: 0 }}>Docket</Title>
                    </Space>
                </Col>

                {/* RIGHT SIDE: Company + Docket # */}
                <Col>
                    <Space direction="vertical" align="end" size={0}>
                        {/* Top: Company Selector */}
                        <Space align="center" style={{ marginBottom: 8 }}>
                            <Title level={4} style={{ margin: 0 }}>Company:</Title>
                            <Form.Item name="companyDetails" noStyle>
                                <Select size="large" style={{ width: 300 }} placeholder="Select Company">
                                    <Option value="company1">Example Company A</Option>
                                    <Option value="company2">Example Company B</Option>
                                </Select>
                            </Form.Item>
                        </Space>

                        {/* Bottom: Docket Number */}
                        <Space align="center">
                            <Title level={4} style={{ margin: 0 }}>Docket #:</Title>
                            <Form.Item name="docketNumber" noStyle>
                                <InputNumber size="large" readOnly style={{ width: 150 }} placeholder="#" />
                            </Form.Item>
                        </Space>
                    </Space>
                </Col> 
            </Row>
        </Card>
    );
}