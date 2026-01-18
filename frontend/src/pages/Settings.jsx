// frontend/src/pages/Settings.jsx
import React, { useEffect, useState } from 'react';
import { 
    Tabs, List, Button, Typography, Popconfirm, message, Card, 
    Form, Select, Input, Switch, InputNumber, Row, Col, Modal, Tag 
} from 'antd';
import { 
    DeleteOutlined, PlusOutlined, EditOutlined, SaveOutlined, DatabaseOutlined 
} from '@ant-design/icons';
import { selectorData } from '../scripts/utilities/invoiceUtils';
import { 
    deleteSelector, getDefaults, updateDefaults, 
    getCurrencies, addCurrency, deleteCurrency,
    getUnits, addUnit, deleteUnit,
    saveCompanyFrom, saveCompanyTo, saveAccount, forceBackup
} from '../services/settingsService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm(); // For Defaults

  // Data State
  const [selectors, setSelectors] = useState({ companies_from: [], companies_to: [], accounts: [] });
  const [defaults, setDefaults] = useState({});
  const [currencies, setCurrencies] = useState([]);
  const [units, setUnits] = useState([]);

  // UI State
  const [emailProvider, setEmailProvider] = useState('Axigen'); // 'Axigen' or 'Gmail'

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // 'currency', 'unit', 'companyFrom', 'companyTo', 'account'
  const [editingItem, setEditingItem] = useState(null);
  const [modalForm] = Form.useForm();

  // --- Initial Load ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const [selData, defData, curData, unitData] = await Promise.all([
          selectorData(),
          getDefaults(),
          getCurrencies(),
          getUnits()
      ]);
      setSelectors(selData);
      setDefaults(defData);
      setCurrencies(curData);
      setUnits(unitData);
      
      // Determine Provider (Default to Axigen if not set)
      const provider = defData.email_provider || 'Axigen';
      setEmailProvider(provider);

      // Init Form Defaults
      form.setFieldsValue({
          // Global Config
          default_currency: defData.default_currency || 'AUD',
          default_unit: defData.default_unit || 'kg',
          default_gst_enabled: defData.default_gst_enabled === 'true',
          default_gst_percentage: Number(defData.default_gst_percentage) || 10,
          default_invoice_type: defData.default_invoice_type || 'Customer',
          
          // Default Entities
          default_bill_from: defData.default_bill_from ? Number(defData.default_bill_from) : null,
          default_account: defData.default_account ? Number(defData.default_account) : null,

          // Email Settings
          email_provider: provider,
          email_from_address: defData.email_from_address || '',
          
          // Axigen
          axigen_api_url: defData.axigen_api_url || '',
          axigen_user: defData.axigen_user || '',
          axigen_password: defData.axigen_password || '',

          // Gmail (Future Proofing)
          gmail_user: defData.gmail_user || '',
          gmail_app_password: defData.gmail_app_password || '',
      });

    } catch (err) {
      console.error(err);
      messageApi.error("Failed to load settings data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Defaults Handler ---
  const handleSaveDefaults = async (values) => {
      try {
          const payload = Object.keys(values).map(key => ({
              key, 
              value: String(values[key] === undefined || values[key] === null ? '' : values[key]) 
          }));
          await updateDefaults(payload);
          messageApi.success("Settings saved successfully");
          fetchData(); // Refresh
      } catch (err) {
          messageApi.error("Failed to save settings");
      }
  };

  // --- Deletion Handlers ---
  const handleDeleteSelector = async (type, id) => {
    try {
      await deleteSelector(type, id);
      messageApi.success("Item removed");
      fetchData();
    } catch (err) {
      messageApi.error("Failed to delete item");
    }
  };

  const handleDeleteOption = async (type, id) => {
      try {
          if (type === 'currency') await deleteCurrency(id);
          if (type === 'unit') await deleteUnit(id);
          messageApi.success("Option deleted");
          fetchData();
      } catch (err) {
          messageApi.error("Failed to delete option");
      }
  };

  // --- Modal / Edit Handlers ---
  const openModal = (type, item = null) => {
      setModalType(type);
      setEditingItem(item);
      setIsModalOpen(true);
      if (item) {
          modalForm.setFieldsValue(item);
      } else {
          modalForm.resetFields();
      }
  };

  const handleModalOk = async () => {
      try {
          const values = await modalForm.validateFields();
          const id = editingItem?.id;

          if (modalType === 'currency') {
              await addCurrency(values);
          } else if (modalType === 'unit') {
              await addUnit(values);
          } else if (modalType === 'companyFrom') {
              await saveCompanyFrom(values, id);
          } else if (modalType === 'companyTo') {
              await saveCompanyTo(values, id);
          } else if (modalType === 'account') {
              await saveAccount(values, id);
          }

          messageApi.success("Saved successfully");
          setIsModalOpen(false);
          fetchData();
      } catch (err) {
          console.error(err);
          messageApi.error("Failed to save");
      }
  };

  const handleBackup = async () => {
      try {
          messageApi.loading("Starting backup...", 1);
          await forceBackup();
          setTimeout(() => messageApi.success("Backup trigger sent to server"), 1000);
      } catch (err) {
          messageApi.error("Backup failed");
      }
  };

  // --- RENDERERS ---

  // 1. Defaults Tab
  const renderDefaults = () => (
      <Form form={form} layout="vertical" onFinish={handleSaveDefaults}>
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
                      <Row gutter={16}>
                          <Col span={12}>
                              <Form.Item label="Default GST Enabled" name="default_gst_enabled" valuePropName="checked">
                                  <Switch />
                              </Form.Item>
                          </Col>
                          <Col span={12}>
                               <Form.Item label="Default GST %" name="default_gst_percentage">
                                  <InputNumber min={0} max={100} addonAfter="%" />
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
                                 <Option value="Customer">Customer</Option>
                                 <Option value="Weight">Weight</Option>
                                 <Option value="Container">Container</Option>
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

  // 2. Email Config Tab (NEW)
  const renderEmailConfig = () => (
      <Form form={form} layout="vertical" onFinish={handleSaveDefaults}>
          <Card title="Email Server Configuration">
              <Row gutter={24}>
                  <Col span={12}>
                      <Form.Item label="Email Provider" name="email_provider">
                          <Select onChange={(val) => setEmailProvider(val)}>
                              <Option value="Axigen">Axigen Mail Server (REST API)</Option>
                              <Option value="Gmail">Gmail (SMTP)</Option>
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
                          <Input placeholder="accounts@yourdomain.com" />
                      </Form.Item>
                  </Col>
              </Row>

              {emailProvider === 'Axigen' && (
                  <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 20, marginTop: 10 }}>
                      <Tag color="blue" style={{ marginBottom: 15 }}>Axigen Configuration</Tag>
                      <Row gutter={24}>
                          <Col span={24}>
                              <Form.Item label="API URL" name="axigen_api_url" rules={[{ required: true }]}>
                                  <Input placeholder="https://mail.myserver.com" />
                              </Form.Item>
                          </Col>
                          <Col span={12}>
                              <Form.Item label="Username" name="axigen_user" rules={[{ required: true }]}>
                                  <Input />
                              </Form.Item>
                          </Col>
                          <Col span={12}>
                              <Form.Item label="Password" name="axigen_password" rules={[{ required: true }]}>
                                  <Input.Password />
                              </Form.Item>
                          </Col>
                      </Row>
                  </div>
              )}

              {emailProvider === 'Gmail' && (
                  <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 20, marginTop: 10 }}>
                      <Tag color="orange" style={{ marginBottom: 15 }}>Gmail Configuration</Tag>
                      <Paragraph type="secondary" style={{ fontSize: '12px' }}>
                          Note: You must generate an <strong>App Password</strong> in your Google Account settings to use this feature. 
                          Normal passwords will not work.
                      </Paragraph>
                      <Row gutter={24}>
                          <Col span={12}>
                              <Form.Item label="Gmail Address" name="gmail_user">
                                  <Input placeholder="your.name@gmail.com" />
                              </Form.Item>
                          </Col>
                          <Col span={12}>
                              <Form.Item label="App Password" name="gmail_app_password">
                                  <Input.Password placeholder="xxxx xxxx xxxx xxxx" />
                              </Form.Item>
                          </Col>
                      </Row>
                  </div>
              )}

              <div style={{ textAlign: 'right', marginTop: 20 }}>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Save Email Settings</Button>
              </div>
          </Card>
      </Form>
  );

  // 3. Lists Tab
  const renderOptionsList = (data, type) => (
      <List
          bordered
          dataSource={data}
          renderItem={item => (
              <List.Item
                  actions={[
                      <Popconfirm title="Delete?" onConfirm={() => handleDeleteOption(type, item.id)}>
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

  // 4. Entities Tab (Reusable List)
  const renderEntityList = (data, typeStr, labelKey, descKey) => (
    <>
      <Button type="dashed" style={{marginBottom: 10}} icon={<PlusOutlined />} onClick={() => openModal(typeStr)}>
          Add New
      </Button>
      <List
        loading={loading}
        dataSource={data}
        renderItem={(item) => (
            <List.Item
                actions={[
                    <Button icon={<EditOutlined />} onClick={() => openModal(typeStr, item)}>Edit</Button>,
                    <Popconfirm title="Delete?" onConfirm={() => handleDeleteSelector(typeStr === 'account' ? 'account' : typeStr.includes('From') ? 'from' : 'to', item.id)}>
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

  const tabItems = [
    {
      key: '1', label: 'Global Defaults',
      children: renderDefaults(),
    },
    {
      key: '2', label: 'Lists Management',
      children: (
          <Row gutter={24}>
              <Col span={12}>
                  <Title level={5}>Currencies</Title>
                  <Button type="dashed" size="small" style={{ marginBottom: 10 }} onClick={() => openModal('currency')}>+ Add Currency</Button>
                  {renderOptionsList(currencies, 'currency')}
              </Col>
              <Col span={12}>
                  <Title level={5}>Units</Title>
                  <Button type="dashed" size="small" style={{ marginBottom: 10 }} onClick={() => openModal('unit')}>+ Add Unit</Button>
                  {renderOptionsList(units, 'unit')}
              </Col>
          </Row>
      )
    },
    {
      key: '3', label: 'Bill From Companies',
      children: renderEntityList(selectors.companies_from, 'companyFrom', 'name', i => `ABN: ${i.abn}`),
    },
    {
      key: '4', label: 'Bill To Companies',
      children: renderEntityList(selectors.companies_to, 'companyTo', 'name', i => `ABN: ${i.abn}`),
    },
    {
      key: '5', label: 'Bank Accounts',
      children: renderEntityList(selectors.accounts, 'account', 'account_name', i => `${i.bank_name} (${i.account_number})`),
    },
    {
        key: '6', label: 'Email Config',
        children: renderEmailConfig(),
    },
    {
        key: '7', label: 'System',
        children: (
            <Card>
                <Title level={5}>Database Management</Title>
                <Paragraph>Trigger a manual backup of the database immediately.</Paragraph>
                <Button type="primary" icon={<DatabaseOutlined />} onClick={handleBackup}>Run Backup Now</Button>
            </Card>
        )
    }
  ];

  return (
    <div className="home-container" style={{ alignItems: 'flex-start' }}>
      {contextHolder}
      <div style={{ maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 20 }}>Settings</Title>
        <Card>
            <Tabs defaultActiveKey="1" items={tabItems} />
        </Card>
      </div>

      {/* --- SHARED MODAL --- */}
      <Modal 
        title={editingItem ? "Edit Item" : "Add Item"} 
        open={isModalOpen} 
        onOk={handleModalOk} 
        onCancel={() => setIsModalOpen(false)}
      >
          <Form form={modalForm} layout="vertical">
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
    </div>
  );
}