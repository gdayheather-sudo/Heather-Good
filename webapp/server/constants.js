// Supported platforms and their guidance. char_limit is the practical caption
// limit used to steer generation; image_size is the OpenAI image size that best
// matches the platform's preferred aspect ratio.
export const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', char_limit: 2200, image_size: '1024x1024', aspect: '1:1 / 4:5', notes: 'Hook in first line, emoji-friendly, up to 30 hashtags.' },
  { id: 'facebook',  name: 'Facebook',  char_limit: 2000, image_size: '1536x1024', aspect: '1.91:1',    notes: 'Conversational, a clear call to action, few hashtags.' },
  { id: 'x',         name: 'X / Twitter', char_limit: 280, image_size: '1536x1024', aspect: '16:9',     notes: 'Punchy, 1-2 hashtags, fits 280 characters.' },
  { id: 'linkedin',  name: 'LinkedIn',  char_limit: 3000, image_size: '1536x1024', aspect: '1.91:1',    notes: 'Professional, value-led, 3-5 hashtags.' },
  { id: 'pinterest', name: 'Pinterest', char_limit: 500,  image_size: '1024x1536', aspect: '2:3',       notes: 'Keyword-rich description, vertical image.' },
  { id: 'tiktok',    name: 'TikTok',    char_limit: 2200, image_size: '1024x1536', aspect: '9:16',      notes: 'Caption + on-screen hook idea, trending tone.' },
  { id: 'threads',   name: 'Threads',   char_limit: 500,  image_size: '1024x1024', aspect: '1:1',       notes: 'Casual, conversational, lightweight.' },
  { id: 'youtube',   name: 'YouTube',   char_limit: 5000, image_size: '1536x1024', aspect: '16:9',      notes: 'Title + description, SEO keywords, chapters optional.' },
  { id: 'etsy',      name: 'Etsy',      char_limit: 1000, image_size: '1024x1024', aspect: '1:1',       notes: 'Product-led, benefits + occasion, shoppable tone.' },
];

export const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]));

// The lifecycle of a post, in order. These are the columns of the pipeline board.
export const STATUSES = [
  { id: 'idea',       name: 'Idea',        hint: 'Captured, not started' },
  { id: 'draft',      name: 'Draft',       hint: 'Content generated / being written' },
  { id: 'in_review',  name: 'In review',   hint: 'Needs a check before approval' },
  { id: 'approved',   name: 'Approved',    hint: 'Signed off, ready to schedule' },
  { id: 'scheduled',  name: 'Scheduled',   hint: 'Has a date/time set' },
  { id: 'published',  name: 'Published',   hint: 'Live' },
];
export const STATUS_IDS = STATUSES.map((s) => s.id);
