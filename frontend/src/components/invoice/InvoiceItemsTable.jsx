// ./frontend/src/components/invoice/InvoiceItemsTable.jsx

import { Table, Input, InputNumber, Button, Popconfirm, Typography } from 'antd';
import { audFormatter, audParser, audFormatterFixed } from '../../scripts/utilities/AUDformatters';

export default function InvoiceItemsTable({
  invoiceType,
  items,
  handleItemChange,
  addRow,
  removeRow,
}) {
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
      dataIndex: 'quantity', // CHANGED from weight
      render: (_, record) => (
        <InputNumber
          addonAfter="t"
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
          addonBefore="$"
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
          addonBefore="$"
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
      dataIndex: 'containerNumber', // CHANGED from container
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
      dataIndex: 'metal', // Often mapped to metal in pickup
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