import os
import re
from urllib.parse import urlparse, urlunparse

import httpx
from bs4 import BeautifulSoup

WORKER_VERSION = "0.1.0"
TRACKING_PARAMS = {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "igsh", "igshid", "fbclid"}


def validate(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.hostname is not None and "instagram.com" in parsed.hostname


def normalize(url: str) -> str:
    from urllib.parse import parse_qsl, urlencode

    parsed = urlparse(url)
    filtered = [
        (k, v)
        for k, v in parse_qsl(parsed.query, keep_blank_values=True)
        if k not in TRACKING_PARAMS
    ]
    path = parsed.path.rstrip("/") if parsed.path not in ("", "/") else parsed.path
    return urlunparse(
        (
            parsed.scheme,
            parsed.netloc,
            path,
            parsed.params,
            urlencode(filtered),
            parsed.fragment,
        )
    )


def _meta_content(soup: BeautifulSoup, prop: str) -> str | None:
    tag = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
    if tag and tag.get("content"):
        return str(tag["content"])
    return None


async def extract_media(url: str) -> list[dict]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.instagram.com/",
    }

    cookies = {}
    session_id = os.getenv("IG_SESSIONID", "").strip()
    if session_id:
        cookies["sessionid"] = session_id
        ds_user_id = os.getenv("IG_DS_USER_ID", "").strip()
        csrf = os.getenv("IG_CSRFTOKEN", "").strip()
        if ds_user_id:
            cookies["ds_user_id"] = ds_user_id
        if csrf:
            cookies["csrftoken"] = csrf

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        response = await client.get(url, headers=headers, cookies=cookies or None)
        response.raise_for_status()
        html = response.text

    soup = BeautifulSoup(html, "html.parser")
    items: list[dict] = []

    og_video = _meta_content(soup, "og:video:secure_url") or _meta_content(soup, "og:video")
    og_image = _meta_content(soup, "og:image")
    og_title = _meta_content(soup, "og:title")
    og_description = _meta_content(soup, "og:description")

    content_type = "reel" if "/reel/" in url else "photo"
    if "/tv/" in url:
        content_type = "igtv"
    elif og_video:
        content_type = "video"

    if og_video:
        items.append(
            {
                "type": content_type if content_type in {"reel", "igtv", "video"} else "video",
                "url": og_video,
                "thumbnail": og_image,
                "title": og_title,
                "description": og_description,
            }
        )
    elif og_image:
        items.append(
            {
                "type": "photo",
                "url": og_image,
                "thumbnail": og_image,
                "title": og_title,
                "description": og_description,
            }
        )

    # Fallback: look for video URLs in embedded JSON (reels often use video_versions)
    if not items:
        for pattern in (
            r'"video_url":"([^"]+)"',
            r'"playback_url":"([^"]+)"',
            r'"url":"(https://[^"]+\.mp4[^"]*)"',
        ):
            for match in re.finditer(pattern, html):
                raw_url = match.group(1).encode("utf-8").decode("unicode_escape")
                if "cdninstagram.com" in raw_url and ".mp4" in raw_url:
                    items.append(
                        {
                            "type": content_type if content_type != "photo" else "video",
                            "url": raw_url,
                            "thumbnail": og_image,
                            "title": og_title,
                            "description": og_description,
                        }
                    )
                    break
            if items:
                break

    return items


async def extract_metadata(url: str) -> dict:
    return {"normalizedUrl": normalize(url), "validated": validate(url)}


async def extract_thumbnail(url: str) -> str | None:
    items = await extract_media(url)
    if not items:
        return None
    return items[0].get("thumbnail") or items[0].get("url")


async def extract_author(url: str) -> str | None:
    items = await extract_media(url)
    if items and items[0].get("title"):
        title = items[0]["title"]
        if " on Instagram" in title:
            return title.split(" on Instagram")[0].strip("@")
    return None
