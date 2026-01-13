// ./frontend/src/components/invoice/InvoiceItemsTable.jsx

import React, {useState} from 'react';
import { Table, Input, InputNumber, Button, Popconfirm, Typography, Select } from 'antd';
import { audFormatter, audParser, audFormatterFixed } from '../../scripts/utilities/AUDformatters';
import { CURRENCY_OPTIONS, UNIT_OPTIONS, getCurrencyLabel } from '../../scripts/utilities/invoiceConstants';

const { Option } = Select;

export default function InvoiceItemsTable({
  invoiceType,
  items,
  currency = 'AUD',
  setCurrency,
  handleItemChange,
  addRow,
  removeRow,
}) {

  const [selectedRowKey, setSelectedRowKey] = useState(null);
  // Helper: Get symbol (e.g. "AUD$")
  const currentSymbolLabel = getCurrencyLabel(currency);

  // 1. Optimized Unit Selector (Searchable & Mapped)
  const renderUnitSelector = (record) => (
    <Select
      value={record.unit || 't'}
      style={{ width: 88, margin: '-5px 0' }}
      showSearch
      optionFilterProp="children"
      onChange={(val) => handleItemChange(record.key, 'unit', val)}
    >
      {UNIT_OPTIONS.map(unit => (
        <Option key={unit.value} value={unit.value}>{unit.label}</Option>
      ))}
    </Select>
  );

  // 2. Optimized Currency Selector (Searchable & Mapped)
  const renderCurrencySelector = () => (
    <Select
      value={currency} 
      style={{ width: 98, margin: '-5px 0' }}
      showSearch
      optionFilterProp="children"
      onChange={(val) => setCurrency(val)}
    >
      {CURRENCY_OPTIONS.map(curr => (
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
      // Conditionally apply class if key matches state
      rowClassName={(record) => 
          record.key === selectedRowKey ? 'docket-table-row selected-row' : 'docket-table-row'
      }
      // Handle row click
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