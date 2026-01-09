// ./frontend/src/pages/docket/DocketForm.jsx

import { Form, Button, Typography, Row, Col, Input } from 'antd';
import '../../styles/Form.css';

export default function DocketForm({ mode = 'new', existingDocket = null }) {
  const [form] = Form.useForm();

  return (
    <div className="home-container">
        <Typography.Title level={1}>
            {mode === 'new' ? 'Create New Docket' : 'Edit Docket'}
        </Typography.Title>
        <div className="form-container">
            <Form
                form={form}
                layout="vertical"
            >

            </Form>
        </div>
    </div>
  );
}