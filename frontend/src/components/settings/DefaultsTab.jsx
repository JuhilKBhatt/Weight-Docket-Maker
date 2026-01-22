// src/components/settings/DefaultsTab.jsx

import React from 'react';
import { Form, Select, InputNumber, Switch, Row, Col, Card, Button } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

const { Option } = Select;

export default function DefaultsTab({ form, currencies, units, selectors, onSave }) {
    return (
        <Form form={form} layout="vertical" onFinish={onSave}>
            <Row gutter={24}>
                <Col span={12}>
                    <Card title="Global Configuration" size="small">
                        <Form.Item label="Default Currency" name="default_currency">
                            <Select>
                                {currencies.map(c => <Option key={c.code} value={c.code}>{c.label}</Option>)}
                                <Option value="AUD">AUD (Fallback)</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item label="Default Unit" name="default_unit">
                            <Select>
                                {units.map(u => <Option key={u.value} value={u.value}>{u.label}</Option>)}
                                <Option value="kg">kg (Fallback)</Option>
                            </Select>
                        </Form.Item>
                        
                        {/* GST SETTINGS SPLIT */}
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item label="Default GST %" name="default_gst_percentage">
                                    <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item label="Default Docket GST Enabled" name="default_docket_gst_enabled" valuePropName="checked">
                                    <Switch />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="Default Invoice GST Enabled" name="default_invoice_gst_enabled" valuePropName="checked">
                                    <Switch />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="Default Entities" size="small">
                        <Form.Item label="Default 'Bill From' Company" name="default_bill_from">
                            <Select allowClear placeholder="Select Company">
                                {selectors.companies_from.map(c => (
                                    <Option key={c.id} value={c.id}>{c.name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item label="Default Bank Account" name="default_account">
                            <Select allowClear placeholder="Select Account">
                                {selectors.accounts.map(a => (
                                    <Option key={a.id} value={a.id}>{a.account_name} - {a.bank_name}</Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item label="Default Invoice Type" name="default_invoice_type">
                            <Select>
                                <Option value="Container">Container</Option>
                                <Option value="Pickup">Pickup / Drop Off</Option>
                                <Option value="Other">Other</Option>
                            </Select>
                        </Form.Item>
                    </Card>
                </Col>
            </Row>
            <div style={{ marginTop: 20, textAlign: 'right' }}>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Save Defaults</Button>
            </div>
        </Form>
    );
}