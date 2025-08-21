import { useEffect, useState } from "react";
import InvoiceForm from "./components/InvoiceForm";
import InvoiceList from "./components/InvoiceList";
import { getInvoices } from "./api";

function App() {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    getInvoices().then(data => setInvoices(data));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Invoice Maker</h1>
      <InvoiceForm onNewInvoice={setInvoices} />
      <InvoiceList invoices={invoices} />
    </div>
  );
}

export default App;