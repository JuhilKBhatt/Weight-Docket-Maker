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
          onChange={(e) =>
            handleItemChange(record.key, 'description', e.target.value)
          }
        />
      ),
    },
    {
      title: 'Net Weight (t)',
      dataIndex: 'weight',
      render: (_, record) => (
        <InputNumber
          addonAfter="t"
          style={{ width: '100%' }}
          value={record.weight}
          onChange={(val) =>
            handleItemChange(record.key, 'weight', val)
          }
        />
      ),
    },
    {
      title: '$ / tonne',
      dataIndex: 'price',
      render: (_, record) => (
        <InputNumber
          addonBefore="$"
          style={{ width: '100%' }}
          value={record.price}
          formatter={audFormatter}
          parser={audParser}
          onChange={(val) =>
            handleItemChange(record.key, 'price', val)
          }
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
        <Popconfirm
          title="Remove row?"
          onConfirm={() => removeRow(record.key)}
        >
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
          onChange={(e) =>
            handleItemChange(record.key, 'seal', e.target.value)
          }
        />
      ),
    },
    {
      title: 'Container #',
      dataIndex: 'container',
      render: (_, record) => (
        <Input
          value={record.container}
          onChange={(e) =>
            handleItemChange(record.key, 'container', e.target.value)
          }
        />
      ),
    },
    ...sharedColumns,
  ];

  const pickupColumns = [
    {
      title: 'Metal',
      dataIndex: 'container',
      render: (_, record) => (
        <Input
          value={record.container}
          onChange={(e) =>
            handleItemChange(record.key, 'container', e.target.value)
          }
        />
      ),
    },
    ...sharedColumns,
  ];

  const otherColumns = [
    ...sharedColumns,
  ];

  const getColumns = () => {
    if (invoiceType === 'Container') {
      return containerColumns;
    }
    if (invoiceType === 'Pickup') {
      return pickupColumns;
    }
    return otherColumns;
  };

  const columns = getColumns();

  return (
    <>
      <Typography.Title level={5}>Invoice Items</Typography.Title>

      <Table
        columns={columns}
        dataSource={items}
        pagination={false}
        bordered
      />

      <Button type="dashed" onClick={addRow} style={{ marginTop: 10 }}>
        + Add Row
      </Button>
    </>
  );
}