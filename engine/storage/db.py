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
# Forecasts
# ---------------------------------------------------------------------------

def insert_forecast(
    app_name: str,
    city: str,
    forecast_date: str,
    forecast_hour: int,
    predicted_score: float,
    confidence: Optional[float] = None,
    components: Optional[dict] = None,
) -> bool:
    """Insert a forecast row. Returns True if inserted, False if duplicate."""
    comp_json = json.dumps(components) if components else None

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT OR REPLACE INTO forecasts
                (app_name, city, forecast_date, forecast_hour,
                 predicted_score, confidence, components)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (app_name, city, forecast_date, forecast_hour,
             predicted_score, confidence, comp_json),
        )
        return cursor.rowcount > 0


def get_forecasts(
    app_name: str,
    city: str,
    days: int = 7,
) -> list[dict[str, Any]]:
    """Return forecasts for the next N days."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT * FROM forecasts
            WHERE app_name = ? AND city = ?
              AND forecast_date >= date('now')
              AND forecast_date <= date('now', ? || ' days')
            ORDER BY forecast_date, forecast_hour
            """,
            (app_name, city, str(days)),
        ).fetchall()
        return [dict(row) for row in rows]


# ---------------------------------------------------------------------------
# Aggregation helpers (for normalizer / scorer)
# ---------------------------------------------------------------------------

def get_signals_in_range(
    source: Optional[str] = None,
    app_name: Optional[str] = None,
    city: Optional[str] = None,
    metric_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Query raw signals with optional date range filters."""
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
    if start_date is not None:
        clauses.append("collected_at >= ?")
        params.append(start_date)
    if end_date is not None:
        clauses.append("collected_at <= ?")
        params.append(end_date)

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    query = f"SELECT * FROM raw_signals {where} ORDER BY collected_at ASC"

    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
        return [dict(row) for row in rows]


def get_signal_values(
    source: str,
    app_name: str,
    city: str,
    metric_type: str,
    limit: int = 10000,
) -> list[float]:
    """Return just the values for a specific signal type (for percentile calc)."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT value FROM raw_signals
            WHERE source = ? AND app_name = ? AND city = ? AND metric_type = ?
            ORDER BY collected_at DESC
            LIMIT ?
            """,
            (source, app_name, city, metric_type, limit),
        ).fetchall()
        return [row["value"] for row in rows]


def get_scores_history(
    app_name: str,
    city: str,
    limit: int = 1000,
) -> list[dict[str, Any]]:
    """Return recent scores for an app+city pair, oldest first."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT * FROM scores
            WHERE app_name = ? AND city = ?
            ORDER BY computed_at DESC
            LIMIT ?
            """,
            (app_name, city, limit),
        ).fetchall()
        return [dict(row) for row in reversed(rows)]


def get_latest_signal_value(
    source: str,
    app_name: str,
    city: str,
    metric_type: str,
) -> Optional[float]:
    """Return the most recent signal value, or None."""
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT value FROM raw_signals
            WHERE source = ? AND app_name = ? AND city = ? AND metric_type = ?
            ORDER BY collected_at DESC
            LIMIT 1
            """,
            (source, app_name, city, metric_type),
        ).fetchone()
        return row["value"] if row else None


def count_signals(
    source: Optional[str] = None,
    app_name: Optional[str] = None,
) -> int:
    """Count total signals matching optional filters."""
    clauses: list[str] = []
    params: list[Any] = []

    if source is not None:
        clauses.append("source = ?")
        params.append(source)
    if app_name is not None:
        clauses.append("app_name = ?")
        params.append(app_name)

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    with get_connection() as conn:
        row = conn.execute(
            f"SELECT COUNT(*) as cnt FROM raw_signals {where}", params
        ).fetchone()
        return row["cnt"]


# ---------------------------------------------------------------------------
# Telegram users
# ---------------------------------------------------------------------------

def upsert_telegram_user(
    chat_id: int,
    username: Optional[str] = None,
    city: str = "paris",
    apps: str = "tinder,bumble,hinge,happn",
) -> bool:
    """Insert or update a Telegram user. Returns True if new user."""
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM telegram_users WHERE chat_id = ?", (chat_id,)
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE telegram_users SET username = ?, active = 1 WHERE chat_id = ?",
                (username, chat_id),
            )
            return False
        else:
            conn.execute(
                """INSERT INTO telegram_users (chat_id, username, city, apps)
                   VALUES (?, ?, ?, ?)""",
                (chat_id, username, city, apps),
            )
            return True


def get_telegram_user(chat_id: int) -> Optional[dict[str, Any]]:
    """Return a Telegram user by chat_id, or None."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM telegram_users WHERE chat_id = ?", (chat_id,)
        ).fetchone()
        return dict(row) if row else None


def update_telegram_user_settings(
    chat_id: int,
    city: Optional[str] = None,
    apps: Optional[str] = None,
) -> None:
    """Update city and/or apps for a Telegram user."""
    updates: list[str] = []
    params: list[Any] = []
    if city is not None:
        updates.append("city = ?")
        params.append(city)
    if apps is not None:
        updates.append("apps = ?")
        params.append(apps)
    if not updates:
        return
    params.append(chat_id)
    with get_connection() as conn:
        conn.execute(
            f"UPDATE telegram_users SET {', '.join(updates)} WHERE chat_id = ?",
            params,
        )


def get_active_telegram_users() -> list[dict[str, Any]]:
    """Return all active Telegram users."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM telegram_users WHERE active = 1"
        ).fetchall()
        return [dict(row) for row in rows]


def count_telegram_users() -> int:
    """Return total active Telegram user count."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as cnt FROM telegram_users WHERE active = 1"
        ).fetchone()
        return row["cnt"]


# ---------------------------------------------------------------------------
# Alerts log
# ---------------------------------------------------------------------------

def insert_alert_log(
    chat_id: int,
    app_name: str,
    city: str,
    score: float,
    alert_type: str,
) -> None:
    """Log an alert that was sent."""
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO alerts_log (chat_id, app_name, city, score, alert_type)
               VALUES (?, ?, ?, ?, ?)""",
            (chat_id, app_name, city, score, alert_type),
        )


def count_alerts_today(chat_id: int) -> int:
    """Count alerts sent to a user today."""
    with get_connection() as conn:
        row = conn.execute(
            """SELECT COUNT(*) as cnt FROM alerts_log
               WHERE chat_id = ? AND date(sent_at) = date('now')""",
            (chat_id,),
        ).fetchone()
        return row["cnt"]


def get_last_alert_time(chat_id: int, app_name: str) -> Optional[str]:
    """Return the timestamp of the last alert sent for an app, or None."""
    with get_connection() as conn:
        row = conn.execute(
            """SELECT sent_at FROM alerts_log
               WHERE chat_id = ? AND app_name = ?
               ORDER BY sent_at DESC LIMIT 1""",
            (chat_id, app_name),
        ).fetchone()
        return row["sent_at"] if row else None


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_db()
    print("Database initialized successfully.")
