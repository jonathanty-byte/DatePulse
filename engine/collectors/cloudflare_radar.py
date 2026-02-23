"""
Cloudflare Radar collector for DatePulse.

Fetches domain ranking and traffic data for dating app websites
via the Cloudflare Radar API (free tier, requires API token).

Produces two signal types per app:
  - domain_rank: global popularity ranking (lower = more popular)
  - rank_bucket: ranking bucket (e.g. top 1000, top 10000)

Requires CLOUDFLARE_API_TOKEN in .env.
Degrades gracefully if token is missing (returns 0).

API docs: https://developers.cloudflare.com/radar/
"""

import logging
from datetime import datetime, timezone

import requests

from engine.config import TARGET_APPS
from engine.storage import db

logger = logging.getLogger(__name__)

SOURCE = "cloudflare_radar"

API_BASE = "https://api.cloudflare.com/client/v4/radar"

# Mapping from app name to primary website domain
APP_DOMAINS: dict[str, str] = {
    "tinder": "tinder.com",
    "bumble": "bumble.com",
    "hinge": "hinge.co",
    "happn": "happn.com",
}

REQUEST_TIMEOUT = 15

# Bucket label -> numeric score (higher = more popular)
BUCKET_SCORES: dict[str, float] = {
    "top_100": 100.0,
    "top_200": 95.0,
    "top_500": 90.0,
    "top_1000": 85.0,
    "top_2000": 80.0,
    "top_5000": 70.0,
    "top_10000": 60.0,
    "top_20000": 50.0,
    "top_50000": 40.0,
    "top_100000": 30.0,
    "top_200000": 20.0,
    "top_500000": 10.0,
    "top_1000000": 5.0,
}


def _get_api_token() -> str | None:
    """Load Cloudflare API token from config."""
    from engine.config import CLOUDFLARE_API_TOKEN

    if not CLOUDFLARE_API_TOKEN:
        logger.warning(
            "CLOUDFLARE_API_TOKEN not configured. Skipping Cloudflare Radar collection."
        )
        return None
    return CLOUDFLARE_API_TOKEN


def _get_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def _fetch_domain_ranking(domain: str, token: str) -> dict | None:
    """
    Fetch ranking details for a domain from Cloudflare Radar.

    Returns the API response dict or None on failure.
    """
    url = f"{API_BASE}/ranking/domain/{domain}"

    try:
        resp = requests.get(
            url,
            headers=_get_headers(token),
            params={"format": "json"},
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("result", {})
    except requests.exceptions.HTTPError as exc:
        if resp.status_code == 401:
            logger.error("Cloudflare API token is invalid (401)")
        elif resp.status_code == 403:
            logger.error("Cloudflare API token lacks Radar:Read permission (403)")
        else:
            logger.warning("HTTP error fetching ranking for %s: %s", domain, exc)
        return None
    except (requests.exceptions.RequestException, ValueError) as exc:
        logger.warning("Failed to fetch ranking for %s: %s", domain, exc)
        return None


def _parse_ranking(result: dict) -> tuple[float | None, str | None]:
    """
    Extract rank and bucket from Cloudflare Radar response.

    Returns (rank_number, bucket_label) or (None, None).
    """
    details = result.get("details_0", {})

    # Top 100 domains get an exact rank
    rank = details.get("rank")

    # All domains get a bucket (top_1000, top_10000, etc.)
    bucket = None
    categories = details.get("categories", [])
    bucket_info = details.get("bucket", "")

    # The bucket might be in different response fields depending on API version
    if bucket_info:
        bucket = bucket_info
    elif "top" in str(details):
        # Try to extract from the raw response
        for key in BUCKET_SCORES:
            if key in str(details):
                bucket = key
                break

    return rank, bucket


def collect() -> int:
    """
    Collect Cloudflare Radar domain ranking data for all target apps.

    Returns the total number of signals inserted.
    Returns 0 gracefully if API token is not configured.
    """
    logger.info("Starting Cloudflare Radar collection")

    token = _get_api_token()
    if token is None:
        return 0

    total_inserted = 0
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    for app_name in TARGET_APPS:
        domain = APP_DOMAINS.get(app_name)
        if not domain:
            logger.warning("No domain mapping for app '%s', skipping", app_name)
            continue

        logger.info("Fetching Cloudflare Radar ranking for %s (%s)", app_name, domain)
        result = _fetch_domain_ranking(domain, token)

        if result is None:
            continue

        rank, bucket = _parse_ranking(result)

        # Insert exact rank if available
        if rank is not None:
            ok = db.insert_raw_signal(
                source=SOURCE,
                app_name=app_name,
                city="france",
                metric_type="domain_rank",
                value=float(rank),
                collected_at=now_str,
            )
            if ok:
                total_inserted += 1
            logger.info("%s: global rank #%s", domain, rank)

        # Insert bucket score (always available for ranked domains)
        if bucket is not None:
            score = BUCKET_SCORES.get(bucket, 1.0)
            ok = db.insert_raw_signal(
                source=SOURCE,
                app_name=app_name,
                city="france",
                metric_type="rank_bucket_score",
                value=score,
                metadata={"bucket": bucket},
                collected_at=now_str,
            )
            if ok:
                total_inserted += 1
            logger.info("%s: bucket=%s (score=%.0f)", domain, bucket, score)

        if rank is None and bucket is None:
            logger.info("%s: no ranking data available", domain)

    logger.info(
        "Cloudflare Radar collection complete: %d signals inserted", total_inserted
    )
    return total_inserted


if __name__ == "__main__":
    import sys

    sys.path.insert(
        0, str(__import__("pathlib").Path(__file__).resolve().parent.parent.parent)
    )

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )
    db.init_db()
    total = collect()
    print(f"Cloudflare Radar: {total} signals collected")
