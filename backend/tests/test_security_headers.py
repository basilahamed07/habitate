def test_security_headers_present(client):
    response = client.get("/api/health")
    assert response.headers.get("Content-Security-Policy")
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
