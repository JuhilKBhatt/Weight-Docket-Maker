// src/components/settings/ListsManagementTab.jsx

import React from 'react';
import { Row, Col, Typography, Button, List, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function ListsManagementTab({ currencies, units, onAdd, onDelete }) {
    
    const renderOptionsList = (data, type) => (
        <List
            bordered
            dataSource={data}
            renderItem={item => (
                <List.Item
                    actions={[
                        <Popconfirm key="del" title="Delete?" onConfirm={() => onDelete(type, item.id)}>
                            <Button danger size="small" icon={<DeleteOutlined />} />
                        </Popconfirm>
                    ]}
                >
                    {type === 'currency' 
                        ? <Text>{item.label} ({item.code} / {item.symbol})</Text>
                        : <Text>{item.label} ({item.value})</Text>
                    }
                </List.Item>
            )}
        />
    );

    return (
        <Row gutter={24}>
            <Col span={12}>
                <Title level={5}>Currencies</Title>
                <Button type="dashed" size="small" style={{ marginBottom: 10 }} onClick={() => onAdd('currency')}>+ Add Currency</Button>
                {renderOptionsList(currencies, 'currency')}
            </Col>
            <Col span={12}>
                <Title level={5}>Units</Title>
                <Button type="dashed" size="small" style={{ marginBottom: 10 }} onClick={() => onAdd('unit')}>+ Add Unit</Button>
                {renderOptionsList(units, 'unit')}
            </Col>
        </Row>
    );
}