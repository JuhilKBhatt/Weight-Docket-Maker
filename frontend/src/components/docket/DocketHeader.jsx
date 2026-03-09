// ./frontend/src/components/docket/DocketHeader.jsx

import React from 'react';
import { Card, Row, Col, Space, Form, Select, Typography, Input, DatePicker, TimePicker } from 'antd';
import dayjs from 'dayjs';
import useInvoiceSelectors from '../../hooks/invoice/useInvoiceSelectors';

const { Title } = Typography;
const { Option } = Select;

export default function DocketHeader() {
    const dateFormat = 'DD/MM/YYYY';
    const timeFormat = 'hh:mm a';
    
    // 1. Fetch saved "Bill From" companies
    const { savedCompaniesFrom } = useInvoiceSelectors();
    const form = Form.useFormInstance();

    // 2. Handle selection
    const handleCompanyChange = (value) => {
        const selectedCompany = savedCompaniesFrom.find(c => c.name === value);
        
        if (selectedCompany) {
            form.setFieldsValue({
                companyAddress: selectedCompany.address,
                companyPhone: selectedCompany.phone,
                companyEmail: selectedCompany.email,
                companyABN: selectedCompany.abn
            });
        } else {
            form.setFieldsValue({
                companyAddress: '',
                companyPhone: '',
                companyEmail: '',
                companyABN: ''
            });
        }
    };

    return (
        <Card style={{ marginBottom: 20 }}>
            {/* Added gutter so they space out when stacked on mobile */}
            <Row justify="space-between" align="middle" gutter={[16, 16]}>
                
                {/* LEFT SIDE - Takes 100% width on mobile (xs=24) */}
                <Col xs={24} md={12}>
                    <Space size="middle" className="docket-header-left">
                        <Form.Item name="docketType" initialValue="Customer" noStyle>
                            <Select className="docket-type-select" size="large" style={{ width: 180, fontSize: '22px' }}>
                                <Option value="Customer">Customer</Option>
                                <Option value="Weight">Weight</Option>
                            </Select>
                        </Form.Item>
                        <Title level={1} style={{ margin: 0 }}>Docket</Title>
                    </Space>
                </Col>

                {/* RIGHT SIDE - Takes 100% width on mobile (xs=24) */}
                <Col xs={24} md={12} className="docket-header-right">
                    <Space direction="vertical" align="end" size={0} style={{ width: '100%' }}>
                        <Space align="center" style={{ marginBottom: 8 }} className="header-field-row">
                            <Title level={4} style={{ margin: 0 }} className="header-label">Company:</Title>
                            
                            <Form.Item name="companyAddress" hidden><Input /></Form.Item>
                            <Form.Item name="companyPhone" hidden><Input /></Form.Item>
                            <Form.Item name="companyEmail" hidden><Input /></Form.Item>
                            <Form.Item name="companyABN" hidden><Input /></Form.Item>

                            <Form.Item name="companyDetails" noStyle>
                                <Select 
                                    size="large" 
                                    style={{ width: 300 }} 
                                    placeholder="Select Company"
                                    onChange={handleCompanyChange}
                                    showSearch
                                    className="header-input"
                                >
                                    {savedCompaniesFrom.map((c, idx) => (
                                        <Option key={idx} value={c.name}>{c.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Space>

                        <Space align="center" className="header-field-row">
                            <Title level={4} style={{ margin: 0 }} className="header-label">Docket #:</Title>
                            <Form.Item name="docketNumber" noStyle>
                                <Input size="large" readOnly style={{ width: 200, fontWeight: 'bold' }} placeholder="#" className="header-input" />
                            </Form.Item>
                        </Space>

                        <Space align="center" className="header-field-row">
                            <Title level={4} style={{ margin: 0 }} className="header-label">Date :</Title>
                            <Form.Item name="date" initialValue={dayjs()} noStyle>
                                <DatePicker size="large" format={dateFormat} style={{ width: 200 }} className="header-input" />
                            </Form.Item>
                        </Space>
                        
                        <Space align="center" className="header-field-row">
                            <Title level={4} style={{ margin: 0 }} className="header-label">Time :</Title>
                            <Form.Item name="time" initialValue={dayjs()} noStyle>
                                <TimePicker size="large" format={timeFormat} needConfirm={false} style={{ width: 200 }} className="header-input" />
                            </Form.Item>
                        </Space>
                    </Space>
                </Col> 
            </Row>
        </Card>
    );
}