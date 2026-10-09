import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("ci_monitor", Path(__file__).parents[1] / "ci-monitor.py")
monitor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(monitor)


def pr(status="COMPLETED", conclusion="SUCCESS", head="abc"):
    return {"number": 60, "headRefOid": head, "isDraft": False, "state": "OPEN", "labels": [{"name": "ci:awaiting"}],
            "closingIssuesReferences": [{"number": 59, "repository": {"name": "mrbyte-blogger", "owner": {"login": "mrbyte66"}}}],
            "statusCheckRollup": [{"name": name, "workflowName": "CI", "status": status, "conclusion": conclusion,
                                    "completedAt": "now", "detailsUrl": "https://github.com/run/1"} for name in monitor.EXPECTED]}

ISSUE = {"number": 59, "url": "https://github.com/mrbyte66/mrbyte-blogger/issues/59", "state": "OPEN",
         "labels": [{"name": "agent:codex"}, {"name": "test:claude"}],
         "projectItems": [{"title": "Satir", "status": {"name": "In Progress"}}]}
CONFIG = {"gh": "fake-gh", "repo": "mrbyte66/mrbyte-blogger", "owner": "mrbyte66", "project_title": "Satir"}


class MonitorTest(unittest.TestCase):
    def test_waits_for_all_checks_and_never_treats_skipped_as_success(self):
        self.assertIsNone(monitor.completed(pr("IN_PROGRESS")))
        incomplete = pr(); incomplete["statusCheckRollup"].pop()
        self.assertIsNone(monitor.completed(incomplete))
        self.assertEqual(monitor.completed(pr(conclusion="SKIPPED"))["result"], "failure")
        self.assertIsNone(monitor.completed(dict(pr(), state="MERGED")))
        self.assertIsNone(monitor.completed(dict(pr(), isDraft=True)))

    def exercise(self, snapshot, state, path, agent, deliver, changed=False):
        def github(config, *args, **kwargs):
            if args[:2] == ("pr", "list"): return [snapshot]
            if args[:2] == ("pr", "view"): return pr(head="new") if changed else snapshot
            return ISSUE
        with patch.object(monitor, "gh", side_effect=github), patch.object(monitor, "summarize", agent), patch.object(monitor, "deliver", deliver), patch.object(monitor, "run"):
            monitor.process(CONFIG, state, path)

    def test_no_ready_signal_does_not_start_agent(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(monitor, "summarize") as agent, patch.object(monitor, "deliver") as deliver:
            self.exercise(dict(pr(), labels=[]), {}, Path(folder) / "state.json", agent, deliver)
            agent.assert_not_called(); deliver.assert_not_called()

    def test_pending_does_not_start_agent(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(monitor, "summarize") as agent, patch.object(monitor, "deliver") as deliver:
            self.exercise(pr("QUEUED"), {}, Path(folder) / "state.json", agent, deliver)
            agent.assert_not_called(); deliver.assert_not_called()

    def test_completed_result_is_delivered_once(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(monitor, "summarize", return_value="CI geçti.") as agent, patch.object(monitor, "deliver") as deliver:
            path = Path(folder) / "state.json"; state = {}
            self.exercise(pr(), state, path, agent, deliver)
            self.exercise(pr(), json.loads(path.read_text()), path, agent, deliver)
            agent.assert_called_once(); deliver.assert_called_once()

    def test_head_change_during_agent_run_prevents_handoff(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(monitor, "summarize", return_value="CI geçti.") as agent, patch.object(monitor, "deliver") as deliver:
            self.exercise(pr(), {}, Path(folder) / "state.json", agent, deliver, changed=True)
            agent.assert_called_once(); deliver.assert_not_called()

    def test_agent_error_does_not_create_infinite_credit_retry(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(monitor, "summarize", side_effect=ValueError("limit")) as agent, patch.object(monitor, "deliver") as deliver:
            path = Path(folder) / "state.json"; state = {}
            self.exercise(pr(), state, path, agent, deliver)
            self.exercise(pr(), state, path, agent, deliver)
            agent.assert_called_once(); deliver.assert_not_called()

    def test_in_test_issue_is_not_reclaimed(self):
        issue = dict(ISSUE, projectItems=[{"title": "Satir", "status": {"name": "In Test"}}])
        self.assertFalse(monitor.eligible(CONFIG, issue))

    def test_rerun_or_new_commit_has_distinct_identity(self):
        self.assertNotEqual(monitor.completed(pr())["key"], monitor.completed(pr(head="new"))["key"])
        rerun = pr()
        for check in rerun["statusCheckRollup"]: check["completedAt"] = "later"
        self.assertNotEqual(monitor.completed(pr())["key"], monitor.completed(rerun)["key"])


if __name__ == "__main__":
    unittest.main()
