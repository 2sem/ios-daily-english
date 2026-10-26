---
name: linkedin-newsletter
description: Draft a day's LinkedIn newsletter edition (iOS Daily English) in Chrome - cover video + thumbnail, title, English body - and stop at the draft for the owner to review. Use when asked to "write the linkedin newsletter", "linkedin edition for Day N", or /linkedin-newsletter [day].
---

# linkedin-newsletter

Manager workflow with the Chrome tools (`mcp__claude-in-chrome__*`, load them with ToolSearch first). **Always stop at a saved
draft.** Never click "다음"/publish; the owner reviews, swaps in the full video and publishes.

Newsletter: https://www.linkedin.com/newsletters/ios-daily-english-7382287984366313472/

## Steps

1. **Day.** The number the user gives; with none, the lowest day whose landscape video is rendered and has no edition yet.
2. **Prepare.** `node scripts/linkedin-edition.mjs content/days/day-NNN.json` prints `{title, blocks, files}` and
   - copies the full video (`dayNNN-landscape.mp4`) and thumbnail (`dayNNN-thumb-landscape.png`) to `~/Downloads/`,
   - makes `video/out/dayNNN-linkedin-small.mp4` (720p, under 9.5 MB) as the cover to upload from the browser.
   The video must be the approved 5:00 render. The body is **English only** (no Korean), no quiz answers.
3. **Editor.** `tabs_context_mcp` (createIfEmpty), `tabs_create_mcp`, open the newsletter URL, click **새 에디션 만들기**
   (opens `/article/new/`).
4. **Cover video.** The page has no file input until the button is clicked and a native picker would open. Patch it first
   with `javascript_tool`:
   ```js
   const orig = HTMLInputElement.prototype.click;
   HTMLInputElement.prototype.click = function(){ if (this.type==='file'){ this.id='cap-file'; this.style.cssText='position:fixed;top:0;left:0;width:10px;height:10px;opacity:0.01;z-index:99999'; document.body.appendChild(this); return; } return orig.apply(this, arguments); };
   [...document.querySelectorAll('button')].find(x=>x.textContent.includes('컴퓨터에서 업로드')).click();
   ```
   Then `find` `input#cap-file` and `file_upload` the **small cover** (the tool allows under 10 MB per call).
5. **Thumbnail.** In the cover dialog click the image icon under the video; a second input
   `#media-editor-video-thumbnail-selector__file-input` appears. `find` it, `file_upload` the thumbnail PNG, click **추가**,
   then **다음**. Upload continues in the background.
6. **Title.** Click the title field, type `title`.
7. **Body.** Click the body (ProseMirror, `.ProseMirror`; coordinates shift once the cover loads, so screenshot first). To replace
   text: `javascript_tool` `e.focus(); document.execCommand('selectAll')` then `computer type`.
   - Paragraphs: plain text. **Never start a line with `1. `** (auto numbered list swallows the lines after it). Use `Term 1: X`.
   - Bullets: type `- ` at line start; the definition and the example are two bullets. `\n\n` after the last bullet exits the list.
   - Do not add blank paragraphs for spacing (margins already exist; blank ones double the gap). Delete empty `P` nodes:
     select a collapsed range inside each and `document.execCommand('delete')`.
   - Term lines: click the line, open **스타일** (538, 88), choose **제목** (heading). Intro and closing stay plain.
   - Verify with `javascript_tool` (`[...e.children].map(c=>c.tagName+':'+c.innerText.slice(0,20))`: P, H2, UL, H2, UL, H2, UL, P) and a screenshot.
8. **Hand-off.** Leave the tab open. Tell the owner: draft saved, not published; the cover is the small 720p copy, so remove it
   with the trash icon and attach `~/Downloads/dayNNN-landscape.mp4` + `dayNNN-thumb-landscape.png`; files are in Downloads.
   Close no tab the owner needs. If the owner is not logged in or LinkedIn asks for a captcha/2FA, stop and report.

## Rules
- Draft only, never publish. No Korean in the post. No link to a video that is not public (the new landscape upload comes after approval).
- Quiz answers never appear. Do not paste personal data; use only the day JSON.
- Same format every day, so editions look alike: intro paragraph, three `Term N: X` headings with two bullets each, closing line.
