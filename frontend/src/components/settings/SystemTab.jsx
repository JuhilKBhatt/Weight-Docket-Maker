// src/components/settings/SystemTab.jsx

import React from 'react';
import { Card, Button, Typography } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function SystemTab({ onBackup }) {
    return (
        <Card>
            <Title level={5}>Database Management</Title>
            <Paragraph>Trigger a manual backup of the database immediately.</Paragraph>
            <Button type="primary" icon={<DatabaseOutlined />} onClick={onBackup}>Run Backup Now</Button>
        </Card>
    );
}