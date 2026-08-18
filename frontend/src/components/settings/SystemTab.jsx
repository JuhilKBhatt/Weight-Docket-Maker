import React, { useEffect, useState } from 'react';
import { Card, Button, Typography, Space, Divider } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import { getBackendVersion } from '../../services/settingsService';
import pkg from '../../../package.json';

const { Title, Paragraph, Text } = Typography;

export default function SystemTab({ onBackup }) {
    const [backendVersion, setBackendVersion] = useState('Loading...');

    useEffect(() => {
        getBackendVersion()
            .then(res => setBackendVersion(res.version))
            .catch(() => setBackendVersion('Unavailable'));
    }, []);

    return (
        <Card>
            <Title level={5}>Database Management</Title>
            <Paragraph>Trigger a manual backup of the database immediately.</Paragraph>
            <Button type="primary" icon={<DatabaseOutlined />} onClick={onBackup}>Run Backup Now</Button>

            <Divider />
            
            <Title level={5}>System Version</Title>
            <Space direction="vertical">
                <Text><strong>Frontend Version:</strong> {pkg.version}</Text>
                <Text><strong>Backend Version:</strong> {backendVersion}</Text>
            </Space>
        </Card>
    );
}