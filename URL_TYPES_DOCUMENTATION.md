# Instagram Content URL Types Documentation

This document lists all types of URLs that the Instagram extractor captures and handles.

## Content Types

The extractor supports the following content types:

1. **`video`** - Regular video posts
2. **`photo`** - Image posts
3. **`reel`** - Instagram Reels
4. **`igtv`** - IGTV videos
5. **`story`** - Instagram Stories (not currently fully implemented)

## URL Sources

URLs are captured from multiple sources:

### 1. GraphQL API Responses (Priority Source)

**Priority URLs** (from `video_versions` - full videos with audio):
- `video_versions[0].url` - Highest quality, usually has audio
- `video_versions[0].video_url` - Alternative video URL field
- `video_versions[0].playback_url` - Playback URL
- `clips[0].video_versions[0].url` - For multi-clip reels
- `carousel_media[].video_versions[0].url` - For carousel posts
- `carousel_media[].video_url` - Direct video URL in carousel

**GraphQL Response Fields:**
- `video_url`
- `videoUrl`
- `playback_url`
- `download_url`
- `src`

### 2. Network Request Interception

**Captured from:**
- HTTP requests to video files
- HTTP responses with video content

**URL Patterns:**
- URLs ending with `.mp4`
- URLs ending with `.m4v`
- URLs containing `cdninstagram` with `/video/` or `/reel/`
- URLs containing `fbcdn` with `video` or `.mp4`

### 3. HTML Source Parsing

**Patterns extracted from HTML:**

#### Instagram CDN Patterns:
- `https://[domain].cdninstagram.com/v/t[...]/[filename].mp4`
- `https://[domain].cdninstagram.com/video/[filename].mp4`
- `https://[domain].cdninstagram.com/reel/[filename].mp4`
- `https://scontent[region].cdninstagram.com/[filename].mp4`

#### Facebook CDN Patterns:
- `https://[domain].fbcdn.net/video/[filename].mp4`

#### JSON Patterns in HTML:
- `"video_url": "..."` 
- `"videoUrl": "..."`
- `"playback_url": "..."`
- `"video_versions": [{"url": "..."}]`
- `"video_versions": [{"video_url": "..."}]`

#### Generic Patterns:
- Any URL containing `.mp4` extension

### 4. Page Evaluation (JavaScript Context)

**Extracted from:**
- `<video>` element `src` attribute
- `<video>` element `currentSrc` property
- `<source>` elements within `<video>`
- `data-src`, `data-video-url`, `data-original-url` attributes
- `window.__initialData__` object
- `window.__additionalData__` object
- `window._sharedData` object
- `document.body.innerHTML` content

## URL Filtering

### URLs We ACCEPT (Full Videos with Audio):

✅ **Priority URLs:**
- URLs from `video_versions[0]` in GraphQL
- URLs not containing DASH indicators
- URLs without `/v/t2/` or `/v/tX/` path patterns
- URLs without range request parameters

✅ **Full Video URLs:**
- URLs with `.mp4` or `.m4v` extensions
- URLs from `cdninstagram.com` CDN
- URLs from `fbcdn.net` CDN
- URLs without `bytestart`, `byteend`, or `range=` parameters

### URLs We REJECT (Video-Only or Incomplete):

❌ **DASH Segments:**
- URLs containing `dashinit` (even URL-encoded)
- URLs containing `dash` in path or parameters
- URLs with `/v/t2/` path pattern
- URLs with `/v/t[0-9]+/` path pattern
- URLs containing `.mpd` (manifest files)

❌ **Video-Only Streams:**
- URLs containing `video_only`
- URLs containing `muted`
- URLs containing `segment`
- URLs with `audio=false` parameter
- URLs with `video_audio=false` parameter

❌ **Partial/Incomplete Videos:**
- URLs with `bytestart` parameter
- URLs with `byteend` parameter
- URLs with `range=` parameter
- Blob URLs (browser-only, not accessible server-side)

## URL Priority Ranking

When multiple URLs are found, they are ranked in this order:

1. **Priority URLs** (from `video_versions[0]` in GraphQL)
   - These are full videos with audio
   - Highest quality available

2. **Non-DASH URLs**
   - URLs without `/v/t2/` path
   - URLs without DASH indicators

3. **URLs without range parameters**
   - Full videos, not partial downloads

4. **URLs without explicit quality tags**
   - Usually default/highest quality with audio

5. **Main video files (not segments)**
   - URLs that appear to be primary video files

6. **Longer URLs**
   - More parameters often indicate better quality

## URL Examples

### Accepted URLs (Full Video with Audio):
```
https://instagram.flhe10-1.fna.fbcdn.net/o1/v/t2/f2/m367/AQNGKGyRWDzVyI3UAqWNUdveir4SldO832dorFWgJCZ8l0yAlu7UfZw_1XNEE-abgaqDYytr6B0f4AicsU4janHXHBHgwrgv_wpnFJU.mp4?_nc_cat=103&_nc_oc=AdlK7-a7pcio2XKp2hbAjaGSZrQ8PhTz-AK5DBEqJ15Z9w8_W9RYLP4Yg_euwoteF9k&...
```

### Rejected URLs (DASH Segments):
```
https://instagram.flhe10-1.fna.fbcdn.net/o1/v/t2/f2/m86/AQP0TdSOH-OIlskfFMSqLMyUVJ294asVlFM8-99QNutZpzo84NnzBLF7tvBeCD71be_-nsWfWqpnq4uZwUj-l-fjAFbwPRyB5_WCRUY.mp4?...dashinit.mp4...
```

## Logging

The extractor logs the following information:

- `Found priority video URL from video_versions[0].url:` - Priority URL found
- `Found priority video URL from clips[0].video_versions[0]:` - Reel clip URL
- `Found full video URL from request:` - Network request URL
- `Found full video URL from network response:` - Network response URL
- `Found full video URL from HTML:` - HTML pattern match
- `Found X total video URLs, Y full videos (filtered out Z range requests)` - Summary
- `Priority URLs (from video_versions): X` - Count of priority URLs

## Notes

- All URLs are validated to ensure they start with `http://` or `https://`
- Blob URLs are converted to base64 when possible, or skipped
- URLs are deduplicated by base URL (protocol + hostname + pathname)
- Query parameters are cleaned to remove range request parameters
- The final selection returns only the best quality video URL

