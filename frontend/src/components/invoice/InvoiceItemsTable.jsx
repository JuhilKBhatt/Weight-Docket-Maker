// src/components/invoice/InvoiceItemsTable.jsx

import React, { useState, useMemo } from 'react'; // Added useMemo
import { Table, Input, InputNumber, Button, Popconfirm, Typography, Select } from 'antd';
import { audFormatter, audParser, audFormatterFixed, isValidInput } from '../../scripts/utilities/AUDFormatters';

const { Option } = Select;

export default function InvoiceItemsTable({
  invoiceType,
  items,
  currency = 'AUD',
  setCurrency,
  handleItemChange,
  addRow,
  removeRow,
  currencyOptions = [],
  unitOptions = []
}) {

  const [selectedRowKey, setSelectedRowKey] = useState(null);

  const currentSymbolLabel = useMemo(() => 
    currencyOptions.find(c => c.code === currency)?.label || `${currency}$`,
  [currencyOptions, currency]);

  // UPDATED: Handler now accepts maxDecimals
  const onInputChange = (key, field, e, maxDecimals = 2) => {
    const rawValue = e.target.value;
    const parsedValue = audParser(rawValue);
    
    if (isValidInput(parsedValue, maxDecimals)) {
      handleItemChange(key, field, parsedValue);
    }
  };

  // Helper functions for renderers (to keep useMemo clean)
  const getUnitSelector = (record) => (
    <Select
      value={record.unit || 't'}
      style={{ width: 88, margin: '-5px 0' }}
      showSearch
      optionFilterProp="children"
      onChange={(val) => handleItemChange(record.key, 'unit', val)}
    >
      {unitOptions.map(unit => (
        <Option key={unit.value} value={unit.value}>{unit.label}</Option>
      ))}
    </Select>
  );

  const getCurrencySelector = () => (
    <Select
      value={currency} 
      style={{ width: 98, margin: '-5px 0' }}
      showSearch
      optionFilterProp="children"
      onChange={(val) => setCurrency(val)}
    >
      {currencyOptions.map(curr => (
        <Option key={curr.code} value={curr.code}>{curr.label}</Option>
      ))}
    </Select>
  );

  // Memoize Columns
  const columns = useMemo(() => {
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
              addonAfter={getUnitSelector(record)}
              style={{ width: '100%' }}
              value={record.quantity}
              min={0}
              step={1}
              precision={3}
              formatter={value => value === '' || value === undefined || value === null ? '' : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
              onChange={(val) => handleItemChange(record.key, 'quantity', val)}
            />
          ),
        },
        {
          title: 'Unit Price',
          dataIndex: 'price',
          render: (_, record) => (
            <Input
              addonBefore={getCurrencySelector()} 
              style={{ width: '100%' }}
              value={audFormatter(record.price)}
              onChange={(e) => onInputChange(record.key, 'price', e, 2)}
            />
          ),
        },
        {
          title: 'Total',
          dataIndex: 'total',
          render: (_, record) => (
            <InputNumber
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

      if (invoiceType === 'Container') return containerColumns;
      if (invoiceType === 'Pickup') return pickupColumns;
      return sharedColumns;

  }, [invoiceType, currency, currentSymbolLabel, unitOptions, currencyOptions, items]); // Dependencies

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
      columns={columns} dataSource={items} pagination={false} bordered />
      <Button type="dashed" onClick={addRow} style={{ marginTop: 10 }}>+ Add Row</Button>
    </>
  );
}