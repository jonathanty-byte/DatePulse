"""
SQLite storage layer for DatePulse.

Provides a context-managed connection, schema initialization, and
convenience functions for inserting / querying raw signals and scores.
"""

import json
import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Generator, Optional

from engine.config import DB_PATH

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Connection helper
# ---------------------------------------------------------------------------

@contextmanager
def get_connection() -> Generator[sqlite3.Connection, None, None]:
    """Yield a fresh SQLite connection with WAL mode and Row factory."""
    # Ensure parent directory exists
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS raw_signals (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    source        TEXT    NOT NULL,
    app_name      TEXT    NOT NULL,
    city          TEXT    NOT NULL,
    metric_type   TEXT    NOT NULL,
    value         REAL    NOT NULL,
    metadata      TEXT,
    collected_at  TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(source, app_name, city, metric_type, collected_at)
);

CREATE TABLE IF NOT EXISTS scores (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    app_name      TEXT    NOT NULL,
    city          TEXT    NOT NULL,
    score         REAL    NOT NULL,
    percentile    REAL,
    trend         TEXT,
    components    TEXT,
    computed_at   TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(app_name, city, computed_at)
);

CREATE TABLE IF NOT EXISTS forecasts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    app_name      TEXT    NOT NULL,
    city          TEXT    NOT NULL,
    forecast_date TEXT    NOT NULL,
    forecast_hour INTEGER,
    predicted_score REAL  NOT NULL,
    confidence    REAL,
    components    TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(app_name, city, forecast_date, forecast_hour)
);

CREATE TABLE IF NOT EXISTS telegram_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id       INTEGER NOT NULL UNIQUE,
    username      TEXT,
    city          TEXT    NOT NULL DEFAULT 'paris',
    apps          TEXT    NOT NULL DEFAULT 'tinder,bumble,hinge,happn',
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alerts_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id       INTEGER NOT NULL,
    app_name      TEXT    NOT NULL,
    city          TEXT    NOT NULL,
    score         REAL    NOT NULL,
    alert_type    TEXT    NOT NULL,
    sent_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for time-series queries
CREATE INDEX IF NOT EXISTS idx_raw_signals_lookup
    ON raw_signals(source, app_name, city, metric_type, collected_at);
CREATE INDEX IF NOT EXISTS idx_scores_lookup
    ON scores(app_name, city, computed_at);
CREATE INDEX IF NOT EXISTS idx_forecasts_lookup
    ON forecasts(app_name, city, forecast_date);
CREATE INDEX IF NOT EXISTS idx_alerts_log_chat
    ON alerts_log(chat_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_telegram_users_active
    ON telegram_users(active, city);
"""


def init_db() -> None:
    """Create all tables and indexes if they don't exist."""
    with get_connection() as conn:
        conn.executescript(_SCHEMA_SQL)
    logger.info("Database initialized at %s", DB_PATH)


# ---------------------------------------------------------------------------
# Raw signals
# ---------------------------------------------------------------------------

def insert_raw_signal(
    source: str,
    app_name: str,
    city: str,
    metric_type: str,
    value: float,
    metadata: Optional[dict] = None,
    collected_at: Optional[str] = None,
) -> bool:
    """
    Insert a raw signal row. Returns True if inserted, False if duplicate.
    """
    if collected_at is None:
        collected_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    meta_json = json.dumps(metadata) if metadata else None

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT OR IGNORE INTO raw_signals
                (source, app_name, city, metric_type, value, metadata, collected_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (source, app_name, city, metric_type, value, meta_json, collected_at),
        )
        return cursor.rowcount > 0


def get_signals(
    source: Optional[str] = None,
    app_name: Optional[str] = None,
    city: Optional[str] = None,
    metric_type: Optional[str] = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Query raw signals with optional filters."""
    clauses: list[str] = []
    params: list[Any] = []

    if source is not None:
        clauses.append("source = ?")
        params.append(source)
    if app_name is not None:
        clauses.append("app_name = ?")
        params.append(app_name)
    if city is not None:
        clauses.append("city = ?")
        params.append(city)
    if metric_type is not None:
        clauses.append("metric_type = ?")
        params.append(metric_type)

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    query = f"SELECT * FROM raw_signals {where} ORDER BY collected_at DESC LIMIT ?"
    params.append(limit)

    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
        return [dict(row) for row in rows]


# ---------------------------------------------------------------------------
# Scores
# ---------------------------------------------------------------------------

def insert_score(
    app_name: str,
    city: str,
    score: float,
    percentile: Optional[float] = None,
    trend: Optional[str] = None,
    components: Optional[dict] = None,
) -> bool:
    """Insert a computed score. Returns True if inserted, False if duplicate."""
    computed_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    comp_json = json.dumps(components) if components else None

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT OR IGNORE INTO scores
                (app_name, city, score, percentile, trend, components, computed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (app_name, city, score, percentile, trend, comp_json, computed_at),
        )
        return cursor.rowcount > 0


def get_latest_score(app_name: str, city: str) -> Optional[dict[str, Any]]:
    """Return the most recent score for an app+city pair, or None."""
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT * FROM scores
            WHERE app_name = ? AND city = ?
            ORDER BY computed_at DESC
            LIMIT 1
            """,
            (app_name, city),
        ).fetchone()
        return dict(row) if row else None


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_db()
    print("Database initialized successfully.")
