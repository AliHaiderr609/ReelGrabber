import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';

export interface InstagramContent {
  type: 'video' | 'photo' | 'reel' | 'story' | 'igtv';
  url: string;
  thumbnail?: string;
  title?: string;
  duration?: string;
  size?: string;
  author?: string;
  description?: string;
}

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

// Proxy rotation pool
const proxyPool: ProxyConfig[] = [
  // Add your proxy configurations here
  // { host: 'proxy1.example.com', port: 8080, username: 'user', password: 'pass' },
  // { host: 'proxy2.example.com', port: 8080, username: 'user', password: 'pass' },
];

let currentProxyIndex = 0;

const getNextProxy = (): ProxyConfig | null => {
  if (proxyPool.length === 0) return null;
  
  const proxy = proxyPool[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % proxyPool.length;
  return proxy;
};

const getUserAgent = () => {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
};

/**
 * Extract shortcode from Instagram URL
 */
function extractShortcode(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Post: /p/ID/
    const postMatch = pathname.match(/^\/p\/([A-Za-z0-9_-]+)\/?$/);
    if (postMatch) return postMatch[1];
    
    // Reel: /reel/ID/
    const reelMatch = pathname.match(/^\/reel\/([A-Za-z0-9_-]+)\/?$/);
    if (reelMatch) return reelMatch[1];
    
    // IGTV: /tv/ID/
    const igtvMatch = pathname.match(/^\/tv\/([A-Za-z0-9_-]+)\/?$/);
    if (igtvMatch) return igtvMatch[1];
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if an image URL is a profile picture (not post content)
 */
function isProfilePicture(url: string): boolean {
  // Profile pictures have specific patterns:
  // - _s150x150_tt6 or _s150x150_ in the URL
  // - Contains "profile_pic" in efg parameter
  // - Has specific path patterns like /v/t51.2885-19/ with profile indicators
  
  if (!url) return false;
  
  // Check for profile picture size indicators
  if (url.includes('_s150x150_') || url.includes('_s640x640_') || url.includes('_s1080x1080_')) {
    // But check if it's actually a profile pic by looking at efg parameter
    try {
      const efgMatch = url.match(/efg=([^&]+)/);
      if (efgMatch) {
        const efgValue = decodeURIComponent(efgMatch[1]);
        if (efgValue.includes('profile_pic') || efgValue.includes('django.') || efgValue.includes('djano')) {
          return true;
        }
      }
    } catch (e) {
      // If we can't decode, check other patterns
    }
    
    // Check for profile picture specific patterns in URL
    if (url.includes('profile_pic') || url.includes('djano') || url.includes('django.')) {
      return true;
    }
  }
  
  // Profile pictures are usually from /v/t51.2885-19/ path with specific patterns
  if (url.match(/\/v\/t51\.\d+-\d+\/[^\/]+\.jpg/) && url.includes('_s150x150_')) {
    return true;
  }
  
  return false;
}

export async function extractInstagramContent(url: string): Promise<InstagramContent[]> {
  try {
    // Extract shortcode from URL to filter results
    const targetShortcode = extractShortcode(url);
    console.log(`Extracting content for shortcode: ${targetShortcode}`);
    
    // Detect if this is a video URL (reel, IGTV, or video post)
    const isVideoUrl = url.includes('/reel/') || url.includes('/tv/') || url.includes('/p/');
    const isReelOrIGTV = url.includes('/reel/') || url.includes('/tv/');
    
    if (isReelOrIGTV) {
      console.log('Detected reel/video URL, using Puppeteer directly');
      const results = await extractWithPuppeteer(url, targetShortcode);
      // Filter to only this post's content
      return filterResultsByShortcode(results, targetShortcode);
    }
    
    // For regular posts, try OG parser first (faster)
    const ogResult = await extractWithOGParser(url);
    console.log(ogResult, "====ogResult");
    
    // If OG parser found content, deduplicate and return
    if (ogResult.length > 0) {
      // Apply deduplication for videos, but return all content types
      const videoResults = ogResult.filter(r => r.type === 'video' || r.type === 'reel' || r.type === 'igtv');
      const nonVideoResults = ogResult.filter(r => r.type !== 'video' && r.type !== 'reel' && r.type !== 'igtv');
      
      // Deduplicate only video URLs
      const deduplicatedVideos = videoResults.length > 0 ? deduplicateAndCleanVideoUrls(videoResults) : [];
      
      // Return all: deduplicated videos + non-video content (already filtered by OG parser)
      return [...deduplicatedVideos, ...nonVideoResults];
    }

    // Fallback to Puppeteer if OG parser failed
    const puppeteerResult = await extractWithPuppeteer(url, targetShortcode);
    // Filter to only this post's content
    return filterResultsByShortcode(puppeteerResult, targetShortcode);
  } catch (error) {
    console.error('Instagram extraction error:', error);
    throw new Error('Failed to extract Instagram content');
  }
}

/**
 * Filter results to only include content from the specific post (by shortcode)
 */
function filterResultsByShortcode(results: InstagramContent[], targetShortcode: string | null): InstagramContent[] {
  if (!targetShortcode) {
    // If no shortcode, filter out profile pictures at least
    return results.filter(r => {
      if (r.type === 'photo' && r.url && isProfilePicture(r.url)) {
        return false;
      }
      return true;
    });
  }
  
  // Filter out profile pictures
  const filtered = results.filter(r => {
    // Always filter out profile pictures
    if (r.type === 'photo' && r.url && isProfilePicture(r.url)) {
      return false;
    }
    return true;
  });
  
  // If we have GraphQL data with shortcode matching, we can be more precise
  // For now, we'll rely on the extraction logic to only get content from the specific post
  // The main filtering happens in extractWithPuppeteer where we match shortcode_media
  
  return filtered;
}

/**
 * Filter results to only return videos if the input URL is a video URL
 */
function filterOnlyVideos(results: InstagramContent[], isVideoUrl: boolean): InstagramContent[] {
  if (!isVideoUrl) {
    // If not a video URL, return all results
    return results;
  }
  
  // For video URLs, only return video content (video, reel, igtv)
  const videoResults = results.filter(r => 
    r.type === 'video' || r.type === 'reel' || r.type === 'igtv'
  );
  
  console.log(`Filtered results: ${results.length} total -> ${videoResults.length} videos (removed ${results.length - videoResults.length} non-video items)`);
  
  return videoResults;
}

/**
 * Check if a URL is a baseline video (full video with audio)
 * Baseline videos are the complete video files, not quality variants or segments
 */
function isBaselineVideo(url: string): boolean {
  try {
    // Check path for m86 pattern (baseline video indicator)
    if (url.includes('/m86/')) {
      return true;
    }
    
    // Check efg parameter for baseline indicators
    const efgMatch = url.match(/efg=([^&]+)/);
    if (efgMatch) {
      const efgValue = decodeURIComponent(efgMatch[1]);
      try {
        const decodedEfg = Buffer.from(efgValue, 'base64').toString('utf-8');
        // Check for baseline indicators (full video with audio)
        if (decodedEfg.includes('dash_baseline') ||
            decodedEfg.includes('baseline_1_v1') ||
            decodedEfg.includes('baseline')) {
          return true;
        }
      } catch (e) {
        // If base64 decode fails, check the raw value
        if (efgValue.includes('baseline')) {
          return true;
        }
      }
    }
    
    // Check _nc_vs parameter for baseline indicators
    const ncvsMatch = url.match(/_nc_vs=([^&]+)/);
    if (ncvsMatch) {
      const ncvsValue = decodeURIComponent(ncvsMatch[1]);
      try {
        const decodedNcvs = Buffer.from(ncvsValue, 'base64').toString('utf-8');
        if (decodedNcvs.includes('dash_baseline') || decodedNcvs.includes('baseline')) {
          return true;
        }
      } catch (e) {
        // Ignore decode errors
      }
    }
    
    return false;
  } catch (e) {
    // If checking fails, default to false
    return false;
  }
}

/**
 * Check if a URL is a DASH segment, audio-only, or video-only stream (even when encoded)
 */
function isDashSegmentOrVideoOnly(url: string): boolean {
  try {
    // First check if it's a baseline video - if so, it's NOT a DASH segment
    if (isBaselineVideo(url)) {
      return false; // Baseline videos are full videos with audio, not segments
    }
    
    // Decode URL to check for encoded indicators
    const decoded = decodeURIComponent(url);
    
    // Check for DASH path patterns - but exclude baseline videos (/m86/ indicates baseline)
    const hasDashPath = /\/v\/t\d+\//.test(url);
    if (hasDashPath && !url.includes('/m86/')) {
      // If it has DASH path but is NOT baseline, it's likely a segment
      return true;
    }
    
    // Try to decode base64 in efg parameter to check for audio-only indicators
    let isAudioOnly = false;
    try {
      const efgMatch = url.match(/efg=([^&]+)/);
      if (efgMatch) {
        const efgValue = decodeURIComponent(efgMatch[1]);
        // Try to decode base64
        try {
          const decodedEfg = Buffer.from(efgValue, 'base64').toString('utf-8');
          // Check for audio-only indicators
          if (decodedEfg.includes('audio') && !decodedEfg.includes('video') ||
              decodedEfg.includes('dash_ln_heaac') ||
              decodedEfg.includes('dash_audio') ||
              decodedEfg.includes('audio_only')) {
            isAudioOnly = true;
          }
        } catch (e) {
          // If base64 decode fails, check the raw value
          if (efgValue.includes('audio') && !efgValue.includes('video')) {
            isAudioOnly = true;
          }
        }
      }
    } catch (e) {
      // Ignore efg parsing errors
    }
    
    // Check for DASH indicators in both raw and decoded URL
    const checks = [
      url.includes('dashinit'),
      url.includes('dashinit.mp4'),
      decoded.includes('dashinit'),
      decoded.includes('dashinit.mp4'),
      url.includes('/v/t2/'), // DASH path pattern
      url.includes('/v/t') && /\/v\/t\d+\//.test(url), // Any /v/tX/ pattern (more strict)
      url.includes('dash'),
      url.includes('video_only'),
      url.includes('muted'),
      url.includes('.mpd'),
      url.includes('segment'),
      isAudioOnly, // Audio-only stream detected
      // Check _nc_vs parameter for dashinit (base64 encoded)
      url.includes('_nc_vs=') && (url.includes('dashinit') || decoded.includes('dashinit')),
      // Check for audio-only in decoded URL
      (decoded.includes('dash_ln_heaac') || decoded.includes('dash_audio') || decoded.includes('audio_only')),
    ];
    
    return checks.some(check => check === true);
  } catch (e) {
    // If decoding fails, just check the raw URL
    const hasDashPath = /\/v\/t\d+\//.test(url);
    return url.includes('dashinit') ||
           url.includes('dash') ||
           url.includes('/v/t2/') ||
           hasDashPath ||
           url.includes('video_only') ||
           url.includes('muted') ||
           url.includes('.mpd') ||
           url.includes('segment');
  }
}

/**
 * Clean and deduplicate video URLs
 * Removes duplicates, fixes malformed URLs, and selects the best quality video with audio
 * @param priorityUrls - Set of URLs from video_versions (full videos with audio)
 */
function deduplicateAndCleanVideoUrls(results: InstagramContent[], priorityUrls: Set<string> = new Set()): InstagramContent[] {
  const videoResults = results.filter(r => r.type === 'video' || r.type === 'reel' || r.type === 'igtv');
  const nonVideoResults = results.filter(r => r.type !== 'video' && r.type !== 'reel' && r.type !== 'igtv');
  
  if (videoResults.length === 0) {
    return results;
  }
  
  // Clean and normalize URLs
  const cleanedUrls = new Map<string, InstagramContent>();
  
  for (const result of videoResults) {
    let cleanedUrl = result.url;
    
    // Fix escaped characters (\\/ -> /)
    cleanedUrl = cleanedUrl.replace(/\\\//g, '/');
    cleanedUrl = cleanedUrl.replace(/\\/g, '');
    
    // Remove HTML entities
    cleanedUrl = cleanedUrl.replace(/&amp;/g, '&');
    cleanedUrl = cleanedUrl.replace(/&lt;/g, '<');
    cleanedUrl = cleanedUrl.replace(/&gt;/g, '>');
    
    // Remove trailing XML tags or malformed content
    cleanedUrl = cleanedUrl.split('</BaseURL>')[0];
    cleanedUrl = cleanedUrl.split('</SegmentBase')[0];
    cleanedUrl = cleanedUrl.split('<BaseURL>')[0];
    
    // Remove trailing whitespace
    cleanedUrl = cleanedUrl.trim();
    
    // Validate URL
    if (!cleanedUrl.startsWith('http://') && !cleanedUrl.startsWith('https://')) {
      continue;
    }
    
    // Extract base URL and clean query parameters
    try {
      const urlObj = new URL(cleanedUrl);
      const baseUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
      
      // Remove range request parameters (bytestart, byteend) that make videos unplayable
      urlObj.searchParams.delete('bytestart');
      urlObj.searchParams.delete('byteend');
      urlObj.searchParams.delete('range');
      
      // Rebuild URL without range parameters
      const fullVideoUrl = urlObj.toString();
      
      // Check if this URL is from video_versions (priority - full video with audio)
      const isPriority = priorityUrls.has(result.url) || priorityUrls.has(cleanedUrl);
      
      // Check if we already have this video (by base URL)
      if (!cleanedUrls.has(baseUrl)) {
        cleanedUrls.set(baseUrl, {
          ...result,
          url: fullVideoUrl,
          isPriority: isPriority, // Mark priority URLs
        } as InstagramContent & { isPriority?: boolean });
      } else {
        // If we have multiple versions, prefer:
        // 1. Priority URLs (from video_versions)
        // 2. URLs without range parameters
        // 3. URLs with more query parameters
        const existing = cleanedUrls.get(baseUrl)! as InstagramContent & { isPriority?: boolean };
        const existingIsPriority = existing.isPriority || false;
        const existingHasRange = existing.url.includes('bytestart') || existing.url.includes('byteend');
        const currentHasRange = fullVideoUrl.includes('bytestart') || fullVideoUrl.includes('byteend');
        
        // Prefer priority URLs (from video_versions - full video with audio)
        if (!existingIsPriority && isPriority) {
          cleanedUrls.set(baseUrl, {
            ...result,
            url: fullVideoUrl,
            isPriority: true,
          } as InstagramContent & { isPriority?: boolean });
        } else if (existingIsPriority && !isPriority) {
          // Keep existing priority one
        } else if (existingHasRange && !currentHasRange) {
          // Prefer URL without range parameters
          cleanedUrls.set(baseUrl, {
            ...result,
            url: fullVideoUrl,
            isPriority: isPriority,
          } as InstagramContent & { isPriority?: boolean });
        } else if (!existingHasRange && currentHasRange) {
          // Keep existing one without range
        } else if (fullVideoUrl.length > existing.url.length) {
          // If both have or don't have range, prefer longer URL
          cleanedUrls.set(baseUrl, {
            ...result,
            url: fullVideoUrl,
            isPriority: isPriority,
          } as InstagramContent & { isPriority?: boolean });
        }
      }
    } catch (e) {
      // Invalid URL, skip it
      continue;
    }
  }
  
  // Convert map to array
  const uniqueVideos = Array.from(cleanedUrls.values()).map(v => {
    // Remove isPriority property before returning
    const { isPriority, ...content } = v as InstagramContent & { isPriority?: boolean };
    return { ...content, _isPriority: isPriority || false };
  });
  
  // Filter to only baseline videos (full video with audio) - these are the accurate ones
  const baselineVideos = uniqueVideos.filter((v: any) => isBaselineVideo(v.url));
  
  // If we found baseline videos, use only those; otherwise use all unique videos
  const videosToReturn = baselineVideos.length > 0 ? baselineVideos : uniqueVideos;
  
  console.log(`Found ${baselineVideos.length} baseline video(s) out of ${uniqueVideos.length} total unique video(s)`);
  
  // Sort videos by quality (best first)
  // Keep _isPriority for sorting, then remove it
  videosToReturn.sort((a: any, b: any) => {
    // First priority: Baseline videos (full video with audio)
    const aIsBaseline = isBaselineVideo(a.url);
    const bIsBaseline = isBaselineVideo(b.url);
    
    if (!aIsBaseline && bIsBaseline) return 1; // b is better (baseline)
    if (aIsBaseline && !bIsBaseline) return -1; // a is better (baseline)
    
    // Second priority: URLs from video_versions (full video with audio)
    const aIsPriority = a._isPriority || false;
    const bIsPriority = b._isPriority || false;
    
    if (!aIsPriority && bIsPriority) return 1; // b is better (from video_versions)
    if (aIsPriority && !bIsPriority) return -1; // a is better (from video_versions)
    
    // Second priority: Remove URLs with range parameters (bytestart, byteend)
    const aHasRange = a.url.includes('bytestart') || a.url.includes('byteend') || a.url.includes('range=');
    const bHasRange = b.url.includes('bytestart') || b.url.includes('byteend') || b.url.includes('range=');
    
    if (aHasRange && !bHasRange) return 1; // b is better (no range)
    if (!aHasRange && bHasRange) return -1; // a is better (no range)
    
    // Third priority: Avoid video-only streams (dash segments, video-only indicators)
    const aIsVideoOnly = isDashSegmentOrVideoOnly(a.url);
    const bIsVideoOnly = isDashSegmentOrVideoOnly(b.url);
    
    if (aIsVideoOnly && !bIsVideoOnly) return 1; // b is better (has audio)
    if (!aIsVideoOnly && bIsVideoOnly) return -1; // a is better (has audio)
    
    // Fourth priority: Prefer URLs without explicit quality tags (usually default/highest with audio)
    const aHasQuality = a.url.includes('_nc_vs=') || a.url.includes('quality');
    const bHasQuality = b.url.includes('_nc_vs=') || b.url.includes('quality');
    
    if (!aHasQuality && bHasQuality) return -1;
    if (aHasQuality && !bHasQuality) return 1;
    
    // Fifth priority: Prefer URLs that are likely the main video file
    const aIsMainVideo = !a.url.includes('/v/t2/') && !a.url.match(/\/v\/t\d+\//) && !a.url.includes('segment');
    const bIsMainVideo = !b.url.includes('/v/t2/') && !b.url.match(/\/v\/t\d+\//) && !b.url.includes('segment');
    
    if (aIsMainVideo && !bIsMainVideo) return -1;
    if (!aIsMainVideo && bIsMainVideo) return 1;
    
    // Sixth priority: Prefer longer URLs (more parameters often = better quality)
    return b.url.length - a.url.length;
  });
  
  // Remove the _isPriority property from all videos before returning
  const cleanedVideos = videosToReturn.map((v: any) => {
    if (v._isPriority !== undefined) {
      const { _isPriority, ...content } = v;
      return content;
    }
    return v;
  });
  
  // Return baseline videos if found, otherwise return all unique videos (best quality first)
  return cleanedVideos;
}

async function extractWithOGParser(url: string): Promise<InstagramContent[]> {
  console.log('Starting OG parser extraction for:', url);
  try {
    const proxy = getNextProxy();
    const axiosConfig: any = {
      headers: {
        'User-Agent': getUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.instagram.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      },
      timeout: 15000,
      maxRedirects: 5,
    };

    if (proxy) {
      axiosConfig.proxy = {
        host: proxy.host,
        port: proxy.port,
        auth: proxy.username && proxy.password ? {
          username: proxy.username,
          password: proxy.password,
        } : undefined,
      };
    }

    const response = await axios.get(url, axiosConfig);
    console.log(response, "==response===")
    const $ = cheerio.load(response.data);

    const results: InstagramContent[] = [];
console.log(results, "=====results")
    // Extract Open Graph meta tags
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDescription = $('meta[property="og:description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogVideo = $('meta[property="og:video"]').attr('content');
    const ogVideoSecure = $('meta[property="og:video:secure_url"]').attr('content');
    const ogVideoType = $('meta[property="og:video:type"]').attr('content');

    // Determine content type based on URL
    let contentType: InstagramContent['type'] = 'photo';
    if (url.includes('/reel/')) contentType = 'reel';
    else if (url.includes('/tv/')) contentType = 'igtv';
    else if (url.includes('/stories/')) contentType = 'story';
    else if (ogVideo || ogVideoSecure) contentType = 'video';

    // Extract author from title or description
    const author = ogTitle?.split(' on Instagram')[0] || 
                  ogDescription?.match(/@(\w+)/)?.[1] || 
                  'Unknown';

    if (ogVideo || ogVideoSecure) {
      results.push({
        type: contentType,
        url: ogVideoSecure || ogVideo || '',
        thumbnail: ogImage,
        title: ogTitle,
        author,
        description: ogDescription,
      });
    } else if (ogImage) {
      results.push({
        type: contentType,
        url: ogImage,
        thumbnail: ogImage,
        title: ogTitle,
        author,
        description: ogDescription,
      });
    }

    return results;
  } catch (error) {
    console.error('OG Parser error:', error);
    return [];
  }
}

async function extractWithPuppeteer(url: string, targetShortcode: string | null = null): Promise<InstagramContent[]> {
  let browser;
  
  try {
    const proxy = getNextProxy();
    
    const launchOptions: any = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    };

    if (proxy) {
      launchOptions.args.push(`--proxy-server=${proxy.host}:${proxy.port}`);
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Set user agent
    await page.setUserAgent(getUserAgent());

    // Set viewport
    await page.setViewport({ width: 1366, height: 768 });

    // Set up response interception to capture video URLs from network requests
    // CRITICAL: Only capture URLs that we know belong to the target post (from GraphQL)
    const videoUrls: string[] = [];
    const priorityVideoUrls: Set<string> = new Set(); // URLs from video_versions (full videos with audio)
    const targetPostVideoUrls: Set<string> = new Set(); // URLs that belong to the target post (from GraphQL)
    
    // Store targetShortcode in closure for response handler
    const responseTargetShortcode = targetShortcode;
    
    // Share targetPostVideoUrls with response handler
    const responseTargetPostVideoUrls = targetPostVideoUrls;
    
    // IMPORTANT: Don't capture video URLs from network requests unless we know they belong to the target post
    // This prevents capturing videos from related/recommended reels on the page
    page.on('request', (request) => {
      const requestUrl = request.url();
      
      // Skip all video requests unless we know they belong to the target post
      // We'll only capture videos from GraphQL responses that match the target shortcode
      const isVideoUrl = 
        (requestUrl.includes('.mp4') || requestUrl.includes('.m4v')) &&
        !isDashSegmentOrVideoOnly(requestUrl) &&
        !requestUrl.includes('bytestart') &&
        !requestUrl.includes('byteend');
      
      if (isVideoUrl) {
        // Only add if we know it belongs to the target post (from GraphQL)
        // This prevents capturing videos from related posts
        if (responseTargetShortcode && responseTargetPostVideoUrls.has(requestUrl)) {
          if (!videoUrls.includes(requestUrl)) {
            videoUrls.push(requestUrl);
            console.log('Found full video URL from request (target post):', requestUrl.substring(0, 100));
          }
        }
        // If no target shortcode, we'll rely on GraphQL filtering
      }
    });
    
    page.on('response', async (response) => {
      const responseUrl = response.url();
      
      // Skip dash segments, video-only streams, and range requests (they don't have audio or are incomplete)
      if (isDashSegmentOrVideoOnly(responseUrl) ||
          responseUrl.includes('bytestart') ||
          responseUrl.includes('byteend') ||
          responseUrl.includes('range=')) {
        return; // Skip these as they're video-only or partial
      }
      
      // IMPORTANT: Don't capture video URLs from network responses unless we know they belong to the target post
      // This prevents capturing videos from related/recommended reels
      const isVideoUrl = 
        (responseUrl.includes('.mp4') || responseUrl.includes('.m4v')) &&
        !isDashSegmentOrVideoOnly(responseUrl) &&
        !responseUrl.includes('bytestart') &&
        !responseUrl.includes('byteend');
      
      if (isVideoUrl) {
        // Only add if we know it belongs to the target post (from GraphQL)
        // This prevents capturing videos from related posts
        if (responseTargetShortcode && responseTargetPostVideoUrls.has(responseUrl)) {
          if (!videoUrls.includes(responseUrl)) {
            videoUrls.push(responseUrl);
            console.log('Found full video URL from network response (target post):', responseUrl.substring(0, 100));
          }
        }
        // If no target shortcode, we'll rely on GraphQL filtering
      }

      // Intercept GraphQL API responses which contain video URLs
      if (responseUrl.includes('/api/graphql') || responseUrl.includes('/graphql/query')) {
        try {
          // No .clone() available on Puppeteer's HTTPResponse; get JSON directly
          const responseData = await response.json();
          const responseText = JSON.stringify(responseData);

          // Check if this response contains reel/shortcode data
          const isReelResponse = responseText.includes('shortcode') || 
                                 responseText.includes('reel') || 
                                 responseUrl.includes('shortcode') ||
                                 responseData?.data?.shortcode_media ||
                                 responseData?.data?.reel;
          
          if (isReelResponse) {
            console.log('Found reel-specific GraphQL response');
            // Log the structure to debug
            if (responseData?.data?.shortcode_media) {
              console.log('GraphQL structure: data.shortcode_media found');
            }
            if (responseData?.data?.reel) {
              console.log('GraphQL structure: data.reel found');
            }
          }
          
          // Only log if we find video URLs to reduce noise
          if (responseText.includes('video_url') || responseText.includes('videoUrl') || responseText.includes('video_versions')) {
            console.log('GraphQL response with video data:', responseText.substring(0, 500));
          }
          
          // Check if this GraphQL response is for the target post
          let isTargetPost = false;
          if (responseTargetShortcode) {
            // Check if response contains the target shortcode
            const responseStr = JSON.stringify(responseData);
            if (responseData?.data?.shortcode_media?.shortcode === responseTargetShortcode ||
                responseData?.data?.reel?.shortcode === responseTargetShortcode ||
                responseStr.includes(`"shortcode":"${responseTargetShortcode}"`)) {
              isTargetPost = true;
              console.log(`GraphQL response matches target shortcode: ${responseTargetShortcode}`);
            } else {
              // Skip if this is not the target post
              console.log(`Skipping GraphQL response - not for target shortcode ${responseTargetShortcode}`);
              return;
            }
          }
          
          // Deep search for video URLs in nested JSON structures
          // Improved version based on SaveClip.app analysis
          function findVideoUrls(obj: any, found: string[], checkShortcode: boolean = true): void {
            if (typeof obj === 'string') {
              // Check if it's a video URL - more specific checks
              // Skip range requests, segments, and dash files
              if ((obj.startsWith('http://') || obj.startsWith('https://')) &&
                  !obj.startsWith('blob:') &&
                  !obj.includes('bytestart') &&
                  !obj.includes('byteend') &&
                  !obj.includes('range=') &&
                  !isDashSegmentOrVideoOnly(obj) &&
                  (obj.includes('.mp4') || obj.includes('.m4v') ||
                   (obj.includes('cdninstagram') && (obj.includes('/video/') || obj.includes('/reel/') || obj.match(/\/video\/|\/reel\//))) ||
                   (obj.includes('fbcdn') && (obj.includes('video') || obj.includes('.mp4'))) ||
                   (obj.includes('instagram') && obj.includes('video') && obj.match(/\.(mp4|m4v)/))) &&
                  !found.includes(obj)) {
                found.push(obj);
              }
            } else if (Array.isArray(obj)) {
              obj.forEach(item => findVideoUrls(item, found));
            } else if (obj && typeof obj === 'object') {
              // Check for common video URL field names and structures (Instagram-specific)
              const videoFields = [
                'video_url', 
                'videoUrl', 
                'url', 
                'playback_url', 
                'download_url', 
                'src',
                'video_versions',
                'video_duration',
                'video_bitrate',
                'video_codec'
              ];
              
              // Handle video_versions array structure (Instagram's standard format)
              // video_versions[0] is typically the highest quality full video with audio
              if (obj.video_versions && Array.isArray(obj.video_versions)) {
                console.log(`Found video_versions array with ${obj.video_versions.length} version(s)`);
                // Prioritize the first version (highest quality, usually has audio)
                obj.video_versions.forEach((version: any, index: number) => {
                  if (version && typeof version === 'object') {
                    // For video_versions, we need to be more lenient - even if they have /v/tX/ paths,
                    // they might be the full video with audio when combined properly
                    // But we still reject obvious audio-only or video-only indicators
                    const isValidUrl = (url: string) => {
                      if (!url) return false;
                      
                      // Reject range requests
                      if (url.includes('bytestart') || url.includes('byteend') || url.includes('range=')) {
                        return false;
                      }
                      
                      // Check if it's audio-only (we still reject these)
                      try {
                        const efgMatch = url.match(/efg=([^&]+)/);
                        if (efgMatch) {
                          const efgValue = decodeURIComponent(efgMatch[1]);
                          try {
                            const decoded = Buffer.from(efgValue, 'base64').toString('utf-8');
                            if (decoded.includes('dash_ln_heaac') || decoded.includes('audio_only') || 
                                (decoded.includes('audio') && !decoded.includes('video'))) {
                              console.log(`Rejecting audio-only URL from video_versions[${index}]`);
                              return false;
                            }
                          } catch (e) {
                            // Can't decode, continue
                          }
                        }
                      } catch (e) {
                        // Ignore
                      }
                      
                      // For video_versions, we accept even /v/tX/ paths if they're not audio-only
                      // because sometimes these are the only URLs available and they work
                      return true;
                    };
                    
                    // Prioritize version 0 (highest quality with audio)
                    // Check url, video_url, playback_url
                    if (version.url && isValidUrl(version.url)) {
                      found.push(version.url);
                      // Mark first version as priority (full video with audio)
                      if (index === 0) {
                        priorityVideoUrls.add(version.url);
                        console.log('Found priority video URL from video_versions[0].url:', version.url.substring(0, 150));
                      }
                    }
                    if (version.video_url && isValidUrl(version.video_url)) {
                      found.push(version.video_url);
                      if (index === 0) {
                        priorityVideoUrls.add(version.video_url);
                        console.log('Found priority video URL from video_versions[0].video_url:', version.video_url.substring(0, 150));
                      }
                    }
                    if (version.playback_url && isValidUrl(version.playback_url)) {
                      found.push(version.playback_url);
                      if (index === 0) {
                        priorityVideoUrls.add(version.playback_url);
                        console.log('Found priority video URL from video_versions[0].playback_url:', version.playback_url.substring(0, 150));
                      }
                    }
                  }
                });
              }
              
              // Handle shortcode_media structure (common for reels/posts)
              if (obj.shortcode_media && typeof obj.shortcode_media === 'object') {
                // Only extract if it matches target shortcode (or no target specified)
                if (!responseTargetShortcode || obj.shortcode_media.shortcode === responseTargetShortcode) {
                  console.log('Found shortcode_media structure matching target, extracting video_versions', obj.shortcode_media.shortcode);
                  findVideoUrls(obj.shortcode_media, found, false); // Don't check shortcode again, already verified
                } else {
                  console.log(`Skipping shortcode_media with shortcode ${obj.shortcode_media.shortcode} (target: ${responseTargetShortcode})`);
                }
              }
              
              // Handle clips (for Reels with multiple clips)
              if (obj.clips && Array.isArray(obj.clips)) {
                obj.clips.forEach((clip: any) => {
                  if (clip.video_versions) {
                    clip.video_versions.forEach((version: any, index: number) => {
                      if (version && version.url && !isDashSegmentOrVideoOnly(version.url)) {
                        found.push(version.url);
                        // Mark first version as priority (full video with audio)
                        if (index === 0) {
                          priorityVideoUrls.add(version.url);
                          console.log('Found priority video URL from clips[0].video_versions[0]:', version.url.substring(0, 100));
                        }
                      }
                    });
                  }
                });
              }
              
              // Handle carousel_media (posts with multiple media)
              if (obj.carousel_media && Array.isArray(obj.carousel_media)) {
                obj.carousel_media.forEach((media: any) => {
                  if (media.video_versions) {
                    media.video_versions.forEach((version: any, index: number) => {
                      if (version && version.url && !isDashSegmentOrVideoOnly(version.url)) {
                        found.push(version.url);
                        // Mark first version as priority (full video with audio)
                        if (index === 0) {
                          priorityVideoUrls.add(version.url);
                          console.log('Found priority video URL from carousel_media[].video_versions[0]:', version.url.substring(0, 100));
                        }
                      }
                    });
                  }
                  if (media.video_url && !isDashSegmentOrVideoOnly(media.video_url)) {
                    found.push(media.video_url);
                    priorityVideoUrls.add(media.video_url); // video_url is usually full video
                    console.log('Found priority video URL from carousel_media.video_url:', media.video_url.substring(0, 100));
                  }
                });
              }
              
              // Check direct video fields
              for (const key in obj) {
                if (videoFields.includes(key) && typeof obj[key] === 'string') {
                  const url = obj[key];
                  if ((url.includes('.mp4') || url.includes('.m4v') ||
                       (url.includes('cdninstagram') && (url.includes('/video/') || url.includes('/reel/') || url.includes('/v/t'))) ||
                       (url.includes('fbcdn') && url.includes('video'))) &&
                      url.startsWith('http')) {
                    if (!found.includes(url)) {
                      found.push(url);
                    }
                  }
                }
                // Recursively search nested objects
                findVideoUrls(obj[key], found);
              }
            }
          }
          
          const foundUrls: string[] = [];
          // Only extract if this is the target post (or no target specified)
          if (isTargetPost || !responseTargetShortcode) {
            findVideoUrls(responseData, foundUrls);
          }
          
          for (const videoUrl of foundUrls) {
            // Mark this URL as belonging to the target post
            targetPostVideoUrls.add(videoUrl);
            
            if (!videoUrls.includes(videoUrl)) {
              videoUrls.push(videoUrl);
              console.log('Found video URL from GraphQL (target post):', videoUrl);
            }
          }
        } catch (error) {
          console.error('Error parsing GraphQL response:', error);
        }
      }
    });

    // Navigate to the Instagram URL
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait longer for videos to load and try to trigger video loading
    console.log('Waiting for initial page load...');
    await new Promise(res => setTimeout(res, 5000));
    
    // Try scrolling to trigger lazy loading
    try {
      console.log('Scrolling to trigger content loading...');
      await page.evaluate(() => {
        window.scrollTo(0, window.innerHeight);
      });
    await new Promise(res => setTimeout(res, 3000));
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await new Promise(res => setTimeout(res, 3000));
    } catch (error) {
      console.log('Scroll error:', error);
    }

    // Wait additional time for content to load
    console.log('Waiting for content to fully load...');
    await new Promise(res => setTimeout(res, 5000));

    // Try to interact with video player to ensure it loads
    try {
      console.log('Attempting to interact with video element...');
      const videoElement = await page.$('video');
      if (videoElement) {
        console.log('Video element found, clicking...');
        // Try clicking and waiting for video to start loading
        await videoElement.click();
        await new Promise(res => setTimeout(res, 5000));
        
        // Try to play the video and wait for it to load
        console.log('Attempting to play video...');
        await page.evaluate(() => {
          const videos = document.querySelectorAll('video');
          videos.forEach(v => {
            try {
              (v as HTMLVideoElement).play().catch(() => {});
            } catch (e) {}
          });
        });
        await new Promise(res => setTimeout(res, 5000));
        
        // Wait for video metadata to load (with timeout)
        console.log('Waiting for video to load metadata...');
        try {
          await page.waitForFunction(
            () => {
              const videos = document.querySelectorAll('video');
              for (const v of Array.from(videos)) {
                if ((v as HTMLVideoElement).readyState >= 1) {
                  const src = (v as HTMLVideoElement).src || (v as HTMLVideoElement).currentSrc;
                  if (src && !src.startsWith('blob:') && (src.includes('.mp4') || src.includes('cdninstagram'))) {
                    return true;
                  }
                }
              }
              return false;
            },
            { timeout: 10000 }
          ).catch(() => {
            // If video doesn't load, continue anyway
          });
        } catch (e) {
          // Ignore wait errors
        }
        
    await new Promise(res => setTimeout(res, 3000));
      }
    } catch (error) {
      // Ignore if video interaction fails
    }

    // Get page HTML source for additional parsing
    // BUT: Only extract if HTML contains the target shortcode (to avoid extracting from related posts)
    const pageHtml = await page.content();
    console.log('Page HTML length:', pageHtml.length);
    
    // Only parse HTML if it contains the target shortcode (or no target specified)
    if (!targetShortcode || pageHtml.includes(`"shortcode":"${targetShortcode}"`) || pageHtml.includes(`/reel/${targetShortcode}/`) || pageHtml.includes(`/p/${targetShortcode}/`)) {
      // Try to extract video URLs from raw HTML
      // Comprehensive patterns based on SaveClip.app analysis
      const htmlVideoUrlPatterns = [
        // Instagram CDN patterns (most common)
        /https?:\/\/[^"'\s<>]+cdninstagram[^"'\s<>]*\/v\/t[^"'\s<>]*\.mp4[^"'\s<>]*/gi,
        /https?:\/\/[^"'\s<>]+cdninstagram[^"'\s<>]*\/video\/[^"'\s<>]*\.mp4[^"'\s<>]*/gi,
        /https?:\/\/[^"'\s<>]+cdninstagram[^"'\s<>]*\/reel\/[^"'\s<>]*\.mp4[^"'\s<>]*/gi,
        /https?:\/\/scontent[^"'\s<>]*cdninstagram[^"'\s<>]*\.mp4[^"'\s<>]*/gi,
        
        // Facebook CDN patterns
        /https?:\/\/[^"'\s<>]+fbcdn[^"'\s<>]*video[^"'\s<>]*\.mp4[^"'\s<>]*/gi,
        
        // JSON structures in HTML (only if they contain target shortcode)
        /"video_url":\s*"([^"]+)"/gi,
        /"videoUrl":\s*"([^"]+)"/gi,
        /"playback_url":\s*"([^"]+)"/gi,
        /"video_versions":\s*\[\s*\{[^}]*"url":\s*"([^"]+)"/gi,
        /"video_versions":\s*\[\s*\{[^}]*"video_url":\s*"([^"]+)"/gi,
        
        // Generic MP4 patterns
        /https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/gi,
      ];
      
      for (const pattern of htmlVideoUrlPatterns) {
        const matches = pageHtml.matchAll(pattern);
        for (const match of matches) {
          const videoUrl = match[1] || match[0];
          // Filter out range requests, segments, and video-only streams
          if (videoUrl && 
              videoUrl.startsWith('http') && 
              (videoUrl.includes('.mp4') || videoUrl.includes('cdninstagram')) &&
              !videoUrl.includes('bytestart') &&
              !videoUrl.includes('byteend') &&
              !videoUrl.includes('range=') &&
              !isDashSegmentOrVideoOnly(videoUrl) &&
              !videoUrls.includes(videoUrl)) {
            // Only add if we know it belongs to the target post (from GraphQL)
            // OR if we don't have a target shortcode (fallback)
            if (!targetShortcode || targetPostVideoUrls.has(videoUrl)) {
              videoUrls.push(videoUrl);
              console.log('Found full video URL from HTML (target post):', videoUrl.substring(0, 100));
            }
          }
        }
      }
    } else {
      console.log(`Skipping HTML parsing - page does not contain target shortcode ${targetShortcode}`);
    }

    // Extract content using page evaluation
    const content = await page.evaluate(async (targetShortcode: string | null) => {
      const results: any[] = [];

      console.log('Starting video extraction in page context', targetShortcode);

      // Declare shortcodeMedia at top level so it's accessible throughout
      let shortcodeMedia: any = null;

      // Helper to check if image is profile picture
      const isProfilePic = (url: string): boolean => {
        if (!url) return false;
        if (url.includes('_s150x150_') || url.includes('_s640x640_')) {
          try {
            const efgMatch = url.match(/efg=([^&]+)/);
            if (efgMatch) {
              const efgValue = decodeURIComponent(efgMatch[1]);
              if (efgValue.includes('profile_pic') || efgValue.includes('django.') || efgValue.includes('djano')) {
                return true;
              }
            }
          } catch (e) {}
          if (url.includes('profile_pic') || url.includes('djano') || url.includes('django.')) {
            return true;
          }
        }
        if (url.match(/\/v\/t51\.\d+-\d+\/[^\/]+\.jpg/) && url.includes('_s150x150_')) {
          return true;
        }
        return false;
      };

      // Helper function to convert blob URL to base64
      const blobToBase64 = async (blobUrl: string): Promise<string | null> => {
        try {
          const response = await fetch(blobUrl);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error('Failed to convert blob to base64:', error);
          return null;
        }
      };

      // Method 1: Try to find video elements with multiple fallback strategies
      const videos = document.querySelectorAll('video');
      for (const video of Array.from(videos)) {
        // Try multiple ways to get the video URL
        let src = video.src || 
                  video.currentSrc || 
                  (video.querySelector('source') as HTMLSourceElement)?.src ||
                  (video as any).getAttribute('data-src') ||
                  (video as any).getAttribute('data-video-url') ||
                  (video as any).getAttribute('data-original-url') ||
                  '';

        // If still no src, check for nested sources
        if (!src && video.querySelector('source')) {
          const sources = video.querySelectorAll('source');
          for (const source of Array.from(sources)) {
            const sourceSrc = (source as HTMLSourceElement).src;
            if (sourceSrc && !sourceSrc.startsWith('blob:')) {
              src = sourceSrc;
              break;
            }
          }
        }

        // Try to get URL from video element's network activity
        if (!src || src.startsWith('blob:')) {
          // Check if video has loaded metadata
          try {
            if (video.readyState >= 1) {
              // Try to get from network state
              const networkState = (video as HTMLVideoElement).networkState;
              if (networkState === HTMLMediaElement.NETWORK_IDLE || networkState === HTMLMediaElement.NETWORK_LOADING) {
                src = video.currentSrc || video.src || '';
              }
            }
          } catch (e) {
            // Ignore errors
          }
        }

        // Try extracting from parent elements
        if (!src || src.startsWith('blob:')) {
          let parent = video.parentElement;
          let depth = 0;
          while (parent && depth < 5) {
            const dataSrc = parent.getAttribute('data-video-url') || 
                           parent.getAttribute('data-src') ||
                           parent.getAttribute('data-original-url');
            if (dataSrc && !dataSrc.startsWith('blob:')) {
              src = dataSrc;
              break;
            }
            parent = parent.parentElement;
            depth++;
          }
        }

        if (src && src.trim() !== '' && !src.startsWith('blob:')) {
          // Only add valid video URLs
          if (src.includes('instagram') || src.includes('cdninstagram') || src.includes('fbcdn') || src.includes('.mp4') || src.includes('.m4v')) {
          results.push({
            type: 'video',
            url: src,
            thumbnail: video.poster || '',
          });
        }
        }
      }

      // Method 2: Look for video URLs in page source/scripts and HTML content
      try {
        // First, try to access window.__initialData__ or similar embedded data
        const windowData = (window as any).__initialData__ || 
                         (window as any).__additionalData__ || 
                         (window as any)._sharedData ||
                         {};
        
        // Specifically look for shortcode_media in window data
        try {
          // First try PostPage (for single post pages)
          if (windowData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media) {
            const media = windowData.entry_data.PostPage[0].graphql.shortcode_media;
            // If we have target shortcode, verify it matches
            if (!targetShortcode || media.shortcode === targetShortcode) {
              shortcodeMedia = media;
              console.log('Found shortcode_media in window.__initialData__', media.shortcode);
            }
          } else if (windowData?.graphql?.shortcode_media) {
            const media = windowData.graphql.shortcode_media;
            if (!targetShortcode || media.shortcode === targetShortcode) {
              shortcodeMedia = media;
              console.log('Found shortcode_media in window data', media.shortcode);
            }
          }
          
          // Also check for reel data
          if (!shortcodeMedia && windowData?.entry_data?.ReelPage?.[0]?.graphql?.reel) {
            const reel = windowData.entry_data.ReelPage[0].graphql.reel;
            if (!targetShortcode || reel.shortcode === targetShortcode) {
              shortcodeMedia = reel;
              console.log('Found reel in window data', reel.shortcode);
            }
          }
        } catch (e) {
          console.log('Error accessing shortcode_media:', e);
        }
        
        const windowDataStr = JSON.stringify(windowData);
        
        // Also check document.body.innerHTML for video URLs
        const bodyHtml = document.body?.innerHTML || '';
        
        // Look for video URLs in window data and HTML
        const videoUrlPatterns = [
          /"video_url":"([^"]+)"/g,
          /"videoUrl":"([^"]+)"/g,
          /"video_versions":\s*\[[^\]]*"url":\s*"([^"]+)"/g,
          /"video_versions":\s*\[[^\]]*"url":\s*"([^"]+\.mp4[^"]*)"/g,
          /"playback_url":"([^"]+)"/g,
          /"download_url":"([^"]+)"/g,
          /https?:\/\/[^"'\s]+\.mp4[^"'\s]*/gi,
          /https?:\/\/[^"'\s]+video[^"'\s]+cdninstagram[^"'\s]*/gi,
          /https?:\/\/[^"'\s]+cdninstagram[^"'\s]+\.mp4[^"'\s]*/gi,
        ];
        
        // If we found shortcode_media, extract video_versions directly
        if (shortcodeMedia && shortcodeMedia.video_versions && Array.isArray(shortcodeMedia.video_versions)) {
          console.log(`Found ${shortcodeMedia.video_versions.length} video_versions in shortcode_media`);
          shortcodeMedia.video_versions.forEach((version: any, index: number) => {
            if (version && version.url && !version.url.startsWith('blob:')) {
              // Check if it's audio-only
              const isAudioOnly = version.url.includes('dash_ln_heaac') || 
                                 version.url.includes('audio_only') ||
                                 (version.url.match(/efg=([^&]+)/) && 
                                  version.url.includes('audio') && !version.url.includes('video'));
              
              if (!isAudioOnly) {
                results.push({
                  type: 'video',
                  url: version.url,
                  thumbnail: shortcodeMedia?.display_url || '',
                });
                console.log(`Extracted video_versions[${index}].url from shortcode_media`);
              }
            }
          });
        }
        
        // Only search for video URLs in window data if we have shortcode_media matching the target
        // This prevents extracting videos from related posts
        if (shortcodeMedia && (!targetShortcode || shortcodeMedia.shortcode === targetShortcode)) {
          const searchTexts = [windowDataStr, bodyHtml];
          
          for (const searchText of searchTexts) {
            for (const pattern of videoUrlPatterns) {
              const matches = searchText.matchAll(pattern);
              for (const match of matches) {
                const videoUrl = match[1] || match[0];
                if (videoUrl && !videoUrl.startsWith('blob:') && 
                    (videoUrl.includes('instagram') || videoUrl.includes('cdninstagram') || videoUrl.includes('fbcdn'))) {
                  // Make sure it's actually a video URL, not an image
                  if (videoUrl.includes('.mp4') || videoUrl.includes('.m4v') || 
                      (videoUrl.includes('cdninstagram') && (videoUrl.includes('/video/') || videoUrl.includes('/reel/') || videoUrl.match(/\/v\/t\d+/)))) {
                    if (!results.some(r => r.url === videoUrl)) {
                      results.push({
                        type: 'video',
                        url: videoUrl,
                        thumbnail: shortcodeMedia?.display_url || '',
                      });
                    }
                  }
                }
              }
            }
          }
        }

        // Also check scripts - but only if they contain the target shortcode
        const scripts = document.querySelectorAll('script[type="application/json"]');
        for (const script of Array.from(scripts)) {
          try {
            const data = JSON.parse(script.textContent || '{}');
            const dataStr = JSON.stringify(data);
            
            // Only extract if this script contains the target shortcode
            if (targetShortcode && !dataStr.includes(`"shortcode":"${targetShortcode}"`)) {
              continue; // Skip scripts that don't contain the target shortcode
            }
            
            for (const pattern of videoUrlPatterns) {
              const matches = dataStr.matchAll(pattern);
              for (const match of matches) {
                const videoUrl = match[1] || match[0];
                if (videoUrl && !videoUrl.startsWith('blob:') && 
                    (videoUrl.includes('instagram') || videoUrl.includes('cdninstagram') || videoUrl.includes('fbcdn'))) {
                  if (!results.some(r => r.url === videoUrl)) {
                    results.push({
                      type: 'video',
                      url: videoUrl,
                      thumbnail: shortcodeMedia?.display_url || '',
                    });
                  }
                }
              }
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }

        // Also check regular script tags - but only if they contain the target shortcode
        const allScripts = document.querySelectorAll('script:not([type="application/json"])');
        for (const script of Array.from(allScripts)) {
          const text = script.textContent || '';
          
          // Only extract if this script contains the target shortcode
          if (targetShortcode && !text.includes(`"shortcode":"${targetShortcode}"`)) {
            continue; // Skip scripts that don't contain the target shortcode
          }
          
          // Look for video URLs in JavaScript
          const videoUrlPatterns = [
            /"video_url":"([^"]+)"/g,
            /"videoUrl":"([^"]+)"/g,
            /"video_versions":\s*\[[^\]]*"url":\s*"([^"]+)"/g,
            /https?:\/\/[^"'\s]+\.mp4[^"'\s]*/gi,
            /https?:\/\/[^"'\s]+video[^"'\s]+cdninstagram[^"'\s]*/gi,
          ];
          
          for (const pattern of videoUrlPatterns) {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
              const videoUrl = match[1] || match[0];
              if (videoUrl && (videoUrl.includes('instagram') || videoUrl.includes('cdninstagram') || videoUrl.includes('fbcdn'))) {
                if (!results.some(r => r.url === videoUrl)) {
                  results.push({
                    type: 'video',
                    url: videoUrl,
                    thumbnail: shortcodeMedia?.display_url || '',
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        // Ignore errors
      }

      // Extract images from the specific post only (not profile pictures or other posts)
      // Only extract if we have shortcode_media data, otherwise be very selective
      if (shortcodeMedia) {
        // Extract display_url or image_versions2 from shortcode_media
        if (shortcodeMedia.display_url) {
          const imgUrl = shortcodeMedia.display_url;
          if (!results.some(r => r.url === imgUrl) && !isProfilePic(imgUrl)) {
            results.push({
              type: 'photo',
              url: imgUrl,
              thumbnail: imgUrl,
            });
          }
        }
        
        // Extract carousel images if present
        if (shortcodeMedia.carousel_media && Array.isArray(shortcodeMedia.carousel_media)) {
          shortcodeMedia.carousel_media.forEach((item: any) => {
            if (item.display_url && !isProfilePic(item.display_url)) {
              if (!results.some(r => r.url === item.display_url)) {
                results.push({
                  type: 'photo',
                  url: item.display_url,
                  thumbnail: item.display_url,
                });
              }
            }
            // Also check image_versions2
            if (item.image_versions2?.candidates) {
              item.image_versions2.candidates.forEach((candidate: any) => {
                if (candidate.url && !isProfilePic(candidate.url)) {
                  if (!results.some(r => r.url === candidate.url)) {
                    results.push({
                      type: 'photo',
                      url: candidate.url,
                      thumbnail: candidate.url,
                    });
                  }
                }
              });
            }
          });
        }
        
        // Extract image_versions2 if available
        if (shortcodeMedia.image_versions2?.candidates) {
          shortcodeMedia.image_versions2.candidates.forEach((candidate: any) => {
            if (candidate.url && !isProfilePic(candidate.url)) {
              if (!results.some(r => r.url === candidate.url)) {
                results.push({
                  type: 'photo',
                  url: candidate.url,
                  thumbnail: candidate.url,
                });
              }
            }
          });
        }
      } else {
        // Fallback: only extract images from main post area, exclude profile pictures
      const images = document.querySelectorAll('img');
        for (const img of Array.from(images)) {
          if (img.src && (img.src.includes('instagram') || img.src.includes('cdninstagram'))) {
            // Skip blob URLs and profile pictures
            if (!img.src.startsWith('blob:') && !isProfilePic(img.src)) {
              // Only add if it looks like a post image (not profile pic)
              // Post images don't have _s150x150_ pattern or profile_pic indicators
              if (!img.src.includes('_s150x150_') && !img.src.includes('profile_pic')) {
                if (!results.some(r => r.url === img.src)) {
          results.push({
            type: 'photo',
            url: img.src,
            thumbnail: img.src,
          });
        }
              }
            }
          }
        }
      }

      // Method 3: Check OpenGraph meta tags for video URLs
      try {
        const ogVideo = document.querySelector('meta[property="og:video"]')?.getAttribute('content');
        const ogVideoSecure = document.querySelector('meta[property="og:video:secure_url"]')?.getAttribute('content');
        
        if (ogVideoSecure || ogVideo) {
          const videoUrl = ogVideoSecure || ogVideo || '';
          if (videoUrl && !videoUrl.startsWith('blob:') && 
              !results.some(r => r.url === videoUrl)) {
            results.push({
              type: 'video',
              url: videoUrl,
            });
          }
        }
      } catch (e) {
        // Ignore errors
      }

      // Extract meta information
      const title = document.querySelector('title')?.textContent || '';
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

      return { results, title, description };
    }, targetShortcode);

    // Add metadata to results
    const results: InstagramContent[] = content.results.map((item: any) => ({
      ...item,
      title: content.title,
      description: content.description,
    }));

    // Extract thumbnail images from page (for associating with videos)
    // Filter out profile pictures
    const thumbnailImages = results
      .filter(r => r.type === 'photo' && r.thumbnail && !isProfilePicture(r.thumbnail))
      .map(r => r.thumbnail!)
      .filter((url): url is string => !!url && url.includes('instagram') && !isProfilePicture(url));

    // Add video URLs captured from network requests
    // Filter out any range-request URLs and DASH segments before adding
    const fullVideoUrls = videoUrls.filter(videoUrl => 
      !videoUrl.includes('bytestart') &&
      !videoUrl.includes('byteend') &&
      !videoUrl.includes('range=') &&
      !isDashSegmentOrVideoOnly(videoUrl)
    );
    
    console.log(`Found ${videoUrls.length} total video URLs, ${fullVideoUrls.length} full videos (filtered out ${videoUrls.length - fullVideoUrls.length} range requests)`);
    
    for (const videoUrl of fullVideoUrls) {
      if (!results.some(r => r.url === videoUrl)) {
        // Determine type based on URL pattern
        let type: InstagramContent['type'] = 'video';
        if (url.includes('/reel/')) type = 'reel';
        else if (url.includes('/tv/')) type = 'igtv';
        
        // Try to find a thumbnail for this video
        // Use the first available thumbnail image from the page
        const thumbnail = thumbnailImages.length > 0 ? thumbnailImages[0] : undefined;
        
        console.log(`Adding full video URL to results: ${videoUrl.substring(0, 100)}...`);
        results.push({
          type,
          url: videoUrl,
          thumbnail: thumbnail,
        });
      }
    }
    
    // Also ensure existing videos have thumbnails if they don't
    for (const result of results) {
      if ((result.type === 'video' || result.type === 'reel' || result.type === 'igtv') && !result.thumbnail && thumbnailImages.length > 0) {
        result.thumbnail = thumbnailImages[0];
      }
    }

    // Separate videos and non-videos
    const videoResults = results.filter(r => r.type === 'video' || r.type === 'reel' || r.type === 'igtv');
    const nonVideoResults = results.filter(r => r.type !== 'video' && r.type !== 'reel' && r.type !== 'igtv');
    
    console.log(`Total results found: ${results.length} (${videoResults.length} videos, ${nonVideoResults.length} photos/other)`);
    if (results.length === 0) {
      console.log('No content found. Instagram may require authentication to access content URLs.');
    }
    
    // Deduplicate and clean video URLs, passing priority URLs from video_versions
    const cleanedVideoResults = videoResults.length > 0 ? deduplicateAndCleanVideoUrls(videoResults, priorityVideoUrls) : [];
    
    console.log(`After deduplication: ${cleanedVideoResults.length} unique video(s), ${nonVideoResults.length} non-video item(s)`);
    console.log(`Priority URLs (from video_versions): ${priorityVideoUrls.size}`);
    
    // Combine all results: deduplicated videos + non-video content (photos, etc.)
    const cleanedResults = [...cleanedVideoResults, ...nonVideoResults];
    
    // Log all URL types found
    if (results.length > 0) {
      console.log('\n=== URL TYPES SUMMARY ===');
      const urlTypes = new Map<string, number>();
      results.forEach(r => {
        const type = r.type;
        urlTypes.set(type, (urlTypes.get(type) || 0) + 1);
      });
      
      console.log('Content types found:');
      urlTypes.forEach((count, type) => {
        console.log(`  - ${type}: ${count} URL(s)`);
      });
      
      // Log URL sources
      const sources = {
        'GraphQL (video_versions)': priorityVideoUrls.size,
        'Network requests': videoUrls.length,
        'HTML parsing': 0, // Will be calculated from results
        'Page evaluation': 0, // Will be calculated from results
      };
      
      console.log('\nURL sources:');
      Object.entries(sources).forEach(([source, count]) => {
        if (count > 0) {
          console.log(`  - ${source}: ${count} URL(s)`);
        }
      });
      
      // Log sample URLs by type
      console.log('\nSample URLs by type:');
      const samplesByType = new Map<string, string[]>();
      results.forEach(r => {
        if (!samplesByType.has(r.type)) {
          samplesByType.set(r.type, []);
        }
        const samples = samplesByType.get(r.type)!;
        if (samples.length < 2) {
          samples.push(r.url.substring(0, 100) + '...');
        }
      });
      
      samplesByType.forEach((samples, type) => {
        console.log(`  ${type}:`);
        samples.forEach((url, idx) => {
          console.log(`    [${idx + 1}] ${url}`);
        });
      });
      
      console.log('========================\n');
    }
    
    return cleanedResults;

  } catch (error) {
    console.error('Puppeteer extraction error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Retry mechanism with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
