// ./frontend/src/components/invoice/TransportTable.jsx

import { Table, InputNumber, Typography } from 'antd';
import { audFormatter, audParser, audFormatterFixed } from '../../scripts/utilities/AUDformatters';

export default function TransportTable({
  invoiceType,
  transportItems,
  handleTransportChange,
}) {
  // Shared transport columns
  const baseColumns = [
    {
      title: 'Item',
      dataIndex: 'name',
    },
    {
      title: 'Number of CTRs',
      dataIndex: 'NumOfCTR',
      render: (_, record) => (
        <InputNumber
          addonAfter="CTR"
          style={{ width: '100%' }}
          value={record.NumOfCTR}
          onChange={(val) =>
            handleTransportChange(record.key, 'NumOfCTR', val)
          }
        />
      ),
    },
    {
      title: 'Price / CTR',
      dataIndex: 'PricePreCTR',
      render: (_, record) => (
        <InputNumber
          addonBefore="$"
          style={{ width: '100%' }}
          value={record.PricePreCTR}
          formatter={audFormatter}
          parser={audParser}
          onChange={(val) =>
            handleTransportChange(record.key, 'PricePreCTR', val)
          }
        />
      ),
    },
    {
      title: 'Total',
      render: (_, record) => {
        const total =
          (Number(record.NumOfCTR) || 0) *
          (Number(record.PricePreCTR) || 0);

        return (
          <InputNumber
            addonBefore="$"
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

  /**
   * Invoice type logic
   * (future-proofing)
   */
  const columns =
    invoiceType === 'Container'
      ? baseColumns
      : invoiceType === 'Pickup'
      ? baseColumns
      : baseColumns; // Custom uses same layout for now

  if (!transportItems.length) return null;

  return (
    <>
      <Typography.Title level={5} style={{ marginTop: 20 }}>
        Transport Charges
      </Typography.Title>

      <Table
        columns={columns}
        dataSource={transportItems}
        pagination={false}
        bordered
      />
    </>
  );
}