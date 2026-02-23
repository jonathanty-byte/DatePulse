"""
End-to-end pipeline tests for DatePulse.

Tests the full data flow: DB init -> collect -> normalize -> score -> forecast.
Uses a temporary SQLite database for each test.
"""

import json
import sqlite3
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import pytest


# ---------------------------------------------------------------------------
# Fixture: temporary database
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def temp_db(tmp_path):
    """Redirect DB_PATH to a temp file for each test."""
    db_path = tmp_path / "test_datepulse.db"
    # Patch at the point of use (engine.storage.db uses DB_PATH)
    with patch("engine.storage.db.DB_PATH", db_path):
        from engine.storage import db
        db.init_db()
        yield db_path


# ---------------------------------------------------------------------------
# 1. Database initialization
# ---------------------------------------------------------------------------

class TestDatabaseInit:
    def test_tables_created(self, temp_db):
        conn = sqlite3.connect(str(temp_db))
        conn.row_factory = sqlite3.Row
        tables = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).fetchall()
        table_names = sorted(row["name"] for row in tables)
        conn.close()

        assert "raw_signals" in table_names
        assert "scores" in table_names
        assert "forecasts" in table_names
        assert "telegram_users" in table_names
        assert "alerts_log" in table_names

    def test_indexes_created(self, temp_db):
        conn = sqlite3.connect(str(temp_db))
        indexes = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
        ).fetchall()
        conn.close()
        index_names = [row[0] for row in indexes]

        assert "idx_raw_signals_lookup" in index_names
        assert "idx_scores_lookup" in index_names
        assert "idx_forecasts_lookup" in index_names


# ---------------------------------------------------------------------------
# 2. Raw signal insertion and retrieval
# ---------------------------------------------------------------------------

class TestRawSignals:
    def test_insert_and_retrieve(self, temp_db):
        from engine.storage import db

        inserted = db.insert_raw_signal(
            source="google_trends",
            app_name="tinder",
            city="france",
            metric_type="interest_hourly",
            value=72.0,
            metadata={"keyword": "tinder"},
            collected_at="2025-01-15 14:00:00",
        )
        assert inserted is True

        signals = db.get_signals(
            source="google_trends",
            app_name="tinder",
            limit=10,
        )
        assert len(signals) >= 1
        assert signals[0]["value"] == 72.0
        assert signals[0]["source"] == "google_trends"

    def test_duplicate_ignored(self, temp_db):
        from engine.storage import db

        db.insert_raw_signal(
            source="test", app_name="tinder", city="paris",
            metric_type="test_metric", value=50.0,
            collected_at="2025-01-15 10:00:00",
        )
        dup = db.insert_raw_signal(
            source="test", app_name="tinder", city="paris",
            metric_type="test_metric", value=99.0,
            collected_at="2025-01-15 10:00:00",
        )
        assert dup is False

    def test_count_signals(self, temp_db):
        from engine.storage import db

        for i in range(5):
            db.insert_raw_signal(
                source="test_src", app_name="bumble", city="lyon",
                metric_type="metric_a", value=float(i * 10),
                collected_at=f"2025-01-{15 + i:02d} 10:00:00",
            )
        assert db.count_signals(source="test_src") == 5

    def test_get_signal_values(self, temp_db):
        from engine.storage import db

        for i in range(3):
            db.insert_raw_signal(
                source="wiki", app_name="hinge", city="paris",
                metric_type="pageviews", value=float(100 + i * 50),
                collected_at=f"2025-02-{10 + i:02d} 00:00:00",
            )
        values = db.get_signal_values("wiki", "hinge", "paris", "pageviews")
        assert len(values) == 3
        assert all(isinstance(v, float) for v in values)


# ---------------------------------------------------------------------------
# 3. Scores
# ---------------------------------------------------------------------------

class TestScores:
    def test_insert_and_get_latest(self, temp_db):
        from engine.storage import db

        db.insert_score(
            app_name="tinder", city="paris",
            score=67.5, percentile=72.0, trend="rising",
            components={"google_trends": {"raw": 0.8, "normalized": 80}},
        )
        latest = db.get_latest_score("tinder", "paris")
        assert latest is not None
        assert latest["score"] == 67.5
        assert latest["percentile"] == 72.0
        assert latest["trend"] == "rising"

    def test_scores_history(self, temp_db):
        """Insert scores with distinct computed_at timestamps."""
        conn = sqlite3.connect(str(temp_db))
        conn.execute("PRAGMA journal_mode=WAL;")
        for i in range(5):
            conn.execute(
                """INSERT INTO scores
                    (app_name, city, score, percentile, trend, computed_at)
                VALUES (?, ?, ?, ?, ?, ?)""",
                ("bumble", "lyon", 40 + i * 10, 50 + i * 5,
                 "stable", f"2025-01-15 {10 + i:02d}:00:00"),
            )
        conn.commit()
        conn.close()

        from engine.storage import db
        history = db.get_scores_history("bumble", "lyon", limit=10)
        assert len(history) == 5
        # Should be oldest first
        assert history[0]["score"] <= history[-1]["score"]


# ---------------------------------------------------------------------------
# 4. Forecasts
# ---------------------------------------------------------------------------

class TestForecasts:
    def test_insert_and_get(self, temp_db):
        from engine.storage import db

        tomorrow = (date.today() + timedelta(days=1)).isoformat()

        db.insert_forecast(
            app_name="tinder", city="paris",
            forecast_date=tomorrow, forecast_hour=20,
            predicted_score=78.5, confidence=0.85,
            components={"seasonal": 0.7},
        )
        forecasts = db.get_forecasts("tinder", "paris", days=3)
        assert len(forecasts) >= 1
        assert forecasts[0]["predicted_score"] == 78.5

    def test_forecast_upsert(self, temp_db):
        from engine.storage import db

        tomorrow = (date.today() + timedelta(days=1)).isoformat()

        db.insert_forecast("tinder", "paris", tomorrow, 21, 60.0)
        db.insert_forecast("tinder", "paris", tomorrow, 21, 75.0)

        forecasts = db.get_forecasts("tinder", "paris", days=3)
        hour_21 = [f for f in forecasts if f["forecast_hour"] == 21]
        assert len(hour_21) == 1
        assert hour_21[0]["predicted_score"] == 75.0


# ---------------------------------------------------------------------------
# 5. Telegram users and alerts
# ---------------------------------------------------------------------------

class TestTelegramUsers:
    def test_upsert_new_user(self, temp_db):
        from engine.storage import db

        is_new = db.upsert_telegram_user(12345, username="testuser")
        assert is_new is True

        user = db.get_telegram_user(12345)
        assert user is not None
        assert user["city"] == "paris"
        assert user["apps"] == "tinder,bumble,hinge,happn"

    def test_upsert_existing_user(self, temp_db):
        from engine.storage import db

        db.upsert_telegram_user(99999, username="first")
        is_new = db.upsert_telegram_user(99999, username="updated")
        assert is_new is False

    def test_update_settings(self, temp_db):
        from engine.storage import db

        db.upsert_telegram_user(55555)
        db.update_telegram_user_settings(55555, city="lyon", apps="tinder,bumble")

        user = db.get_telegram_user(55555)
        assert user["city"] == "lyon"
        assert user["apps"] == "tinder,bumble"

    def test_count_active_users(self, temp_db):
        from engine.storage import db

        db.upsert_telegram_user(111)
        db.upsert_telegram_user(222)
        db.upsert_telegram_user(333)

        assert db.count_telegram_users() == 3

    def test_alerts_log(self, temp_db):
        from engine.storage import db

        db.insert_alert_log(12345, "tinder", "paris", 85.0, "good")
        db.insert_alert_log(12345, "bumble", "paris", 92.0, "exceptional")

        assert db.count_alerts_today(12345) == 2

    def test_last_alert_time(self, temp_db):
        from engine.storage import db

        db.insert_alert_log(12345, "tinder", "paris", 85.0, "good")
        last = db.get_last_alert_time(12345, "tinder")
        assert last is not None

        # No alert for bumble
        assert db.get_last_alert_time(12345, "bumble") is None


# ---------------------------------------------------------------------------
# 6. Normalizer
# ---------------------------------------------------------------------------

class TestNormalizer:
    def test_percentile_rank(self):
        from engine.processor.normalizer import percentile_rank

        # percentile_rank(values, current) — note: values first, current second
        history = [50.0, 60.0, 70.0, 80.0, 90.0]
        pct = percentile_rank(history, 70.0)
        assert 30 <= pct <= 60

    def test_percentile_rank_empty(self):
        from engine.processor.normalizer import percentile_rank

        assert percentile_rank([], 50.0) == 50.0

    def test_percentile_rank_extremes(self):
        from engine.processor.normalizer import percentile_rank

        history = [10.0, 20.0, 30.0, 40.0, 50.0]
        assert percentile_rank(history, 50.0) >= 80
        assert percentile_rank(history, 10.0) <= 20


# ---------------------------------------------------------------------------
# 7. Seasonal index
# ---------------------------------------------------------------------------

class TestSeasonal:
    def test_get_hour_weight(self):
        from engine.forecaster.seasonal import get_hour_weight

        # Peak hours (20-23) should be higher than early morning (4-6)
        peak = get_hour_weight(21)
        low = get_hour_weight(5)
        assert peak > low

    def test_get_event_boost(self):
        from engine.forecaster.seasonal import get_event_boost

        # Valentine's day should have a significant boost
        valentine = datetime(2025, 2, 14)
        boost_val = get_event_boost(valentine)
        assert boost_val > 1.0

        # Regular day (far from any event) should return ~1.0
        regular = datetime(2025, 3, 15)
        regular_boost = get_event_boost(regular)
        assert regular_boost >= 1.0

    def test_get_seasonal_index(self):
        from engine.forecaster.seasonal import get_seasonal_index

        # Peak time on a Sunday evening should score well
        dt = datetime(2025, 2, 9, 21, 0)  # Sunday 21h
        score = get_seasonal_index(dt)
        assert 0 <= score <= 100
        assert score > 50  # Sunday peak hour should be above average


# ---------------------------------------------------------------------------
# 8. Scorer integration
# ---------------------------------------------------------------------------

class TestScorerIntegration:
    def test_score_computation(self, temp_db):
        """Test that scorer can compute a score from raw signals."""
        from engine.storage import db
        from engine.processor.scorer import compute_score

        # Insert some fake signals
        for i in range(30):
            db.insert_raw_signal(
                source="google_trends", app_name="tinder", city="france",
                metric_type="interest_hourly", value=50 + i,
                collected_at=f"2025-01-{(i % 28) + 1:02d} {i % 24:02d}:00:00",
            )
            db.insert_raw_signal(
                source="wikipedia", app_name="tinder", city="france",
                metric_type="pageviews_daily", value=1000 + i * 100,
                collected_at=f"2025-01-{(i % 28) + 1:02d} 00:00:00",
            )

        result = compute_score("tinder", "france")
        assert result is not None
        assert "score" in result
        assert 0 <= result["score"] <= 100
        assert "percentile" in result
        assert "trend" in result
        assert "components" in result


# ---------------------------------------------------------------------------
# 9. API endpoints
# ---------------------------------------------------------------------------

class TestAPIEndpoints:
    @pytest.fixture
    def client(self, temp_db):
        from fastapi.testclient import TestClient
        from engine.api.routes import app
        return TestClient(app)

    def test_health(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert "database" in data
        assert "sources" in data

    def test_apps(self, client):
        r = client.get("/api/apps")
        assert r.status_code == 200
        data = r.json()
        assert "apps" in data
        assert "cities" in data
        assert "tinder" in data["apps"]
        assert len(data["cities"]) > 0

    def test_score_live_no_data(self, client):
        r = client.get("/api/score/live?app=unknownapp&city=unknowncity")
        assert r.status_code == 200
        data = r.json()
        assert data["score"] is None

    def test_score_live_with_data(self, client, temp_db):
        from engine.storage import db

        db.insert_score("tinder", "paris", 72.5, 65.0, "rising",
                        {"google_trends": {"raw": 0.7, "normalized": 70}})

        r = client.get("/api/score/live?app=tinder&city=paris")
        assert r.status_code == 200
        data = r.json()
        assert data["score"] == 72.5
        assert data["percentile"] == 65.0
        assert data["trend"] == "rising"

    def test_forecast_endpoint(self, client):
        r = client.get("/api/score/forecast?app=tinder&city=paris&days=3")
        assert r.status_code == 200
        data = r.json()
        assert "forecast" in data
        assert isinstance(data["forecast"], list)

    def test_history_fallback(self, client, temp_db):
        from engine.storage import db

        # Insert raw GT signals as fallback
        for i in range(5):
            db.insert_raw_signal(
                "google_trends", "tinder", "france",
                "interest_weekly", float(50 + i * 5),
                collected_at=f"2025-01-{10 + i:02d} 00:00:00",
            )

        r = client.get("/api/score/history?app=tinder&city=paris&period=30d")
        assert r.status_code == 200
        data = r.json()
        assert len(data["history"]) > 0

    def test_best_times_endpoint(self, client):
        r = client.get("/api/score/best-times?app=tinder&city=paris")
        assert r.status_code == 200
        data = r.json()
        assert "best_times" in data
        assert isinstance(data["best_times"], list)


# ---------------------------------------------------------------------------
# 10. Config validation
# ---------------------------------------------------------------------------

class TestConfig:
    def test_target_apps(self):
        from engine.config import TARGET_APPS
        assert len(TARGET_APPS) == 4
        assert "tinder" in TARGET_APPS

    def test_cities(self):
        from engine.config import CITIES, TARGET_CITIES
        assert len(TARGET_CITIES) == 5
        for city in TARGET_CITIES:
            assert city in CITIES
            assert "lat" in CITIES[city]
            assert "lon" in CITIES[city]

    def test_weights_sum_to_one(self):
        from engine.config import (
            WEIGHT_GOOGLE_TRENDS, WEIGHT_WIKIPEDIA, WEIGHT_BLUESKY,
            WEIGHT_APP_REVIEWS, WEIGHT_SEASONAL, WEIGHT_WEATHER,
            WEIGHT_DAY_HOUR,
        )
        total = (
            WEIGHT_GOOGLE_TRENDS + WEIGHT_WIKIPEDIA + WEIGHT_BLUESKY +
            WEIGHT_APP_REVIEWS + WEIGHT_SEASONAL + WEIGHT_WEATHER +
            WEIGHT_DAY_HOUR
        )
        assert abs(total - 1.0) < 0.001

    def test_data_files_exist(self):
        from engine.config import PROJECT_ROOT
        assert (PROJECT_ROOT / "data" / "events_fr.json").exists()
        assert (PROJECT_ROOT / "data" / "cities.json").exists()

    def test_events_json_valid(self):
        from engine.config import PROJECT_ROOT
        with open(PROJECT_ROOT / "data" / "events_fr.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        assert "recurring_events" in data
        assert "weekly_patterns" in data
        assert len(data["recurring_events"]) > 0

    def test_cities_json_valid(self):
        from engine.config import PROJECT_ROOT
        with open(PROJECT_ROOT / "data" / "cities.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        assert "cities" in data
        city_ids = [c["id"] for c in data["cities"]]
        assert "paris" in city_ids
        assert len(data["cities"]) == 5
