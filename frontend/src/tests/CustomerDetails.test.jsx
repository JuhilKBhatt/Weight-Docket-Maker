import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Form, App } from 'antd';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import dayjs from 'dayjs';
import CustomerDetails from '../components/docket/CustomerDetails';

// MatchMedia mock for Ant Design Grid/Row/Col
beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });

    Object.assign(navigator, {
        clipboard: {
            writeText: vi.fn().mockResolvedValue(undefined),
        },
    });
});

function TestHarness({ onFormReady }) {
    const [form] = Form.useForm();
    React.useEffect(() => {
        if (onFormReady) onFormReady(form);
    }, [form, onFormReady]);

    return (
        <App>
            <Form form={form}>
                <CustomerDetails />
            </Form>
        </App>
    );
}

describe('CustomerDetails copy addonAfter and undo/redo', () => {
    it('only shows the copy button when a field is populated and copies its value on click', async () => {
        render(<TestHarness />);

        // Initially no copy buttons should be present
        expect(screen.queryByRole('button', { name: /Copy Name/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Copy Rego No\./i })).not.toBeInTheDocument();

        const regoInput = screen.getByPlaceholderText('Rego No.');
        fireEvent.focus(regoInput);
        fireEvent.change(regoInput, { target: { value: 'ABC123' } });

        // Copy button should now be rendered for Rego No. without unmounting the input element
        expect(screen.getByPlaceholderText('Rego No.')).toBe(regoInput);
        const copyRegoBtn = screen.getByRole('button', { name: /Copy Rego No\./i });
        expect(copyRegoBtn).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(copyRegoBtn);
        });

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABC123');

        // Clearing the field hides the copy button again
        fireEvent.change(regoInput, { target: { value: '' } });
        expect(screen.queryByRole('button', { name: /Copy Rego No\./i })).not.toBeInTheDocument();
    });

    it('supports Ctrl+Z / Cmd+Z undo and redo in Customer Details input fields', () => {
        let formInstance;
        render(<TestHarness onFormReady={(f) => { formInstance = f; }} />);

        const regoInput = screen.getByPlaceholderText('Rego No.');
        fireEvent.focus(regoInput);

        fireEvent.change(regoInput, { target: { value: 'A' } });
        fireEvent.change(regoInput, { target: { value: 'AB' } });
        fireEvent.change(regoInput, { target: { value: 'ABC' } });

        expect(formInstance.getFieldValue('regoNo')).toBe('ABC');

        // Undo with Ctrl+Z
        fireEvent.keyDown(regoInput, { key: 'z', ctrlKey: true });
        expect(formInstance.getFieldValue('regoNo')).toBe('AB');
        expect(regoInput.value).toBe('AB');

        // Undo with Cmd+Z (metaKey)
        fireEvent.keyDown(regoInput, { key: 'z', metaKey: true });
        expect(formInstance.getFieldValue('regoNo')).toBe('A');
        expect(regoInput.value).toBe('A');

        // Undo back to empty
        fireEvent.keyDown(regoInput, { key: 'z', metaKey: true });
        expect(formInstance.getFieldValue('regoNo')).toBe('');
        expect(regoInput.value).toBe('');

        // Redo with Cmd+Shift+Z
        fireEvent.keyDown(regoInput, { key: 'z', metaKey: true, shiftKey: true });
        expect(formInstance.getFieldValue('regoNo')).toBe('A');
        expect(regoInput.value).toBe('A');

        // Redo with Ctrl+Y
        fireEvent.keyDown(regoInput, { key: 'y', ctrlKey: true });
        expect(formInstance.getFieldValue('regoNo')).toBe('AB');
        expect(regoInput.value).toBe('AB');
    });

    it('restores pre-populated Edit Docket values on undo after deletion', () => {
        let formInstance;
        render(<TestHarness onFormReady={(f) => { formInstance = f; }} />);

        // Simulate initial Edit Docket population before user interaction
        act(() => {
            formInstance.setFieldsValue({
                name: 'John Citizen',
                phone: '0412345678',
                dob: dayjs('1990-05-20'),
            });
        });

        expect(screen.getByRole('button', { name: /Copy Name/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Copy Phone No\./i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Copy Date of Birth/i })).toBeInTheDocument();

        const phoneInput = screen.getByPlaceholderText('Phone Number');
        fireEvent.focus(phoneInput);
        fireEvent.change(phoneInput, { target: { value: '' } });
        expect(formInstance.getFieldValue('phone')).toBe('');

        // Pressing Undo restores '0412345678'
        fireEvent.keyDown(phoneInput, { key: 'z', ctrlKey: true });
        expect(formInstance.getFieldValue('phone')).toBe('0412345678');
        expect(phoneInput.value).toBe('0412345678');
    });

    it('supports undo and redo in AutoComplete fields (Name, License No., PayID, ABN)', () => {
        let formInstance;
        render(<TestHarness onFormReady={(f) => { formInstance = f; }} />);

        const nameInput = document.querySelector('#name');
        fireEvent.focus(nameInput);

        fireEvent.change(nameInput, { target: { value: 'J' } });
        fireEvent.change(nameInput, { target: { value: 'Jo' } });
        fireEvent.change(nameInput, { target: { value: 'Joh' } });

        expect(formInstance.getFieldValue('name')).toBe('Joh');
        expect(screen.getByRole('button', { name: /Copy Name/i })).toBeInTheDocument();

        // Undo in AutoComplete field
        fireEvent.keyDown(nameInput, { key: 'z', metaKey: true });
        expect(formInstance.getFieldValue('name')).toBe('Jo');
        expect(nameInput.value).toBe('Jo');

        fireEvent.keyDown(nameInput, { key: 'z', metaKey: true });
        expect(formInstance.getFieldValue('name')).toBe('J');
        expect(nameInput.value).toBe('J');

        fireEvent.keyDown(nameInput, { key: 'z', metaKey: true });
        expect(formInstance.getFieldValue('name')).toBe('');
        expect(nameInput.value).toBe('');
        expect(screen.queryByRole('button', { name: /Copy Name/i })).not.toBeInTheDocument();

        // Redo in AutoComplete field
        fireEvent.keyDown(nameInput, { key: 'z', metaKey: true, shiftKey: true });
        expect(formInstance.getFieldValue('name')).toBe('J');
        expect(nameInput.value).toBe('J');
        expect(screen.getByRole('button', { name: /Copy Name/i })).toBeInTheDocument();
    });
});
