import time

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException

load_dotenv()

from app.extractor import WORKER_VERSION, extract_media, normalize, validate
from app.schemas import ExtractRequest, ExtractResponse, MediaItem

app = FastAPI(title="Instagram Worker", version=WORKER_VERSION)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "platform": "instagram",
        "version": WORKER_VERSION,
    }


@app.post("/v1/extract", response_model=ExtractResponse)
async def extract(
    body: ExtractRequest,
    x_request_id: str | None = Header(default=None),
):
    url = str(body.url)
    if not validate(url):
        raise HTTPException(status_code=400, detail="URL must be a valid Instagram URL")

    started = time.perf_counter()
    normalized = normalize(url)
    raw_items = await extract_media(normalized)
    duration_ms = int((time.perf_counter() - started) * 1000)

    items = [MediaItem(**item) for item in raw_items]

    return ExtractResponse(
        platform="instagram",
        normalizedUrl=normalized,
        items=items,
        workerVersion=WORKER_VERSION,
        durationMs=duration_ms,
        requestId=x_request_id,
    )
