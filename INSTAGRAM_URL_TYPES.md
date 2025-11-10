# Complete List of Instagram URL Types

This document provides a comprehensive list of all Instagram URL types that are supported by the downloader.

## 📥 User Input URL Types (What You Can Paste)

These are the Instagram URLs that users can paste into the downloader:

### 1. **Regular Posts** (`/p/`)
Supports both photo and video posts. The system auto-detects the content type.

**Format:**
```
https://www.instagram.com/p/[POST_ID]/
https://instagram.com/p/[POST_ID]/
https://www.instagram.com/p/[POST_ID]/?igsh=[SHORTCODE]
```

**Examples:**
```
https://www.instagram.com/p/C1234567890/
https://instagram.com/p/DQdPjjKEmty/
https://www.instagram.com/p/ABC123xyz/?igsh=dGRpZDZiZWhnNWMy
```

**Supported Variants:**
- With or without `www.`
- With or without trailing `/`
- With query parameters (`?igsh=...`, `?utm_source=...`, etc.)
- HTTP or HTTPS

---

### 2. **Instagram Reels** (`/reel/`)
Reels are short-form videos (15-90 seconds).

**Format:**
```
https://www.instagram.com/reel/[REEL_ID]/
https://instagram.com/reel/[REEL_ID]/
```

**Examples:**
```
https://www.instagram.com/reel/DQVBElIE6XU/
https://instagram.com/reel/DQdPjjKEmty/?igsh=dGRpZDZiZWhnNWMy
https://www.instagram.com/reel/C1234567890/
```

**Supported Variants:**
- With or without `www.`
- With or without trailing `/`
- With query parameters

---

### 3. **IGTV Videos** (`/tv/`)
Long-form videos (up to 60 minutes).

**Format:**
```
https://www.instagram.com/tv/[VIDEO_ID]/
https://instagram.com/tv/[VIDEO_ID]/
```

**Examples:**
```
https://www.instagram.com/tv/ABC123xyz/
https://instagram.com/tv/DQdPjjKEmty/?igsh=dGRpZDZiZWhnNWMy
```

**Supported Variants:**
- With or without `www.`
- With or without trailing `/`
- With query parameters

---

### 4. **Instagram Stories** (`/stories/`)
⚠️ **Note:** Stories support is limited (not fully implemented).

**Format:**
```
https://www.instagram.com/stories/[USERNAME]/[STORY_ID]/
https://instagram.com/stories/[USERNAME]/[STORY_ID]/
```

**Examples:**
```
https://www.instagram.com/stories/username/1234567890/
https://instagram.com/stories/john_doe/9876543210/
```

**Supported Variants:**
- With or without `www.`
- With or without trailing `/`

---

### 5. **URL Variations**
All URL types support these variations:

✅ **Protocol:**
- `https://` (preferred)
- `http://` (redirects to HTTPS)

✅ **Subdomain:**
- `www.instagram.com`
- `instagram.com`
- `m.instagram.com` (mobile)

✅ **Query Parameters:**
- `?igsh=...` (Instagram share code)
- `?utm_source=...` (tracking)
- `?ig_rid=...` (Instagram request ID)
- Any combination of parameters

✅ **Path Variations:**
- With or without trailing `/`
- With fragment identifiers (`#...`)

---

## 📤 Extracted Download URL Types (What the System Finds)

These are the URLs that the system extracts from Instagram for downloading:

### 1. **Priority URLs (From GraphQL API)**
These are the highest quality URLs with audio:

**Source: `video_versions[0]`**
```
https://[CDN_DOMAIN]/[PATH]/[FILENAME].mp4
```

**GraphQL Fields:**
- `video_versions[0].url`
- `video_versions[0].video_url`
- `video_versions[0].playback_url`
- `clips[0].video_versions[0].url` (for multi-clip reels)
- `carousel_media[].video_versions[0].url` (for carousel posts)
- `carousel_media[].video_url`

**Example:**
```
https://instagram.flhe10-1.fna.fbcdn.net/o1/v/t2/f2/m367/AQNGKGyRWDzVyI3UAqWNUdveir4SldO832dorFWgJCZ8l0yAlu7UfZw_1XNEE-abgaqDYytr6B0f4AicsU4janHXHBHgwrgv_wpnFJU.mp4?_nc_cat=103&_nc_oc=AdlK7-a7pcio2XKp2hbAjaGSZrQ8PhTz-AK5DBEqJ15Z9w8_W9RYLP4Yg_euwoteF9k&...
```

---

### 2. **Instagram CDN URLs**
**Pattern 1: Standard CDN**
```
https://[subdomain].cdninstagram.com/v/[path]/[filename].mp4
https://[subdomain].cdninstagram.com/video/[filename].mp4
https://[subdomain].cdninstagram.com/reel/[filename].mp4
```

**Pattern 2: SContent CDN**
```
https://scontent[region].cdninstagram.com/[filename].mp4
https://scontent-[region][number].cdninstagram.com/[filename].mp4
```

**Examples:**
```
https://instagram.flhe10-1.fna.fbcdn.net/o1/v/t2/f2/m367/[filename].mp4
https://scontent-ams2-1.cdninstagram.com/v/t51.2885-15/[filename].mp4
https://cdninstagram.com/video/[filename].mp4
```

---

### 3. **Facebook CDN URLs**
Facebook CDN (Instagram is owned by Meta/Facebook):

**Pattern:**
```
https://[subdomain].fbcdn.net/video/[filename].mp4
https://[subdomain].fbcdn.net/[path]/[filename].mp4
```

**Examples:**
```
https://instagram.flhe10-1.fna.fbcdn.net/o1/v/t2/f2/m367/[filename].mp4
https://scontent.flhe10-1.fna.fbcdn.net/v/t51.2885-15/[filename].mp4
```

---

### 4. **File Extensions**
**Video Formats:**
- `.mp4` (most common)
- `.m4v` (alternative)

**Image Formats:**
- `.jpg` / `.jpeg`
- `.png`
- `.webp`

---

## ❌ Rejected URL Types (Not Downloaded)

The system automatically filters out these URL types:

### 1. **DASH Segments (Video-Only, No Audio)**
- URLs containing `dashinit` (even URL-encoded)
- URLs containing `dash` in path or parameters
- URLs with `/v/t2/` path pattern
- URLs with `/v/t[0-9]+/` path pattern
- URLs containing `.mpd` (manifest files)

**Examples (Rejected):**
```
https://instagram.flhe10-1.fna.fbcdn.net/o1/v/t2/f2/m86/[filename].mp4?...[dashinit]...
https://cdninstagram.com/v/t2/[filename].mp4
```

### 2. **Video-Only Streams**
- URLs containing `video_only`
- URLs containing `muted`
- URLs containing `segment`
- URLs with `audio=false` parameter
- URLs with `video_audio=false` parameter

### 3. **Partial/Incomplete Videos**
- URLs with `bytestart` parameter
- URLs with `byteend` parameter
- URLs with `range=` parameter

### 4. **Blob URLs**
- `blob:https://www.instagram.com/[uuid]` (browser-only, not accessible server-side)

### 5. **Manifest Files**
- `.mpd` files (DASH manifest)
- `.m3u8` files (HLS manifest)

---

## 📊 URL Priority Ranking

When multiple URLs are found, they are ranked in this order:

1. **Priority URLs** (from `video_versions[0]` in GraphQL)
   - Full videos with audio
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

---

## 🔍 URL Detection Patterns

### Regex Patterns Used:

**Post URL:**
```regex
/^\/p\/([A-Za-z0-9_-]+)\/?$/
```

**Reel URL:**
```regex
/^\/reel\/([A-Za-z0-9_-]+)\/?$/
```

**IGTV URL:**
```regex
/^\/tv\/([A-Za-z0-9_-]+)\/?$/
```

**Story URL:**
```regex
/^\/stories\/([A-Za-z0-9_.-]+)\/([0-9]+)\/?$/
```

**Video URL Pattern:**
```regex
/https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/
/https?:\/\/[^"'\s<>]+cdninstagram[^"'\s<>]*\/v\/t[^"'\s<>]*\.mp4[^"'\s<>]*/
/https?:\/\/[^"'\s<>]+fbcdn[^"'\s<>]*video[^"'\s<>]*\.mp4[^"'\s<>]*/
```

---

## ✅ Validation Rules

### Accepted URLs Must:
- ✅ Start with `http://` or `https://`
- ✅ Have `.mp4` or `.m4v` extension (for videos)
- ✅ Not contain DASH indicators
- ✅ Not contain range request parameters
- ✅ Not be blob URLs

### Rejected URLs Contain:
- ❌ `dashinit` or `dash`
- ❌ `/v/t2/` or `/v/t[0-9]+/`
- ❌ `bytestart`, `byteend`, `range=`
- ❌ `video_only`, `muted`, `segment`
- ❌ `.mpd` extension
- ❌ `blob:` protocol

---

## 📝 Examples of Complete URLs

### ✅ Valid Input URLs:
```
https://www.instagram.com/p/C1234567890/
https://instagram.com/reel/DQVBElIE6XU/?igsh=MWJyOTQ1ZGt1bzV2cg==
https://www.instagram.com/tv/ABC123xyz/
https://instagram.com/stories/username/1234567890/
```

### ✅ Valid Download URLs (Extracted):
```
https://instagram.flhe10-1.fna.fbcdn.net/o1/v/t2/f2/m367/AQNGKGyRWDzVyI3UAqWNUdveir4SldO832dorFWgJCZ8l0yAlu7UfZw_1XNEE-abgaqDYytr6B0f4AicsU4janHXHBHgwrgv_wpnFJU.mp4?_nc_cat=103&_nc_oc=AdlK7-a7pcio2XKp2hbAjaGSZrQ8PhTz-AK5DBEqJ15Z9w8_W9RYLP4Yg_euwoteF9k&_nc_sid=9ca052&...
```

### ❌ Rejected URLs:
```
https://instagram.flhe10-1.fna.fbcdn.net/o1/v/t2/f2/m86/[file].mp4?dashinit.mp4
https://cdninstagram.com/v/t2/[file].mp4?bytestart=0&byteend=1000
blob:https://www.instagram.com/0d48958e-07bc-4683-97d4-254fcb6a415c
```

---

## 🔧 Technical Details

### URL Extraction Sources:
1. **GraphQL API Responses** - Most reliable, full videos with audio
2. **Network Request Interception** - Real-time URL capture
3. **HTML Source Parsing** - Fallback method
4. **JavaScript Context** - Page evaluation and DOM inspection

### URL Cleaning Process:
1. Remove escaped characters (`\\/` → `/`)
2. Remove HTML entities (`&amp;` → `&`)
3. Remove trailing XML tags
4. Remove range request parameters
5. Validate URL format
6. Deduplicate by base URL
7. Select best quality URL

---

## 📚 Additional Resources

- See `URL_TYPES_DOCUMENTATION.md` for detailed technical documentation
- See `SAVECLIP_ANALYSIS.md` for comparison with SaveClip.app

---

**Last Updated:** 2024
**Version:** 1.0

