from pathlib import Path

import pandas as pd
import streamlit as st

from engine.api_client import AeroSignApiClient
from engine.dread import idor_default_scores
from engine.runner import run_idor_scenario


st.set_page_config(page_title="AeroSign Security Simulation", layout="wide")

st.title("AeroSign Security Simulation")
st.caption("Scenario: Broken Access Control (IDOR) on user-scoped signatures endpoint")

base_url = st.text_input("API Base URL", value="http://127.0.0.1:8000")
mode = st.selectbox("Simulation Mode", ["vulnerable", "mitigated"], index=0)
simulate_fallback = st.toggle("Use simulated mitigation fallback when backend is unpatched", value=True)

scenario_path = Path(__file__).parent / "scenarios" / "idor_scenario.json"
client = AeroSignApiClient(base_url=base_url)

if "backend_status" not in st.session_state:
    st.session_state.backend_status = None

status_col, action_col = st.columns([2, 1])
with action_col:
    if st.button("Refresh Backend Status"):
        st.session_state.backend_status = client.check_backend_ready()

with status_col:
    status = st.session_state.backend_status
    if status is None:
        st.warning("Backend status not checked yet.")
    elif status["ok"]:
        st.success(f"Backend ready (HTTP {status['status_code']})")
    else:
        if status["status_code"] is None:
            st.error(f"Backend unreachable: {status['error']}")
        else:
            st.error(f"Backend not healthy (HTTP {status['status_code']})")

with st.expander("Backend Status Details"):
    if st.session_state.backend_status is None:
        st.info("Click 'Refresh Backend Status' to query GET /health")
    else:
        st.json(st.session_state.backend_status)

st.subheader("Run Simulation")
run_clicked = st.button("Run IDOR Simulation")

if run_clicked:
    try:
        outcome = run_idor_scenario(
            base_url,
            str(scenario_path),
            mode=mode,
            simulate_mitigation_fallback=simulate_fallback,
        )
        st.subheader("Execution Summary")
        st.json(outcome["summary"])

        if outcome["summary"].get("mitigation_simulation_used"):
            st.info("Mitigated status/result shown as simulation fallback for presentation narrative.")

        st.subheader("Step Results")
        table_rows = []
        for row in outcome["results"]:
            table_rows.append(
                {
                    "step": row["step"],
                    "endpoint": row["endpoint"],
                    "actor": row["actor"],
                    "status_code": row["status_code"],
                    "verdict": row["verdict"],
                }
            )
        st.dataframe(pd.DataFrame(table_rows), use_container_width=True)

        st.subheader("Raw Responses")
        for row in outcome["results"]:
            with st.expander(f"Step {row['step']} - {row['action']}"):
                st.json(row["response"])

        st.subheader("STRIDE Panel")
        stride_rows = [
            {"letter": "S", "category": "Spoofing", "aerosign_example": "Stolen Supabase token/session used to impersonate another user."},
            {"letter": "T", "category": "Tampering", "aerosign_example": "Path parameter tampering: /api/users/{user_id}/signatures switched to victim id."},
            {"letter": "R", "category": "Repudiation", "aerosign_example": "User denies action if logs do not bind actor, endpoint, and outcome."},
            {"letter": "I", "category": "Information Disclosure", "aerosign_example": "Unauthorized access to another user's signature metadata."},
            {"letter": "D", "category": "Denial of Service", "aerosign_example": "Flooding verify/frame endpoints to exhaust API resources."},
            {"letter": "E", "category": "Elevation of Privilege", "aerosign_example": "Normal user accesses resources outside authorized owner scope."},
        ]
        st.dataframe(pd.DataFrame(stride_rows), use_container_width=True)
        st.caption(f"Scenario-focused tags: {', '.join(outcome['stride_tags'])}")

        st.subheader("DREAD Panel (IDOR)")
        scores = idor_default_scores()
        score_table = pd.DataFrame(
            [
                {
                    "phase": "before",
                    "damage": scores["before"].damage,
                    "reproducibility": scores["before"].reproducibility,
                    "exploitability": scores["before"].exploitability,
                    "affected_users": scores["before"].affected_users,
                    "discoverability": scores["before"].discoverability,
                    "average": scores["before_avg"],
                },
                {
                    "phase": "after (placeholder)",
                    "damage": scores["after"].damage,
                    "reproducibility": scores["after"].reproducibility,
                    "exploitability": scores["after"].exploitability,
                    "affected_users": scores["after"].affected_users,
                    "discoverability": scores["after"].discoverability,
                    "average": scores["after_avg"],
                },
            ]
        )
        st.dataframe(score_table, use_container_width=True)
        st.info(f"Risk reduction placeholder: {scores['risk_reduction']}")
    except Exception as exc:
        st.error(f"Simulation failed: {exc}")
