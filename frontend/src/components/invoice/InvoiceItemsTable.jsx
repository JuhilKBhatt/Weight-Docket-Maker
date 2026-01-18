// ./frontend/src/components/invoice/InvoiceItemsTable.jsx

import React, {useState} from 'react';
import { Table, Input, InputNumber, Button, Popconfirm, Typography, Select } from 'antd';
import { audFormatter, audParser, audFormatterFixed } from '../../scripts/utilities/AUDformatters';
// We assume CURRENCY_OPTIONS/UNIT_OPTIONS are passed as props now, but keep imports as fallback if needed
import { CURRENCY_OPTIONS as DEFAULT_CURRENCIES, UNIT_OPTIONS as DEFAULT_UNITS, getCurrencyLabel } from '../../scripts/utilities/invoiceConstants';

const { Option } = Select;

export default function InvoiceItemsTable({
  invoiceType,
  items,
  currency = 'AUD',
  setCurrency,
  handleItemChange,
  addRow,
  removeRow,
  // New Props
  currencyOptions = [],
  unitOptions = []
}) {

  const [selectedRowKey, setSelectedRowKey] = useState(null);

  // Fallback to constants if API failed or empty
  const activeCurrencies = currencyOptions.length > 0 ? currencyOptions : DEFAULT_CURRENCIES;
  const activeUnits = unitOptions.length > 0 ? unitOptions : DEFAULT_UNITS;

  // Helper: Find label for current currency
  const currentSymbolLabel = activeCurrencies.find(c => c.code === currency)?.label || `${currency}$`;

  // 1. Optimized Unit Selector
  const renderUnitSelector = (record) => (
    <Select
      value={record.unit || 't'}
      style={{ width: 88, margin: '-5px 0' }}
      showSearch
      optionFilterProp="children"
      onChange={(val) => handleItemChange(record.key, 'unit', val)}
    >
      {activeUnits.map(unit => (
        <Option key={unit.value} value={unit.value}>{unit.label}</Option>
      ))}
    </Select>
  );

  // 2. Optimized Currency Selector
  const renderCurrencySelector = () => (
    <Select
      value={currency} 
      style={{ width: 98, margin: '-5px 0' }}
      showSearch
      optionFilterProp="children"
      onChange={(val) => setCurrency(val)}
    >
      {activeCurrencies.map(curr => (
        <Option key={curr.code} value={curr.code}>{curr.label}</Option>
      ))}
    </Select>
  );

  const sharedColumns = [
    {
      title: 'Description',
      dataIndex: 'description',
      render: (_, record) => (
        <Input
          value={record.description}
          maxLength={254}
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
          // Universal Selector
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
          // Dynamic Symbol Label
          addonBefore={currentSymbolLabel} 
          style={{ width: '100%' }}
          value={record.total}
          formatter={audFormatterFixed}
          precision={2}
          readOnly
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
          maxLength={99}
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
          maxLength={99}
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
          maxLength={99}
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
      <Table
      rowClassName={(record) => 
          record.key === selectedRowKey ? 'docket-table-row selected-row' : 'docket-table-row'
      }
      onRow={(record) => ({
          onClick: () => {
              setSelectedRowKey(record.key);
          },
      })}
      columns={getColumns()} dataSource={items} pagination={false} bordered />
      <Button type="dashed" onClick={addRow} style={{ marginTop: 10 }}>+ Add Row</Button>
    </>
  );
}