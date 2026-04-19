import requests


class AeroSignApiClient:
    def __init__(self, base_url: str = "http://127.0.0.1:8000", timeout: int = 20):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def check_backend_ready(self) -> dict:
        """Check API reachability and health endpoint response."""
        try:
            response = requests.get(self._url("/health"), timeout=self.timeout)
            try:
                payload = response.json()
            except Exception:
                payload = {"raw_text": response.text[:500]}

            return {
                "ok": response.ok,
                "status_code": response.status_code,
                "payload": payload,
                "error": None,
            }
        except requests.RequestException as exc:
            return {
                "ok": False,
                "status_code": None,
                "payload": None,
                "error": str(exc),
            }

    def save_signature(self, user_id: str, session_id: str, signature_data: list, metadata: dict | None = None):
        payload = {
            "user_id": user_id,
            "session_id": session_id,
            "signature_data": signature_data,
            "metadata": metadata or {},
        }
        return requests.post(self._url("/api/signatures/save"), json=payload, timeout=self.timeout)

    def get_user_signatures(self, user_id: str):
        return requests.get(self._url(f"/api/users/{user_id}/signatures"), timeout=self.timeout)

    def verify_against_user(self, user_id: str, signature_data: list):
        payload = {"signature_data": signature_data}
        return requests.post(self._url(f"/api/users/{user_id}/verify"), json=payload, timeout=self.timeout)
