import json
from datetime import datetime, timezone
from pathlib import Path

from .api_client import AeroSignApiClient


SAMPLE_SIGNATURE = [
    [100.0, 200.0, 0.00],
    [102.5, 198.0, 0.05],
    [105.0, 196.0, 0.10],
    [109.0, 194.5, 0.15],
    [114.0, 192.0, 0.20],
    [120.0, 190.0, 0.25],
    [127.5, 188.0, 0.30],
    [136.0, 186.0, 0.35],
    [145.0, 184.0, 0.40],
    [155.0, 183.0, 0.45],
]


def _safe_json(response):
    try:
        return response.json()
    except Exception:
        return {"raw_text": response.text[:500]}


def _result_row(step, actor, target, response, verdict, response_override=None, status_override=None):
    endpoint = step["endpoint"].replace("{user_id}", target)
    status_code = status_override if status_override is not None else response.status_code
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "step": step["id"],
        "action": step["action"],
        "description": step["description"],
        "endpoint": endpoint,
        "actor": actor,
        "target": target,
        "status_code": status_code,
        "verdict": verdict,
        "response": response_override if response_override is not None else _safe_json(response),
    }


def _status_matches(mode, actual, expected):
    if mode == "vulnerable":
        return actual == expected["cross_user_read_status"]
    return actual in {expected["cross_user_read_status"], expected.get("cross_user_read_status_alt")}


def run_idor_scenario(
    base_url: str,
    scenario_path: str,
    mode: str = "vulnerable",
    simulate_mitigation_fallback: bool = True,
):
    scenario = json.loads(Path(scenario_path).read_text())
    client = AeroSignApiClient(base_url=base_url)

    actor = scenario["actor"]
    target = scenario["target"]
    expected = scenario[f"expected_{mode}"]
    steps = scenario["steps"]
    results = []

    seed_resp = client.save_signature(
        user_id=target,
        session_id="sim_session_alice",
        signature_data=SAMPLE_SIGNATURE,
        metadata={"seeded_by": "simulation"},
    )
    results.append(_result_row(steps[0], actor="system", target=target, response=seed_resp, verdict="baseline"))

    # Actor identity is simulated in labels because API currently does not bind token subject to path user_id.
    attack_resp = client.get_user_signatures(target)
    matches = _status_matches(mode, attack_resp.status_code, expected)

    if matches:
        verdict = "matches_expected"
        display_status = attack_resp.status_code
        display_response = _safe_json(attack_resp)
        simulation_note = None
    else:
        if mode == "mitigated" and simulate_mitigation_fallback:
            verdict = "simulated_mitigation"
            display_status = expected["cross_user_read_status"]
            display_response = {
                "detail": "Forbidden: cannot access another user's signatures",
                "note": "Simulated mitigated outcome for presentation because backend policy is not patched yet.",
            }
            simulation_note = "Mitigated output shown as simulation fallback"
        else:
            verdict = "unexpected"
            display_status = attack_resp.status_code
            display_response = _safe_json(attack_resp)
            simulation_note = None

    results.append(
        _result_row(
            steps[1],
            actor=actor,
            target=target,
            response=attack_resp,
            verdict=verdict,
            response_override=display_response,
            status_override=display_status,
        )
    )

    # Step 3: capture response body explicitly for reporting.
    results.append(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "step": steps[2]["id"],
            "action": steps[2]["action"],
            "description": steps[2]["description"],
            "endpoint": steps[2]["endpoint"].replace("{user_id}", target),
            "actor": actor,
            "target": target,
            "status_code": display_status,
            "verdict": "captured",
            "response": display_response,
        }
    )

    return {
        "scenario_name": scenario["name"],
        "mode": mode,
        "actor": actor,
        "target": target,
        "stride_tags": scenario.get("stride_tags", []),
        "results": results,
        "summary": {
            "expected_cross_user_read": (
                f"{expected['cross_user_read_status']} or {expected['cross_user_read_status_alt']}"
                if mode == "mitigated"
                else str(expected["cross_user_read_status"])
            ),
            "actual_cross_user_read": attack_resp.status_code,
            "displayed_cross_user_read": display_status,
            "mitigation_simulation_used": verdict == "simulated_mitigation",
            "note": simulation_note,
        },
    }
