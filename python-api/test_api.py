from fastapi.testclient import TestClient
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import api

client = TestClient(api.app)

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
