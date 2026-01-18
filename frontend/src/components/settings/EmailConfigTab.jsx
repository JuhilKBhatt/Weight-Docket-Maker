// src/components/settings/EmailConfigTab.jsx

import React from 'react';
import { Form, Select, Input, Row, Col, Card, Tag, Button, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Paragraph } = Typography;

export default function EmailConfigTab({ form, emailProvider, setEmailProvider, onSave }) {
    return (
        <Form form={form} layout="vertical" onFinish={onSave}>
            <Card title="Email Server Configuration">
                <Row gutter={24}>
                    <Col span={12}>
                        <Form.Item label="Email Provider" name="email_provider">
                            <Select onChange={(val) => setEmailProvider(val)}>
                                <Option value="Axigen">Axigen Mail Server (REST API)</Option>
                                <Option value="Gmail">Gmail (SMTP)</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item 
                            label="Sender Email Address (From)" 
                            name="email_from_address" 
                            help="Emails will appear to come from this address"
                            rules={[{ required: true, message: 'Required' }]}
                        >
                            <Input placeholder="accounts@yourdomain.com" />
                        </Form.Item>
                    </Col>
                </Row>

                {emailProvider === 'Axigen' && (
                    <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 20, marginTop: 10 }}>
                        <Tag color="blue" style={{ marginBottom: 15 }}>Axigen Configuration</Tag>
                        <Row gutter={24}>
                            <Col span={24}>
                                <Form.Item label="API URL" name="axigen_api_url" rules={[{ required: true }]}>
                                    <Input placeholder="https://mail.myserver.com" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="Username" name="axigen_user" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="Password" name="axigen_password" rules={[{ required: true }]}>
                                    <Input.Password />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>
                )}

                {emailProvider === 'Gmail' && (
                    <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 20, marginTop: 10 }}>
                        <Tag color="orange" style={{ marginBottom: 15 }}>Gmail Configuration</Tag>
                        <Paragraph type="secondary" style={{ fontSize: '12px' }}>
                            Note: You must generate an <strong>App Password</strong> in your Google Account settings to use this feature. 
                            Normal passwords will not work.
                        </Paragraph>
                        <Row gutter={24}>
                            <Col span={12}>
                                <Form.Item label="Gmail Address" name="gmail_user">
                                    <Input placeholder="your.name@gmail.com" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="App Password" name="gmail_app_password">
                                    <Input.Password placeholder="xxxx xxxx xxxx xxxx" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>
                )}

                <div style={{ textAlign: 'right', marginTop: 20 }}>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Save Email Settings</Button>
                </div>
            </Card>
        </Form>
    );
}