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
        // Find the full company object based on the name selected
        const selectedCompany = savedCompaniesFrom.find(c => c.name === value);
        
        if (selectedCompany) {
            // Populate hidden fields
            form.setFieldsValue({
                companyAddress: selectedCompany.address,
                companyPhone: selectedCompany.phone,
                companyEmail: selectedCompany.email,
                companyABN: selectedCompany.abn
            });
        } else {
            // Clear if cleared
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
                            
                            {/* Hidden fields to store the details for saving */}
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
                                >
                                    {savedCompaniesFrom.map((c, idx) => (
                                        <Option key={idx} value={c.name}>{c.name}</Option>
                                    ))}
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
                            <Form.Item name="date" initialValue={dayjs()} noStyle>
                                <DatePicker size="large" format={dateFormat} style={{ width: 200 }} />
                            </Form.Item>
                        </Space>
                        
                        <Space align="center">
                            <Title level={4} style={{ margin: 0 }}>Time :</Title>
                            <Form.Item name="time" initialValue={dayjs()} noStyle>
                                <TimePicker size="large" format={timeFormat} needConfirm={false} style={{ width: 200 }} />
                            </Form.Item>
                        </Space>
                    </Space>
                </Col> 
            </Row>
        </Card>
    );
}