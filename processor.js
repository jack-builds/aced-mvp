// ─── Aced — processor.js ─────────────────────────────────────────────────────
// FINAL: stable, chunked, production-ready (reinforced)
// ─────────────────────────────────────────────────────────────────────────────


// ─── PROMPTS ─────────────────────────────────────────────────────────────────

// Small file (full generation)
const FULL_PROMPT = `You are an expert study guide creator.

Return ONLY valid JSON:

{
  "title": "Short title",
  "totalTime": "number",
  "sections": [
    {
      "title": "Section name",
      "timeEstimate": "number",
      "emoji": "emoji",
      "items": ["study item"]
    }
  ]
}

Rules:
- Each item MUST include the actual answer/content
- Keep items short and actionable
- No markdown
- No explanation
- Ensure valid JSON
`;


// 🔥 CHUNK PROMPT
const CHUNK_PROMPT = `
You are creating PART of a study guide.

Return ONLY valid JSON.

Format:
{
  "sections": [
    {
      "title": "string",
      "timeEstimate": "number as string",
      "emoji": "emoji",
      "items": ["string"]
    }
  ]
}

Rules:
- 1–3 sections ONLY
- 4–8 items per section
- Each item must include the actual answer/content
- Keep items concise
- ONLY use the provided text
- DO NOT include title or totalTime
- DO NOT repeat content unnecessarily
- DO NOT cut off JSON
`;

const STRUCTURE_PROMPT = `
You are analyzing a study document.

Return ONLY valid JSON:

{
  "sections": ["Section name 1", "Section name 2", "Section name 3"]
}

Rules:
- 3–6 sections max
- Use concise names
- Based ONLY on the text
- No explanation
`;


// ─── MAIN ENTRY ──────────────────────────────────────────────────────────────

async function processFile(file, onProgress) {
  try {
    onProgress(10, 'Reading your file...');

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File too large (max 10MB)');
    }

    const text = await readFile(file);

    if (!text || text.trim().length < 50) {
      throw new Error('File is too empty to process');
    }

    let plan;

    if (text.length < 8000) {
      onProgress(30, 'Generating study plan...');
      const raw = await callGemini(text, FULL_PROMPT);
      plan = parseFullPlan(raw);
    } else {
      onProgress(30, 'Processing large file...');
      plan = await generateChunkedPlan(text, onProgress);
    }

    localStorage.setItem('acedStudyPlan', JSON.stringify(plan));

    onProgress(100, 'Done! Opening your plan...');
    await sleep(500);
    window.location.href = 'generate.html';

  } catch (err) {
    throw err;
  }
}


// ─── CHUNKING ────────────────────────────────────────────────────────────────

function splitIntoSmartChunks(text, maxSize = 3500) {
  let parts = text.split(/\n\s*\n/);

  // fallback for messy PDFs
  if (parts.length < 5) {
    parts = text.split(/\. |\n/);
  }

  const chunks = [];
  let current = '';

  for (let part of parts) {
    if ((current + part).length > maxSize) {
      if (current) chunks.push(current);
      current = part;
    } else {
      current += ' ' + part;
    }
  }

  if (current) chunks.push(current);

  return chunks.slice(0, 6);
}


async function generateChunkedPlan(text, onProgress) {
  const structure = await getStructure(text);
  const chunks = splitIntoSmartChunks(text);

  let allSections = [];

  for (let i = 0; i < chunks.length; i++) {
    onProgress(
      40 + (i / chunks.length) * 40,
      `Processing ${i + 1}/${chunks.length}...`
    );

    try {
      let chunkText = chunks[i];

      // 🔥 HARD LIMIT (CRITICAL FIX)
      chunkText = chunkText.slice(0, 4000);

      // 🧠 structure hint
      if (structure) {
        chunkText =
          `Document sections: ${structure.join(', ')}\n\n` +
          `Current content:\n${chunkText}`;
      }

      const raw = await callGemini(chunkText, CHUNK_PROMPT);
      const parsed = safeParse(raw);

      // 🔥 VALIDATION FIX
      if (
        parsed.sections &&
        Array.isArray(parsed.sections) &&
        parsed.sections.length > 0
      ) {
        allSections.push(...parsed.sections);
      } else {
        console.warn(`Chunk ${i + 1} returned bad structure`);
      }

    } catch (err) {
      console.warn(`Chunk ${i + 1} failed`, err);
    }
  }

  if (allSections.length === 0) {
    throw new Error('Failed to generate study plan from this file.');
  }

  return {
    title: "Complete Study Plan",
    totalTime: String(
      allSections.reduce((sum, s) => sum + (parseInt(s.timeEstimate) || 0), 0)
    ),
    sections: mergeSections(allSections)
  };
}


// ─── GEMINI CALL ─────────────────────────────────────────────────────────────

async function callGemini(text, prompt, retry = 0) {
  const MAX_RETRIES = 2;

  const res = await fetch('/.netlify/functions/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studyGuideText: text,
      promptInstructions: prompt
    })
  });

  const data = await res.json();

  if (!res.ok) {
    if (retry < MAX_RETRIES) {
      await sleep(1500);

      return callGemini(
        text.slice(0, Math.floor(text.length * 0.7)),
        prompt,
        retry + 1
      );
    }

    throw new Error(data.error || 'AI request failed');
  }

  if (!data.rawText) {
    throw new Error('Empty AI response');
  }

  return data.rawText;
}


// ─── STRUCTURE DETECTION ─────────────────────────────────────────────────────

async function getStructure(text) {
  try {
    const sample = text.slice(0, 5000);
    const raw = await callGemini(sample, STRUCTURE_PROMPT);
    const parsed = safeParse(raw);

    // 🔥 SANITY CHECK FIX
    if (
      parsed.sections &&
      Array.isArray(parsed.sections) &&
      parsed.sections.length >= 2 &&
      parsed.sections.length <= 6
    ) {
      return parsed.sections;
    }

  } catch (err) {
    console.warn('Structure detection failed, falling back');
  }

  return null;
}


// ─── SAFE JSON PARSER ────────────────────────────────────────────────────────

function safeParse(raw) {
  let text = raw.trim();

  text = text
    .replace(/^```json/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim();

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Invalid JSON');
  }
}


// ─── FULL PLAN PARSER ────────────────────────────────────────────────────────

function parseFullPlan(raw) {
  const parsed = safeParse(raw);

  if (!parsed.sections || !Array.isArray(parsed.sections)) {
    throw new Error('Invalid plan format');
  }

  return {
    title: parsed.title || "Study Plan",
    totalTime: parsed.totalTime || "60",
    sections: parsed.sections.map((s, i) => ({
      id: `section_${i + 1}`,
      title: s.title || `Section ${i + 1}`,
      timeEstimate: s.timeEstimate || '15',
      emoji: s.emoji || '📚',
      items: Array.isArray(s.items) ? s.items : []
    }))
  };
}


// ─── FILE READING ────────────────────────────────────────────────────────────

async function readFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'txt') return readAsText(file);
  if (ext === 'pdf') return readPDF(file);
  if (ext === 'docx' || ext === 'doc') return readWord(file);

  throw new Error(`Unsupported file type: .${ext}`);
}


function readAsText(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => res(e.target.result);
    reader.onerror = () => rej(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}


async function readPDF(file) {
  if (!window.pdfjsLib) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const pdf = await window.pdfjsLib.getDocument({
    data: await file.arrayBuffer()
  }).promise;

  let text = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(i => i.str).join(' ') + '\n\n';
  }

  // 🔥 NO HARD FAIL (future OCR hook point)
  if (text.trim().length < 100) {
    console.warn('PDF likely scanned — OCR fallback needed');
  }

  return text;
}


async function readWord(file) {
  if (!window.mammoth) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
  }

  const result = await window.mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer()
  });

  return result.value;
}


function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}


// ─── UTIL ────────────────────────────────────────────────────────────────────

function mergeSections(sections) {
  const map = {};

  for (const section of sections) {
    const key = normalizeTitle(section.title);

    if (!map[key]) {
      map[key] = {
        title: section.title,
        timeEstimate: 0,
        items: []
      };
    }

    map[key].timeEstimate += parseInt(section.timeEstimate) || 0;

    if (Array.isArray(section.items)) {
      map[key].items.push(...section.items);
    }
  }

  return Object.values(map).map((s, i) => ({
    id: `section_${i + 1}`,
    title: s.title,
    timeEstimate: String(s.timeEstimate || 15),
    emoji: '📚',
    items: [...new Set(s.items)]
  }));
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
