# RSS Reader Enhancement Design

Date: 2026-05-21

## Overview

Four enhancements to the RSS Reader project, all to be implemented together:
1. News media content adaptation (highest priority)
2. Refresh functionality
3. Feed management
4. UI redesign (magazine/editorial style)

---

## 1. News Media Content Adaptation

### 1.1 Content Extraction Enhancement (server/rss/enricher.ts)
- Convert lazy-load images: replace `data-src`, `data-original`, `data-lazy-src` attributes with `src`
- Add video platform detection: YouTube, Bilibili, Twitter/X embeds detected by URL patterns
- Add site-specific handlers for common Chinese/international news sites (澎湃新闻, 新华网, BBC, etc.)
- Improve DOMPurify config to allow safe `<iframe>`, `<video>`, `<source>` tags

### 1.2 Image Proxy Integration
- Wire existing `/api/image` proxy into article content rendering
- Replace all `<img src="...">` URLs in enriched HTML with proxied URLs (`/api/image?url=...&referer=...`)
- Handles mixed-content and CORS-blocked images

### 1.3 Video Embed Support
- Detect video URLs in article content (YouTube, Bilibili, Vimeo)
- Convert video links to embedded `<iframe>` players
- Preserve original link as fallback

### 1.4 Full-Text RSS Support
- For feeds that only provide summaries (content < 200 chars), auto-trigger enricher
- Enricher fetches full article from original URL using Readability
- Already partially implemented; extend to cover more edge cases

---

## 2. Refresh Functionality

### 2.1 Refresh All Button
- Location: FilterBar toolbar, next to "全部标记已读"
- Triggers concurrent fetch of all feeds (max 5 concurrency, reuse scheduler logic)
- Shows progress indicator and result summary (success/fail/new articles count)
- Button disabled during refresh to prevent duplicate requests

### 2.2 Single Feed Refresh
- Add refresh icon button to each FeedItem in sidebar (visible on hover)
- Calls existing `POST /api/feeds/:id/fetch` endpoint
- Shows toast/notification with new article count

### 2.3 Refresh State Feedback
- Auto-refresh article list after refresh completes
- Error handling for network failures and parse errors

---

## 3. Feed Management

### 3.1 Feed Actions in Sidebar
- Each FeedItem shows "..." action button on hover
- Menu options: Edit, Refresh, Delete, Mark All Read
- Delete requires confirmation dialog

### 3.2 Enhanced FeedManageDialog
- Editable fields: name, URL, category, refresh interval
- Display feed info: status (healthy/degraded/error), last error, article count
- Category selector: dropdown of existing categories or create new
- Refresh interval: inherit global setting or custom (minutes)

### 3.3 Category Management
- Right-click on category name to edit/delete
- Drag-and-drop feeds between categories (using @dnd-kit)

### 3.4 OPML Import/Export
- Already has API; add UI entry point in Settings dialog
- Batch feed management support

---

## 4. UI Redesign — Magazine/Editorial Style

### 4.1 Color System
- **Light theme**: warm white bg (`#faf8f5`), dark brown text (`#2c2c2c`), accent warm orange (`#c45d3e`)
- **Dark theme**: dark gray bg (`#1a1a1a`), light gray text (`#d4d0cb`), accent amber (`#d4856b`)
- Borders: soft beige (`#e8e4df`) replacing cold gray

### 4.2 Typography
- **Headings**: serif fonts (Georgia / Noto Serif / 思源宋体)
- **Body**: sans-serif (system-ui / 苹方), line-height 1.7
- **Article page**: max-width 720px, centered, generous margins
- **Font sizes**: title 24px, subtitle 18px, body 16px, meta 14px

### 4.3 Sidebar
- Background: lighter warm tone (`#f5f2ed`)
- Feed cards: subtle hover background change
- Unread badge: rounded rectangle, warm orange
- Logo area: serif font for "RSS 阅读器"

### 4.4 Article List
- Card-style with bottom border separator
- Title: serif font, bold
- Summary: smaller font, increased line spacing
- Time: relative ("2小时前"), light gray

### 4.5 Article Detail Page
- Large serif title at top
- Author/source/time in single meta line
- Content: paragraph spacing or first-line indent
- Images: rounded corners, subtle shadow
- Toolbar: icon buttons, semi-transparent background

### 4.6 Animations
- Page transitions: fade in/out
- Button hover: color gradient, no displacement
- Loading: elegant rotating line spinner

---

## Architecture Notes

- All server changes in `server/` directory
- All UI changes in `src/` directory
- Shared types in `shared/types.ts`
- Existing dependencies: @dnd-kit, DOMPurify, @mozilla/readability, turndown, undici
- No new npm dependencies required (all features use existing packages)
