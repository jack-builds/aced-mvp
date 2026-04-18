// ─── Aced — processor.js ─────────────────────────────────────────────────────
// FINAL: stable, chunked, production-ready
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


// 🔥 NEW IMPROVED CHUNK PROMPT
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

    // ✅ SMALL FILE → FULL PROMPT
    if (text.length < 8000) {
      onProgress(30, 'Generating study plan...');
      const raw = await callGemini(text, FULL_PROMPT);
      plan = parseFullPlan(raw);
    }

    // ✅ BIG FILE → CHUNKING
    else {
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

function splitIntoChunks(text, size = 4000) {
  const chunks = [];
  let i = 0;

  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size;
  }

  return chunks.slice(0, 5); // hard cap (safety)
}


async function generateChunkedPlan(text, onProgress) {
  const chunks = splitIntoChunks(text);

  let allSections = [];

  for (let i = 0; i < chunks.length; i++) {
    onProgress(40 + (i / chunks.length) * 40, `Processing ${i + 1}/${chunks.length}...`);

    try {
      const raw = await callGemini(chunks[i], CHUNK_PROMPT);
      const parsed = safeParse(raw);

      if (parsed.sections) {
        allSections.push(...parsed.sections);
      }

    } catch (err) {
      console.warn('Chunk failed, skipping...');
    }
  }

  if (allSections.length === 0) {
    throw new Error('Failed to generate study plan from this file.');
  }

  // normalize
  const cleaned = allSections.map((s, i) => ({
    id: `section_${i + 1}`,
    title: s.title || `Section ${i + 1}`,
    timeEstimate: s.timeEstimate || '15',
    emoji: s.emoji || '📚',
    items: Array.isArray(s.items) ? s.items : []
  }));

  return {
    title: "Complete Study Plan",
    totalTime: String(
      cleaned.reduce((sum, s) => sum + (parseInt(s.timeEstimate) || 0), 0)
    ),
    sections: cleaned
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

      // 🔥 shrink input on retry
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

  if (text.trim().length < 100) {
    throw new Error('This PDF may be scanned or unreadable.');
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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
