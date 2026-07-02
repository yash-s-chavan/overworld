"""Background task helpers for keeping Overworld's data ready."""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from typing import Callable, List, Optional


@dataclass
class BackgroundTaskManager:
    """Very small background runner for one-off startup or refresh jobs."""

    tasks: List[str] = field(default_factory=list)
    running: bool = False
    last_error: Optional[str] = None

    def run_async(self, label: str, worker: Callable[[], None]) -> None:
        self.tasks.append(label)

        def _wrapped() -> None:
            self.running = True
            try:
                worker()
                self.last_error = None
            except Exception as exc:  # pragma: no cover - background safety
                self.last_error = str(exc)
            finally:
                self.running = False

        threading.Thread(target=_wrapped, daemon=True).start()

    def status(self) -> dict:
        return {
            "queued_tasks": list(self.tasks),
            "running": self.running,
            "last_error": self.last_error,
        }


