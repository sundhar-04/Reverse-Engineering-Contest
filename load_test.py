import asyncio
import aiohttp
import json
import time
import statistics
from datetime import datetime

BASE_URL = "http://98.70.43.22:3000"
CONTEST_ID = "6a54f8b4b838cdd69da029f1"
PROBLEM_ID = "6a54f8b4b838cdd69da029f2"
NUM_PARTICIPANTS = 100
NUM_SUBMISSIONS = 60
POLL_TIMEOUT = 60

TEST_CODE = "n=int(input().strip())\nprint('Odd' if n % 2 == 1 else 'Even')"

results = {}

async def create_participant(session, idx):
    data = {"contest_id": CONTEST_ID, "name": f"User{idx:03d}", "roll_number": f"LT{int(time.time())}R{idx:03d}", "department": "CSE"}
    t0 = time.time()
    async with session.post(f"{BASE_URL}/api/participants/join", json=data) as resp:
        lat = (time.time() - t0) * 1000
        body = await resp.json()
        return {"idx": idx, "status": resp.status, "lat_ms": round(lat, 2), "body": body}

async def lookup_participant(session, pid):
    t0 = time.time()
    async with session.get(f"{BASE_URL}/api/participants/{pid}") as resp:
        lat = (time.time() - t0) * 1000
        body = await resp.json()
        return {"status": resp.status, "lat_ms": round(lat, 2), "body": body}

async def submit_code(session, pid):
    data = {"code": TEST_CODE, "participant_id": pid, "problem_id": PROBLEM_ID}
    t0 = time.time()
    async with session.post(f"{BASE_URL}/api/submissions/submit-queue", json=data) as resp:
        lat = (time.time() - t0) * 1000
        body = await resp.json()
        return {"pid": pid, "status": resp.status, "lat_ms": round(lat, 2), "body": body, "enq_t": t0}

async def poll_job(session, job_id, enq_t):
    for attempt in range(POLL_TIMEOUT * 2):
        t0 = time.time()
        async with session.get(f"{BASE_URL}/api/submissions/queue-status/{job_id}") as resp:
            poll_lat = (time.time() - t0) * 1000
            if resp.status != 200:
                await asyncio.sleep(0.5)
                continue
            body = await resp.json()
            st = body.get("status", "unknown")
            total = (time.time() - enq_t) * 1000
            if st in ("completed", "failed"):
                return {"job_id": job_id, "status": st, "total_ms": round(total, 2), "att": attempt + 1, "result": body}
            await asyncio.sleep(0.5)
    return {"job_id": job_id, "status": "timeout", "total_ms": POLL_TIMEOUT * 1000, "att": POLL_TIMEOUT * 2, "result": {}}

async def main():
    print(f"Load Test @ {datetime.utcnow().isoformat()}")
    print(f"Target: {BASE_URL}")
    print(f"Participants: {NUM_PARTICIPANTS}, Submissions: {NUM_SUBMISSIONS}")

    # Phase 1: create participants
    print("\n=== PHASE 1: Creating participants ===")
    t0 = time.time()
    async with aiohttp.ClientSession() as s:
        parts = await asyncio.gather(*[create_participant(s, i) for i in range(NUM_PARTICIPANTS)])
    t_el = time.time() - t0
    ok = [p for p in parts if p["status"] == 200]
    lats1 = [p["lat_ms"] for p in ok]
    print(f"Created {len(ok)}/{NUM_PARTICIPANTS} in {t_el:.2f}s")
    if lats1:
        s1 = sorted(lats1)
        print(f"Lat: p50={statistics.median(lats1):.0f} p95={s1[int(len(s1)*0.95)]:.0f} p99={s1[int(len(s1)*0.99)]:.0f}ms")
    results["phase1"] = {"count": len(ok), "time": round(t_el, 2), "lats": lats1}
    pids = [p["body"]["participant_id"] for p in ok if "participant_id" in p.get("body", {})]
    if len(pids) < NUM_SUBMISSIONS:
        print(f"ERROR: Only {len(pids)} participants available")
        return

    # Phase 2: parallel lookups (simulated logins)
    print("\n=== PHASE 2: 100 parallel lookups ===")
    t0 = time.time()
    async with aiohttp.ClientSession() as s:
        lookups = await asyncio.gather(*[lookup_participant(s, p) for p in pids[:100]])
    t_el = time.time() - t0
    ok2 = [l for l in lookups if l["status"] == 200]
    lats2 = [l["lat_ms"] for l in ok2]
    print(f"{len(ok2)}/100 OK in {t_el:.2f}s ({100/t_el:.0f} req/s)")
    if lats2:
        s2 = sorted(lats2)
        print(f"Lat: p50={statistics.median(lats2):.0f} p95={s2[int(len(s2)*0.95)]:.0f} p99={s2[int(len(s2)*0.99)]:.0f}ms")
    results["phase2"] = {"count": len(ok2), "time": round(t_el, 2), "rps": round(100/t_el, 2), "lats": lats2}

    # Phase 3: parallel submissions
    print(f"\n=== PHASE 3: {NUM_SUBMISSIONS} parallel submits ===")
    t0 = time.time()
    async with aiohttp.ClientSession() as s:
        subs = await asyncio.gather(*[submit_code(s, p) for p in pids[:NUM_SUBMISSIONS]])
    t_el = time.time() - t0
    ok3 = [x for x in subs if x["status"] == 200]
    lats3 = [x["lat_ms"] for x in ok3]
    print(f"{len(ok3)}/{NUM_SUBMISSIONS} enqueued in {t_el:.2f}s ({NUM_SUBMISSIONS/t_el:.0f} req/s)")
    if lats3:
        s3 = sorted(lats3)
        print(f"Enq lat: p50={statistics.median(lats3):.0f} p95={s3[int(len(s3)*0.95)]:.0f} p99={s3[int(len(s3)*0.99)]:.0f}ms")
    results["phase3_enqueue"] = {"count": len(ok3), "time": round(t_el, 2), "rps": round(NUM_SUBMISSIONS/t_el, 2), "lats": lats3}

    # Phase 4: poll for completion
    print(f"\n=== PHASE 4: Polling {len(ok3)} jobs ===")
    poll_start = time.time()
    async with aiohttp.ClientSession() as s:
        tasks = []
        for x in ok3:
            jid = x["body"].get("job_id", "")
            if jid:
                tasks.append(poll_job(s, jid, x["enq_t"]))
        job_results = await asyncio.gather(*tasks) if tasks else []
    poll_el = time.time() - poll_start

    done = [j for j in job_results if j["status"] == "completed"]
    fail = [j for j in job_results if j["status"] == "failed"]
    to = [j for j in job_results if j["status"] == "timeout"]
    still_queued = sum(1 for j in job_results if j["status"] == "queued")
    total_times = [j["total_ms"] for j in done]

    print(f"Completed: {len(done)}, Failed: {len(fail)}, Timeout: {len(to)}")
    print(f"Poll duration: {poll_el:.2f}s")
    if total_times:
        st = sorted(total_times)
        print(f"E2E lat: p50={statistics.median(total_times):.0f} p95={st[int(len(st)*0.95)]:.0f} p99={st[int(len(st)*0.99)]:.0f}ms")
    results["phase4_completion"] = {"done": len(done), "fail": len(fail), "timeout": len(to), "poll_s": round(poll_el, 2), "e2e": total_times, "details": job_results}

    # Report
    print("\n" + "=" * 60)
    print("LOAD TEST REPORT")
    print("=" * 60)

    p1 = results["phase1"]
    p2 = results["phase2"]
    p3 = results["phase3_enqueue"]
    p4 = results["phase4_completion"]

    print(f"\n1. Participant Creation: {p1['count']} created in {p1['time']}s")
    l1 = p1["lats"]
    if l1:
        s1 = sorted(l1)
        print(f"   Latency p50/p95/p99: {statistics.median(l1):.0f}/{s1[int(len(s1)*0.95)]:.0f}/{s1[int(len(s1)*0.99)]:.0f} ms")

    print(f"\n2. Concurrent Lookups (100 parallel):")
    print(f"   Success: {p2['count']}/100, Throughput: {p2['rps']} req/s")
    l2 = p2["lats"]
    if l2:
        s2 = sorted(l2)
        print(f"   Latency p50/p95/p99: {statistics.median(l2):.0f}/{s2[int(len(s2)*0.95)]:.0f}/{s2[int(len(s2)*0.99)]:.0f} ms")
        print(f"   Min: {min(l2):.0f} ms, Max: {max(l2):.0f} ms")

    print(f"\n3. Queue Submissions ({NUM_SUBMISSIONS} parallel):")
    print(f"   Enqueued: {p3['count']}/{NUM_SUBMISSIONS} in {p3['time']}s")
    l3 = p3["lats"]
    if l3:
        s3 = sorted(l3)
        print(f"   Enqueue latency p50/p95/p99: {statistics.median(l3):.0f}/{s3[int(len(s3)*0.95)]:.0f}/{s3[int(len(s3)*0.99)]:.0f} ms")
    print(f"   Completed: {p4['done']}, Failed: {p4['fail']}, Timeout/stuck: {p4['timeout']}")
    if p4["e2e"]:
        st = sorted(p4["e2e"])
        print(f"   End-to-end latency p50/p95/p99: {statistics.median(p4['e2e']):.0f}/{st[int(len(st)*0.95)]:.0f}/{st[int(len(st)*0.99)]:.0f} ms")

    print(f"\n4. Bottleneck Analysis:")
    if still_queued := sum(1 for j in job_results if j.get("status") == "timeout"):
        print(f"   ** CRITICAL: {still_queued} jobs never completed (stuck in queue)")
        print(f"   -> Workers not processing. Check: docker logs reverse-engineering-contest-worker-1")
        print(f"   -> Likely causes: worker startup crash, Redis connectivity, import error")
    elif p4["done"] == NUM_SUBMISSIONS and p4["e2e"]:
        avg = statistics.mean(p4["e2e"])
        print(f"   All jobs completed. Average E2E time: {avg:.0f} ms")
        if avg > 5000:
            print(f"   -> Performance bottleneck: high latency (>5s per submission)")
        else:
            print(f"   -> System appears healthy")
    else:
        print(f"   -> Partial completion. Need worker investigation.")

    print(f"\n5. Recommendations:")
    if still_queued:
        print(f"   - Run on VM: docker logs reverse-engineering-contest-worker-1")
        print(f"   - Run on VM: docker logs reverse-engineering-contest-worker-2")
        print(f"   - Run on VM: docker exec reversecode-redis redis-cli LLEN judge:queue")
        print(f"   - Common fix: ensure all env vars are set for worker containers")
    else:
        print(f"   - System handles 100 concurrent lookups and 60 queue submissions")
        print(f"   - Consider increasing workers if submission volume grows")
        print(f"   - Monitor Redis queue depth under sustained load")

    report = {
        "timestamp": datetime.utcnow().isoformat(),
        "target": BASE_URL,
        "config": {"participants": NUM_PARTICIPANTS, "submissions": NUM_SUBMISSIONS, "vm": "Standard_B2as_v2 (2 vCPU, 8 GB RAM)"},
        "results": {
            "creation": {"count": p1["count"], "time_s": p1["time"], "p50": round(statistics.median(l1), 2) if l1 else None, "p95": round(sorted(l1)[int(len(l1)*0.95)], 2) if l1 else None, "p99": round(sorted(l1)[int(len(l1)*0.99)], 2) if l1 else None},
            "lookups": {"count": p2["count"], "time_s": p2["time"], "rps": p2["rps"], "p50": round(statistics.median(l2), 2) if l2 else None, "p95": round(sorted(l2)[int(len(l2)*0.95)], 2) if l2 else None, "p99": round(sorted(l2)[int(len(l2)*0.99)], 2) if l2 else None, "min": round(min(l2),2) if l2 else None, "max": round(max(l2),2) if l2 else None},
            "submissions": {"enqueued": p3["count"], "enq_time_s": p3["time"], "enq_rps": p3["rps"], "enq_p50": round(statistics.median(l3), 2) if l3 else None, "enq_p95": round(sorted(l3)[int(len(l3)*0.95)], 2) if l3 else None, "enq_p99": round(sorted(l3)[int(len(l3)*0.99)], 2) if l3 else None, "completed": p4["done"], "failed": p4["fail"], "timeout": p4["timeout"], "e2e_p50": round(statistics.median(p4["e2e"]), 2) if p4["e2e"] else None, "e2e_p95": round(sorted(p4["e2e"])[int(len(p4["e2e"])*0.95)], 2) if p4["e2e"] else None, "e2e_p99": round(sorted(p4["e2e"])[int(len(p4["e2e"])*0.99)], 2) if p4["e2e"] else None}
        },
        "issues": ["Workers did not process queue jobs - check docker logs on VM"] if still_queued else []
    }
    with open("/tmp/load_test_report.json", "w") as f:
        json.dump(report, f, indent=2, default=str)
    print(f"\nFull JSON report saved to /tmp/load_test_report.json")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
