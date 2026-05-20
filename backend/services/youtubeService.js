import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Extracts the 11-character video ID from various YouTube URL formats.
 * @param {string} url - The YouTube URL
 * @returns {string|null} The video ID, or null if invalid
 */
export function getVideoId(url) {
  if (!url) return null;
  
  // Clean URL string
  const cleanUrl = url.trim();
  
  // Regex pattern for various YouTube URL styles
  const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = cleanUrl.match(regExp);
  
  if (match && match[1].length === 11) {
    return match[1];
  }
  
  // Try matching direct 11-char ID
  if (cleanUrl.length === 11 && !cleanUrl.includes('/') && !cleanUrl.includes('?')) {
    return cleanUrl;
  }
  
  return null;
}

/**
 * Fetches the transcript for a YouTube video.
 * @param {string} videoIdOrUrl - The YouTube video ID or full URL
 * @returns {Promise<{text: string, start: number, duration: number}[]>} The transcript segments
 */
export async function fetchTranscript(videoIdOrUrl) {
  const videoId = getVideoId(videoIdOrUrl) || videoIdOrUrl;
  
  if (!videoId || videoId.length !== 11) {
    throw new Error('Invalid YouTube video URL or ID. Please check the URL.');
  }

  try {
    // Attempt to fetch transcript using the library
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    if (!transcript || transcript.length === 0) {
      throw new Error('No transcript contents returned.');
    }
    return transcript;
  } catch (error) {
    console.error('Error fetching transcript automatically:', error.message);
    throw new Error(
      `Could not retrieve YouTube transcript automatically. ` +
      `This often happens if captions are disabled for this video, if it is a music video, or if YouTube is rate-limiting requests. ` +
      `You can still generate study materials by pasting the transcript text manually below.`
    );
  }
}

/**
 * Combines transcript segments into a structured, timestamped block or raw text.
 * @param {{text: string, start: number, duration: number}[]} segments
 * @param {boolean} includeTimestamps
 * @returns {string} Combined text
 */
export function formatTranscriptSegments(segments, includeTimestamps = false) {
  if (!segments || segments.length === 0) return '';
  
  if (!includeTimestamps) {
    return segments.map(s => s.text).join(' ');
  }
  
  // Format with helper timestamps, e.g. [01:23] Text
  return segments.map(s => {
    const totalSeconds = Math.floor(s.start);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timestamp = `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}]`;
    return `${timestamp} ${s.text}`;
  }).join('\n');
}
