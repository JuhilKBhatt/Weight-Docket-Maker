// src/components/settings/EmailConfigTab.jsx

import React from 'react';
import { Form, Select, Input, Row, Col, Card, Tag, Button, Typography, Divider } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Paragraph, Text } = Typography;

export default function EmailConfigTab({ form, emailProvider, setEmailProvider, onSave }) {
    return (
        <Form form={form} layout="vertical" onFinish={onSave}>
            <Card title="Email Server Configuration">
                <Row gutter={24}>
                    <Col span={12}>
                        <Form.Item label="Email Provider" name="email_provider">
                            <Select onChange={(val) => setEmailProvider(val)}>
                                <Option value="SMTP">SMTP (VentraIP / Gmail / Outlook)</Option>
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
                            <Input placeholder="info@safaricopperrecycling.com.au" />
                        </Form.Item>
                    </Col>
                </Row>

                {/* --- SMTP SECTION --- */}
                {emailProvider === 'SMTP' && (
                    <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 20, marginTop: 10 }}>
                        <Tag color="green" style={{ marginBottom: 15 }}>SMTP Configuration</Tag>
                        <Paragraph type="secondary" style={{ fontSize: '12px' }}>
                            Use this for standard email hosting (VentraIP, cPanel, Gmail, etc).
                        </Paragraph>
                        <Row gutter={24}>
                            <Col span={16}>
                                <Form.Item label="SMTP Host" name="smtp_host" rules={[{ required: true }]}>
                                    <Input placeholder="e.g. ventraip.email or smtp.gmail.com" />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Port" name="smtp_port" rules={[{ required: true }]}>
                                    <Input placeholder="465 (SSL) or 587 (TLS)" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="Username / Email" name="smtp_user" rules={[{ required: true }]}>
                                    <Input placeholder="info@safaricopperrecycling.com.au" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="Password" name="smtp_password" rules={[{ required: true }]}>
                                    <Input.Password />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>
                )}

                <Divider />
                
                <Tag color="cyan" style={{ marginBottom: 15 }}>Default Email Template</Tag>
                <div style={{ marginBottom: 15, padding: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
                    <Text strong style={{ fontSize: '12px' }}>Available Placeholders:</Text>
                    <div style={{ fontSize: '12px', marginTop: '5px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                        <Text code>{'{{number}}'}</Text> <Text type="secondary">- Invoice ID</Text>
                        <Text code>{'{{company_name}}'}</Text> <Text type="secondary">- Your Company Name</Text>
                        <Text code>{'{{company_address}}'}</Text> <Text type="secondary">- Your Address</Text>
                        <Text code>{'{{company_abn}}'}</Text> <Text type="secondary">- Your ABN</Text>
                        <Text code>{'{{company_phone}}'}</Text> <Text type="secondary">- Your Phone</Text>
                        <Text code>{'{{company_email}}'}</Text> <Text type="secondary">- Your Email</Text>
                    </div>
                </div>
                
                <Form.Item label="Default Subject" name="email_default_subject">
                    <Input placeholder="Invoice {{number}} from {{company_name}}" />
                </Form.Item>
                
                <Form.Item label="Default Body" name="email_default_body">
                    <Input.TextArea rows={6} placeholder="Hi,&#10;&#10;Please find attached invoice {{number}}.&#10;&#10;Regards,&#10;{{company_name}}&#10;{{company_address}}" />
                </Form.Item>

                <div style={{ textAlign: 'right', marginTop: 20 }}>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Save Email Settings</Button>
                </div>
            </Card>
        </Form>
    );
}