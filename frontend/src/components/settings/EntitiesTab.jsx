// src/components/settings/EntitiesTab.jsx

import React from 'react';
import { List, Button, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

export default function EntitiesTab({ data, typeStr, labelKey, descKey, onAdd, onEdit, onDelete, loading }) {
    return (
        <>
            <Button type="dashed" style={{ marginBottom: 10 }} icon={<PlusOutlined />} onClick={() => onAdd(typeStr)}>
                Add New
            </Button>
            <List
                loading={loading}
                dataSource={data}
                renderItem={(item) => (
                    <List.Item
                        actions={[
                            <Button key="edit" icon={<EditOutlined />} onClick={() => onEdit(typeStr, item)}>Edit</Button>,
                            <Popconfirm key="del" title="Delete?" onConfirm={() => onDelete(typeStr === 'account' ? 'account' : typeStr.includes('From') ? 'from' : 'to', item.id)}>
                                <Button danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        ]}
                    >
                        <List.Item.Meta
                            title={item[labelKey]}
                            description={descKey(item)}
                        />
                    </List.Item>
                )}
            />
        </>
    );
}