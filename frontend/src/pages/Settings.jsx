// frontend/src/pages/Settings.jsx
import React, { useEffect, useState } from 'react';
import { Tabs, List, Button, Typography, Popconfirm, message, Card } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { selectorData } from '../scripts/utilities/invoiceUtils';
import { deleteSelector } from '../services/settingsService';

export default function Settings() {
  const [data, setData] = useState({ companies_from: [], companies_to: [], accounts: [] });
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await selectorData();
      setData(res);
    } catch (err) {
      message.error("Failed to load settings data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (type, id) => {
    try {
      await deleteSelector(type, id);
      message.success("Item removed");
      fetchData(); // Refresh list
    } catch (err) {
      message.error("Failed to delete item");
    }
  };

  const renderCompanyList = (list, type) => (
    <List
      loading={loading}
      dataSource={list}
      renderItem={(item) => (
        <List.Item
            actions={[
                <Popconfirm title="Delete this saved company?" onConfirm={() => handleDelete(type, item.id)}>
                    <Button danger icon={<DeleteOutlined />}>Remove</Button>
                </Popconfirm>
            ]}
        >
          <List.Item.Meta
            title={item.name}
            description={
                <>
                    <div>ABN: {item.abn}</div>
                    <div>{item.address}</div>
                </>
            }
          />
        </List.Item>
      )}
    />
  );

  const renderAccountList = (list) => (
    <List
      loading={loading}
      dataSource={list}
      renderItem={(item) => (
        <List.Item
            actions={[
                <Popconfirm title="Delete this saved account?" onConfirm={() => handleDelete('account', item.id)}>
                    <Button danger icon={<DeleteOutlined />}>Remove</Button>
                </Popconfirm>
            ]}
        >
          <List.Item.Meta
            title={`${item.account_name} (${item.bank_name})`}
            description={`BSB: ${item.bsb} | Acc: ${item.account_number}`}
          />
        </List.Item>
      )}
    />
  );

  const items = [
    {
      key: '1',
      label: 'Bill From Companies',
      children: renderCompanyList(data.companies_from, 'from'),
    },
    {
      key: '2',
      label: 'Bill To Companies',
      children: renderCompanyList(data.companies_to, 'to'),
    },
    {
      key: '3',
      label: 'Bank Accounts',
      children: renderAccountList(data.accounts),
    },
  ];

  return (
    <div className="home-container" style={{ alignItems: 'flex-start' }}>
      <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
        <Typography.Title level={2} style={{ textAlign: 'center', marginBottom: 20 }}>
            Settings
        </Typography.Title>
        <Typography.Paragraph style={{ textAlign: 'center', marginBottom: 40 }}>
            Manage your saved auto-fill data here. Deleting items here will remove them from the dropdowns in the invoice form, but will not affect past invoices.
        </Typography.Paragraph>
        
        <Card>
            <Tabs defaultActiveKey="1" items={items} />
        </Card>
      </div>
    </div>
  );
}