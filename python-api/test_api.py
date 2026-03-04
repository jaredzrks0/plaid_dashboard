from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_root():
	response = client.get("/")
	assert response.status_code == 200
	assert "message" in response.json()

def test_get_current_account_balances():
	response = client.get("/accounts/current-balances")
	assert response.status_code == 200
	assert isinstance(response.json(), list)

def test_get_accounts_table():
	response = client.get("/accounts/")
	assert response.status_code == 200
	assert isinstance(response.json(), list)

def test_get_transactions():
	response = client.get(
		"/transactions/?sort_by=transaction_date&sort_desc=true&limit=50&offset=0"
	)
	assert response.status_code == 200
	data = response.json()
	assert isinstance(data, dict)
	assert "transactions" in data
	assert "total_count" in data
	assert "categories" in data
	assert "accounts" in data
	assert isinstance(data["transactions"], list)
	assert isinstance(data["total_count"], int)
	assert isinstance(data["categories"], list)
	assert isinstance(data["accounts"], list)

	# Verify transaction structure if any exist
	if data["transactions"]:
		tx = data["transactions"][0]
		assert "transaction_id" in tx
		assert "transaction_date" in tx
		assert "transaction_amount" in tx
		assert "account_id" in tx
