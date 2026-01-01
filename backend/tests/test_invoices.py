def test_create_new_invoice_id(client):
    # Test the endpoint that generates a new ID
    response = client.post("/api/invoices/new")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert isinstance(data["id"], int)

def test_get_empty_list(client):
    # Test getting the list of invoices (should be empty initially)
    response = client.get("/api/invoices/list")
    assert response.status_code == 200
    assert response.json() == []