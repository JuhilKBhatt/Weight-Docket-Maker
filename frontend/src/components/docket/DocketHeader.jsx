// ./frontend/src/components/docket/DocketHeader.jsx

import React from 'react';
import { Card, Row, Col, Space, Form, Select, Typography, Input, DatePicker } from 'antd';

const { Title } = Typography;
const { Option } = Select;

export default function DocketHeader() {
    const dateFormat = 'DD/MM/YYYY';

    return (
        <Card style={{ marginBottom: 20 }}>
            <Row justify="space-between" align="middle">
                
                {/* LEFT SIDE */}
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

                {/* RIGHT SIDE */}
                <Col>
                    <Space direction="vertical" align="end" size={0}>
                        <Space align="center" style={{ marginBottom: 8 }}>
                            <Title level={4} style={{ margin: 0 }}>Company:</Title>
                            <Form.Item name="companyDetails" noStyle>
                                <Select size="large" style={{ width: 300 }} placeholder="Select Company">
                                    <Option value="company1">Example Company A</Option>
                                    <Option value="company2">Example Company B</Option>
                                </Select>
                            </Form.Item>
                        </Space>

                        <Space align="center">
                            <Title level={4} style={{ margin: 0 }}>Docket #:</Title>
                            <Form.Item name="docketNumber" noStyle>
                                <Input size="large" readOnly style={{ width: 200, fontWeight: 'bold' }} placeholder="#" />
                            </Form.Item>
                        </Space>

                        <Space align="center">
                            <Title level={4} style={{ margin: 0 }}>Date :</Title>
                            <Form.Item name="date" noStyle>
                                <DatePicker size="large" format={dateFormat} style={{ width: 200 }} />
                            </Form.Item>
                        </Space>
                    </Space>
                </Col> 
            </Row>
        </Card>
    );
}