"""Live 100-check acceptance probe; stratified CSV sample, 20 guest sessions x 5 checks."""
import csv
import argparse
import hashlib
import json
import math
import random
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import requests

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True)
    args = parser.parse_args()
    source = Path(args.csv)
    with source.open(encoding="utf-8-sig", newline="") as handle:
        corpus = [dict(row, source_row=i + 2) for i, row in enumerate(csv.DictReader(handle))]
    corpus = [row for row in corpus if row.get("message", "").strip()]
    groups = {label: [row for row in corpus if row["label"] == label]
              for label in sorted({row["label"] for row in corpus})}
    quotas = {label: int(100 * len(rows) / len(corpus)) for label, rows in groups.items()}
    for label in sorted(groups, key=lambda label: 100 * len(groups[label]) / len(corpus) - quotas[label], reverse=True)[:100 - sum(quotas.values())]:
        quotas[label] += 1
    rng = random.Random(42)
    selected = [row for label, group in groups.items() for row in rng.sample(group, quotas[label])]
    rng.shuffle(selected)
    output = Path(__file__).resolve().parent / "benchmark_results"
    output.mkdir(exist_ok=True)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    rows = []
    started_at = datetime.now(timezone.utc).isoformat()
    with requests.Session() as client:
        for group in range(20):
            session = client.post("http://localhost:8080/api/guest/sessions", json={}, timeout=15)
            session.raise_for_status()
            token = session.json()["data"]["sessionToken"]
            for index, sample in enumerate(selected[group * 5:(group + 1) * 5]):
                message = sample["message"]
                started = time.perf_counter()
                row = {"sample": len(rows) + 1, "session_group": group + 1,
                       "source_row": sample["source_row"], "gold_label": sample["label"], "http_status": 0,
                       "verdict": "", "stage": "", "unknown_reason": "",
                       "check_id": None, "valid_result": False, "error": ""}
                try:
                    response = client.post("http://localhost:8080/api/scam-checks",
                        headers={"X-Guest-Session": token},
                        json={"inputType": "MESSAGE", "content": message}, timeout=65)
                    row["latency_ms"] = round((time.perf_counter() - started) * 1000, 3)
                    row["http_status"] = response.status_code
                    data = response.json().get("data") or {}
                    row.update(verdict=data.get("verdict", ""), stage=data.get("decidedByStage", ""),
                               unknown_reason=data.get("unknownReason") or "", check_id=data.get("checkId"))
                    row["valid_result"] = (response.status_code == 200 and data.get("status") == "COMPLETED"
                        and row["verdict"] in {"SCAM_RISK", "LOW_RISK", "UNKNOWN"}
                        and bool((data.get("explanation") or "").strip()))
                except Exception as exc:
                    row["latency_ms"] = round((time.perf_counter() - started) * 1000, 3)
                    row["error"] = type(exc).__name__
                row["within_3s"] = row["valid_result"] and row["latency_ms"] <= 3000
                rows.append(row)
                print(json.dumps(row), flush=True)
                (output / f"{run_id}.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
    latency = sorted(row["latency_ms"] for row in rows)
    fast = sum(row["within_3s"] for row in rows)
    summary = {"run_id": run_id, "started_at_utc": started_at,
        "completed_at_utc": datetime.now(timezone.utc).isoformat(), "total": len(rows),
        "valid_results": sum(row["valid_result"] for row in rows), "within_3s": fast,
        "within_3s_percent": fast / len(rows) * 100, "passed": len(rows) == 100 and fast >= 95,
        "mean_ms": sum(latency) / len(latency), "p50_ms": latency[math.ceil(.5 * len(latency)) - 1],
        "p95_ms": latency[math.ceil(.95 * len(latency)) - 1], "max_ms": max(latency),
        "stages": dict(Counter(row["stage"] for row in rows)),
        "verdicts": dict(Counter(row["verdict"] for row in rows)),
        "unknown_reasons": dict(Counter(row["unknown_reason"] for row in rows if row["unknown_reason"])),
        "dataset": str(source), "dataset_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "dataset_nonblank_rows": len(corpus), "selected_labels": quotas, "seed": 42,
        "method": "100 stratified CSV rows, seed 42; sequential HTTP, 20 guest sessions x 5 checks; no excluded warmup; session creation excluded; errors retained in denominator."}
    (output / f"{run_id}_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    with (output / f"{run_id}.csv").open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    print("SUMMARY " + json.dumps(summary), flush=True)


if __name__ == "__main__":
    main()
