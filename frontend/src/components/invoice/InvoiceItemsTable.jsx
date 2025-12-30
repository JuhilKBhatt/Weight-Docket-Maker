// ./frontend/src/components/invoice/InvoiceItemsTable.jsx

import { Table, Input, InputNumber, Button, Popconfirm, Typography, Select } from 'antd';
import { audFormatter, audParser, audFormatterFixed } from '../../scripts/utilities/AUDformatters';

const { Option } = Select;

// Map currency codes to their symbols for the Total column
const CURRENCY_SYMBOLS = {
  AUD: '$',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
};

export default function InvoiceItemsTable({
  invoiceType,
  items,
  currency = 'AUD', // New Prop: Global Currency
  setCurrency,      // New Prop: Function to update Global Currency
  handleItemChange,
  addRow,
  removeRow,
}) {

  // Helper: Get symbol based on current global state
  const currentSymbol = currency+CURRENCY_SYMBOLS[currency] || '$';

  // 1. Unit Selector (Keeps specific to the row)
  const renderUnitSelector = (record) => (
    <Select
      value={record.unit || 't'}
      style={{ width: 90, margin: '-5px 0' }}
      onChange={(val) => handleItemChange(record.key, 'unit', val)}
    >
      <Option value="t">t</Option>
      <Option value="kg">kg</Option>
      <Option value="pcs">pcs</Option>
      <Option value="bin">bin</Option>
      <Option value="cnt">CNT</Option>
    </Select>
  );

  // 2. Currency Selector (Universal)
  // When changed here, it updates the 'currency' prop, affecting ALL rows and totals.
  const renderCurrencySelector = () => (
    <Select
      value={currency} 
      style={{ width: 100, margin: '-5px 0' }}
      onChange={(val) => setCurrency(val)} // Updates global state
    >
      <Option value="AUD">AUD$</Option>
      <Option value="USD">USD$</Option>
      <Option value="EUR">EUR€</Option>
      <Option value="GBP">GBP£</Option>
      <Option value="JPY">JPY¥</Option>
      <Option value="CNY">CNY¥</Option>
    </Select>
  );

  const sharedColumns = [
    {
      title: 'Description',
      dataIndex: 'description',
      render: (_, record) => (
        <Input
          value={record.description}
          onChange={(e) => handleItemChange(record.key, 'description', e.target.value)}
        />
      ),
    },
    {
      title: 'Quantity', 
      dataIndex: 'quantity',
      render: (_, record) => (
        <InputNumber
          addonAfter={renderUnitSelector(record)}
          style={{ width: '100%' }}
          value={record.quantity}
          onChange={(val) => handleItemChange(record.key, 'quantity', val)}
        />
      ),
    },
    {
      title: 'Unit Price',
      dataIndex: 'price',
      render: (_, record) => (
        <InputNumber
          // Use the Universal Selector here
          addonBefore={renderCurrencySelector()} 
          style={{ width: '100%' }}
          value={record.price}
          formatter={audFormatter}
          parser={audParser}
          onChange={(val) => handleItemChange(record.key, 'price', val)}
        />
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      render: (_, record) => (
        <InputNumber
          // Dynamically change the symbol based on the global currency
          addonBefore={currentSymbol} 
          style={{ width: '100%' }}
          value={record.total}
          formatter={audFormatterFixed}
          precision={2}
          disabled
        />
      ),
    },
    {
      title: '',
      render: (_, record) => (
        <Popconfirm title="Remove row?" onConfirm={() => removeRow(record.key)}>
          <Button danger type="link">X</Button>
        </Popconfirm>
      ),
    },
  ];

  const containerColumns = [
    {
      title: 'Seal #',
      dataIndex: 'seal',
      render: (_, record) => (
        <Input
          value={record.seal}
          onChange={(e) => handleItemChange(record.key, 'seal', e.target.value)}
        />
      ),
    },
    {
      title: 'Container #',
      dataIndex: 'containerNumber',
      render: (_, record) => (
        <Input
          value={record.containerNumber}
          onChange={(e) => handleItemChange(record.key, 'containerNumber', e.target.value)}
        />
      ),
    },
    ...sharedColumns,
  ];

  const pickupColumns = [
    {
      title: 'Metal',
      dataIndex: 'metal',
      render: (_, record) => (
        <Input
          value={record.metal}
          onChange={(e) => handleItemChange(record.key, 'metal', e.target.value)}
        />
      ),
    },
    ...sharedColumns,
  ];

  const getColumns = () => {
    if (invoiceType === 'Container') return containerColumns;
    if (invoiceType === 'Pickup') return pickupColumns;
    return sharedColumns;
  };

  return (
    <>
      <Typography.Title level={5}>Invoice Items</Typography.Title>
      <Table columns={getColumns()} dataSource={items} pagination={false} bordered />
      <Button type="dashed" onClick={addRow} style={{ marginTop: 10 }}>+ Add Row</Button>
    </>
  );
}