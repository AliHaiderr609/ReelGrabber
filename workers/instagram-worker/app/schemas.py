from pydantic import BaseModel, HttpUrl, Field


class ExtractRequest(BaseModel):
    url: HttpUrl


class MediaItem(BaseModel):
    type: str
    url: str
    thumbnail: str | None = None
    title: str | None = None
    author: str | None = None
    description: str | None = None


class ExtractResponse(BaseModel):
    platform: str = "instagram"
    normalizedUrl: str
    items: list[MediaItem]
    workerVersion: str = "0.1.0"
    durationMs: int | None = None
    requestId: str | None = None
