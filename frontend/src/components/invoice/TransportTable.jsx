// ./frontend/src/components/invoice/TransportTable.jsx

import { Table, InputNumber, Typography } from 'antd';
import { audFormatter, audParser, audFormatterFixed } from '../../scripts/utilities/AUDformatters';

const CURRENCY_SYMBOLS = {
  AUD: '$',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
};

export default function TransportTable({
  invoiceType,
  transportItems,
  handleTransportChange,
  currency = 'AUD', // Default to AUD
}) {
  const isContainer = invoiceType === 'Container';
  const unitLabel = isContainer ? 'CTR' : 'Trip';
  const symbol = currency+CURRENCY_SYMBOLS[currency] || '$';

  // Map transport items row names based on invoice type
  const mappedItems = transportItems.map((item, index) => {
    let name = item.name;
    if (isContainer) {
      name = index === 0 ? 'Containers' : index === 1 ? 'Overweight' : item.name;
    } else {
      name = index === 0 ? 'Pickup' : index === 1 ? 'Overweight' : item.name;
    }
    return { ...item, name };
  });

  const columns = [
    {
      title: 'Item',
      dataIndex: 'name',
    },
    {
      title: `Number of ${unitLabel}s`,
      dataIndex: 'numOfCtr',
      render: (_, record) => (
        <InputNumber
          addonAfter={unitLabel}
          style={{ width: '100%' }}
          value={record.numOfCtr}
          onChange={(val) => handleTransportChange(record.key, 'numOfCtr', val)}
        />
      ),
    },
    {
      title: `Price / ${unitLabel}`,
      dataIndex: 'pricePerCtr',
      render: (_, record) => (
        <InputNumber
          // CHANGED: Dynamic Symbol
          addonBefore={symbol}
          style={{ width: '100%' }}
          value={record.pricePerCtr}
          formatter={audFormatter}
          parser={audParser}
          onChange={(val) => handleTransportChange(record.key, 'pricePerCtr', val)}
        />
      ),
    },
    {
      title: 'Total',
      render: (_, record) => {
        const total = (Number(record.numOfCtr) || 0) * (Number(record.pricePerCtr) || 0);
        return (
          <InputNumber
            // CHANGED: Dynamic Symbol
            addonBefore={symbol}
            style={{ width: '100%' }}
            value={total}
            formatter={audFormatterFixed}
            precision={2}
            disabled
          />
        );
      },
    },
  ];

  if (!transportItems.length) return null;

  return (
    <>
      <Typography.Title level={5} style={{ marginTop: 20 }}>Transport Charges</Typography.Title>
      <Table columns={columns} dataSource={mappedItems} pagination={false} bordered />
    </>
  );
}