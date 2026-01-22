// frontend/src/pages/Settings.jsx
import React, { useEffect, useState } from 'react';
import { Tabs, Typography, message, Card, Form } from 'antd';

// Data Logic
import { selectorData } from '../scripts/utilities/invoiceUtils';
import { 
    deleteSelector, getDefaults, updateDefaults, 
    getCurrencies, addCurrency, updateCurrency, deleteCurrency,
    getUnits, addUnit, updateUnit, deleteUnit,
    saveCompanyFrom, saveCompanyTo, saveAccount, forceBackup
} from '../services/settingsService';

// Sub-Components
import DefaultsTab from '../components/settings/DefaultsTab';
import EmailConfigTab from '../components/settings/EmailConfigTab';
import EntitiesTab from '../components/settings/EntitiesTab';
import ListsManagementTab from '../components/settings/ListsManagementTab';
import SystemTab from '../components/settings/SystemTab';
import SettingsModal from '../components/settings/SettingsModal';

const { Title } = Typography;

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm(); // For Defaults & Email

  // Data State
  const [selectors, setSelectors] = useState({ companies_from: [], companies_to: [], accounts: [] });
  // eslint-disable-next-line no-unused-vars
  const [defaults, setDefaults] = useState({});
  const [currencies, setCurrencies] = useState([]);
  const [units, setUnits] = useState([]);

  // UI State
  const [emailProvider, setEmailProvider] = useState('Axigen');

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); 
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

      const provider = defData.email_provider || 'SMTP'; // Default to SMTP now
      setEmailProvider(provider);

      // Init Form Defaults
      form.setFieldsValue({
          ...defData,
          
          // SPLIT GST DEFAULTS
          default_docket_gst_enabled: defData.default_docket_gst_enabled === 'true',
          default_invoice_gst_enabled: defData.default_invoice_gst_enabled === 'true',
          
          default_gst_percentage: Number(defData.default_gst_percentage) || 10,
          default_bill_from: defData.default_bill_from ? Number(defData.default_bill_from) : null,
          default_account: defData.default_account ? Number(defData.default_account) : null,
          
          // Email
          email_provider: provider,
          
          // SMTP Defaults
          smtp_host: defData.smtp_host || 'ventraip.email',
          smtp_port: defData.smtp_port || '465',
          smtp_user: defData.smtp_user || '',
          smtp_password: defData.smtp_password || '',

          // Axigen
          axigen_api_url: defData.axigen_api_url || '',
          
          // Templates
          email_default_subject: defData.email_default_subject || 'Invoice {{number}}',
          email_default_body: defData.email_default_body || 'Please find attached invoice {{number}}.',
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

  // --- Handlers ---
  const handleSaveDefaults = async (values) => {
      try {
          const payload = Object.keys(values).map(key => ({
              key, 
              value: String(values[key] === undefined || values[key] === null ? '' : values[key]) 
          }));
          await updateDefaults(payload);
          messageApi.success("Settings saved successfully");
          fetchData(); 
      } catch (err) {
        console.error(err);
          messageApi.error("Failed to save settings");
      }
  };

  const handleDeleteSelector = async (type, id) => {
    try {
      await deleteSelector(type, id);
      messageApi.success("Item removed");
      fetchData();
    } catch (err) {
      console.error(err);
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
          console.error(err);
          messageApi.error("Failed to delete option");
      }
  };

  const handleBackup = async () => {
      try {
          messageApi.loading("Starting backup...", 1);
          await forceBackup();
          setTimeout(() => messageApi.success("Backup trigger sent to server"), 1000);
      } catch (err) {
          console.error(err);
          messageApi.error("Backup failed");
      }
  };

  // --- Modal Logic ---
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
              if (id) await updateCurrency(values, id);
              else await addCurrency(values);
          }
          else if (modalType === 'unit') {
              if (id) await updateUnit(values, id);
              else await addUnit(values);
          }
          else if (modalType === 'companyFrom') await saveCompanyFrom(values, id);
          else if (modalType === 'companyTo') await saveCompanyTo(values, id);
          else if (modalType === 'account') await saveAccount(values, id);

          messageApi.success("Saved successfully");
          setIsModalOpen(false);
          fetchData();
      } catch (err) {
          console.error(err);
          messageApi.error("Failed to save");
      }
  };

  // --- Tab Config ---
  const tabItems = [
    {
      key: '1', label: 'Global Defaults',
      children: <DefaultsTab form={form} currencies={currencies} units={units} selectors={selectors} onSave={handleSaveDefaults} />,
    },
    {
      key: '2', label: 'Lists Management',
      children: <ListsManagementTab currencies={currencies} units={units} onAdd={openModal} onEdit={openModal} onDelete={handleDeleteOption} />
    },
    {
      key: '3', label: 'Bill From Companies',
      children: <EntitiesTab data={selectors.companies_from} typeStr="companyFrom" labelKey="name" descKey={i => `ABN: ${i.abn}`} onAdd={openModal} onEdit={openModal} onDelete={handleDeleteSelector} loading={loading} />,
    },
    {
      key: '4', label: 'Bill To Companies',
      children: <EntitiesTab data={selectors.companies_to} typeStr="companyTo" labelKey="name" descKey={i => `ABN: ${i.abn}`} onAdd={openModal} onEdit={openModal} onDelete={handleDeleteSelector} loading={loading} />,
    },
    {
      key: '5', label: 'Bank Accounts',
      children: <EntitiesTab data={selectors.accounts} typeStr="account" labelKey="account_name" descKey={i => `${i.bank_name} (${i.account_number})`} onAdd={openModal} onEdit={openModal} onDelete={handleDeleteSelector} loading={loading} />,
    },
    {
        key: '6', label: 'Email Config',
        children: <EmailConfigTab form={form} emailProvider={emailProvider} setEmailProvider={setEmailProvider} onSave={handleSaveDefaults} />,
    },
    {
        key: '7', label: 'System',
        children: <SystemTab onBackup={handleBackup} />
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

      <SettingsModal 
        open={isModalOpen} 
        onOk={handleModalOk} 
        onCancel={() => setIsModalOpen(false)} 
        modalType={modalType} 
        editingItem={editingItem} 
        form={modalForm} 
      />
    </div>
  );
}