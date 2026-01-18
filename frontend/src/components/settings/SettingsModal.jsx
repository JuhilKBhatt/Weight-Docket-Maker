// src/components/settings/SettingsModal.jsx

import React from 'react';
import { Modal, Form, Input } from 'antd';

export default function SettingsModal({ open, onOk, onCancel, modalType, editingItem, form }) {
    return (
        <Modal 
            title={editingItem ? "Edit Item" : "Add Item"} 
            open={open} 
            onOk={onOk} 
            onCancel={onCancel}
        >
            <Form form={form} layout="vertical">
                {/* Currency Form */}
                {modalType === 'currency' && (
                    <>
                        <Form.Item name="code" label="Code (e.g. AUD)" rules={[{ required: true }]}>
                            <Input maxLength={10} />
                        </Form.Item>
                        <Form.Item name="symbol" label="Symbol (e.g. $)" rules={[{ required: true }]}>
                            <Input maxLength={5} />
                        </Form.Item>
                        <Form.Item name="label" label="Display Label (e.g. AUD$)" rules={[{ required: true }]}>
                            <Input maxLength={20} />
                        </Form.Item>
                    </>
                )}
                {/* Unit Form */}
                {modalType === 'unit' && (
                    <>
                        <Form.Item name="value" label="Value (e.g. kg)" rules={[{ required: true }]}>
                            <Input maxLength={10} />
                        </Form.Item>
                        <Form.Item name="label" label="Label (e.g. Kilograms)" rules={[{ required: true }]}>
                            <Input maxLength={20} />
                        </Form.Item>
                    </>
                )}
                {/* Company Form */}
                {(modalType === 'companyFrom' || modalType === 'companyTo') && (
                    <>
                        <Form.Item name="name" label="Company Name" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="abn" label="ABN">
                            <Input />
                        </Form.Item>
                        <Form.Item name="address" label="Address">
                            <Input />
                        </Form.Item>
                        <Form.Item name="phone" label="Phone">
                            <Input />
                        </Form.Item>
                        <Form.Item name="email" label="Email">
                            <Input />
                        </Form.Item>
                    </>
                )}
                {/* Account Form */}
                {modalType === 'account' && (
                    <>
                        <Form.Item name="bank_name" label="Bank Name" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="account_name" label="Account Name" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="bsb" label="BSB" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="account_number" label="Account Number" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                    </>
                )}
            </Form>
        </Modal>
    );
}