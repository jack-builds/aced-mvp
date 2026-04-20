// ─── Aced — processor.js ─────────────────────────────────────────────────────
// FINAL: stable, chunked, production-ready (reinforced)
// ─────────────────────────────────────────────────────────────────────────────


// ─── PROMPTS ─────────────────────────────────────────────────────────────────

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
      "items": [
        {
          "prompt": "specific study question or task",
          "answer": "clear, concise answer",
          "hint": "short memory trick (optional)"
        }
      ]
    }
  ]
}

CRITICAL:
- Output must be valid JSON
- No trailing commas
- No missing commas
- No extra text outside JSON

QUALITY RULES:
- Each item MUST include a correct answer
- Study prompts must be specific and actionable (not generic like "describe" or "explain")
- Answers must be clear, simple, and easy to memorize
- Keep answers short (1–3 sentences or concise bullet-style)
- Include helpful hints or memory tricks when possible
- Prefer tasks like:
  - "List..."
  - "Compare..."
  - "Draw/trace..."
  - "Explain with an example..."
- Avoid vague tasks like "understand" or "learn"

TIME RULES:
- - timeEstimate should be roughly 2 minutes per item included.
`;


const CHUNK_PROMPT = `
You are a Study Guide Extraction Engine. 

Return ONLY valid JSON.

{
  "sections": [
    {
      "title": "string",
      "timeEstimate": "number",
      "emoji": "emoji",
      "items": [
        {
          "prompt": "question",
          "answer": "concise, accurate answer",
          "hint": "memory trick"
        }
      ]
    }
  ]
}

EXTRACTION RULES:
1. MANDATORY: Every "prompt" MUST have a corresponding "answer". Never leave "answer" empty.
2. EXHAUSTIVE: Extract every concept, formula, and fact. If the text has 20 facts, create 20 items.
3. NO SUMMARIZATION: Do not group 5 topics into 1 item. Break them down.
4. TECHNICAL DEPTH: For Math/Science, the "answer" must include the specific formula or steps.
5. FORMAT: Use clean text. No special characters that break JSON.

CRITICAL:
- Output must be valid JSON
- No trailing commas
- No missing commas
- No extra text outside JSON

QUALITY RULES:
- CRITICAL: Do not summarize. Extract every possible study question from the text.
- If the text contains 10 facts, create 10 items.
- Ensure the "answer" field is highly accurate.
- If the document is technical (Math/Science), include step-by-step logic in the "answer".
- There is no limit on the number of sections or items per chunk.
`;

const STRUCTURE_PROMPT = `
You are analyzing a study document.

Return ONLY valid JSON:

{
  "sections": ["Section name 1", "Section name 2", "Section name 3"]
}

CRITICAL:
- Output must be valid JSON
- No trailing commas
- No missing commas
- No extra text outside JSON

RULES:
- Section names should be concise and meaningful
- Avoid generic names like "Introduction" unless clearly present
- Return between 2–6 sections
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
      onProgress(20, 'Analyzing your math problems...');
      await sleep(800); 
      onProgress(50, 'Formulating step-by-step answers...');
      const raw = await callGemini(text, FULL_PROMPT);
      onProgress(90, 'Finalizing guide...');
      plan = await parseFullPlan(raw);
    } else {
      // Keep your existing large file logic here:
      onProgress(30, 'Processing large file...');
      plan = await generateChunkedPlan(text, onProgress);
    }

    const serialized = JSON.stringify(plan);

    if (serialized.length > 4_500_000) {
      console.warn('Plan too large for localStorage');
    } else {
      localStorage.setItem('acedStudyPlan', serialized);
    }

    onProgress(100, 'Done! Opening your plan...');
    await sleep(500);
    window.location.href = 'generate.html';

  } catch (err) {
    throw err;
  }
}


// ─── CHUNKING ────────────────────────────────────────────────────────────────

function splitIntoSmartChunks(text, maxSize = 2000) {
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

  return chunks;
}


async function generateChunkedPlan(text, onProgress) {
  const structure = await getStructure(text);
  const chunks = splitIntoSmartChunks(text);
  const totalChunks = chunks.length;

  let allSections = [];

  for (let i = 0; i < totalChunks; i++) {
    // 💡 Dynamic Message Update
    const progress = 40 + (i / totalChunks) * 50; // Scales from 40% to 90%
    onProgress(progress, getFriendlyMessage(i, totalChunks));

    try {
      let chunkText = chunks[i];
      
      if (structure) {
        chunkText = `Document sections: ${structure.join(', ')}\n\n` +
                    `Current content:\n${chunkText}`;
      }

      const raw = await callGemini(chunkText, CHUNK_PROMPT);
      let parsed;

      try {
        parsed = safeParse(raw);
      } catch (err) {
        // ... (Keep your existing retry/repair logic here)
      }

      if (validatePlan(parsed)) {
        allSections.push(...parsed.sections);
      }
    } catch (err) {
      console.warn(`Chunk ${i + 1} failed`, err);
    }
  }

  // 💡 Final stretch message
  onProgress(95, "Merging sections and removing duplicates...");
  
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

  // 🔥 Fix trailing commas
  text = text.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

  // 🔥 Fix missing commas between strings in arrays
  text = text.replace(/"\s*"\s*/g, '","');

  text = text.replace(/""/g, '","');

  const match = text.match(/\{[\s\S]*\}/);
  if (match) text = match[0];
  
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      let cleaned = match[0]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/"\s*"\s*/g, '","')
        .replace(/""/g, '","');

      return JSON.parse(cleaned);
    }

    throw new Error('Invalid JSON');
  }
}


async function repairJSON(brokenText) {
  try {
    const repairPrompt = `
Fix this JSON. Return ONLY valid JSON.

${brokenText}
`;
    const fixed = await callGemini(brokenText, repairPrompt);
    return safeParse(fixed);
  } catch {
    console.warn('Repair failed');
    return { sections: [] }; // safe fallback
  }
}


// ─── FULL PLAN PARSER ────────────────────────────────────────────────────────

async function parseFullPlan(raw) {
  let parsed;

  try {
    parsed = safeParse(raw);
  } catch {
    parsed = await repairJSON(raw);
  }

if (!validatePlan(parsed)) {
  throw new Error('Invalid plan structure');
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
      items: [],
      emoji: section.emoji || '📚' // ✅ preserve AI emoji
    };
  }

   const time = parseInt(section.timeEstimate);
   map[key].timeEstimate += isNaN(time) ? 15 : time;

    if (Array.isArray(section.items)) {
      map[key].items.push(...section.items);
    }
  }
return Object.values(map).map((s, i) => ({
  id: `section_${i + 1}`,
  title: s.title,
  timeEstimate: String(s.timeEstimate || 15),
  emoji: s.emoji || '📚', // ✅ use stored emoji
  items: dedupeItems(s.items || []) 
}));
}

function normalizeTitle(title) {
  if (!title || typeof title !== 'string') return '';
  return title.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function dedupeItems(items) {
  const seen = new Set();
  const result = [];

  for (let item of items) {
    // 1. Safety check: handle strings OR objects
    if (!item) continue;
    
    // 2. Identify the unique text to check for duplicates
    // If it's the new object, use item.prompt. If it's an old string, use the string.
    const textToCompare = typeof item === 'object' ? item.prompt : item;
    
    if (!textToCompare) continue;

    const key = normalizeTitle(textToCompare);

    if (!seen.has(key)) {
      seen.add(key);
      result.push(item); // Push the whole object (prompt, answer, hint)
    }
  }

  return result;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getFriendlyMessage(index, total) {
  const messages = [
    "Analyzing complex concepts...",
    "Breaking down the math logic...",
    "Extracting key formulas...",
    "Drafting study questions...",
    "Generating detailed answers...",
    "Adding memory tricks and hints...",
    "Organizing into sections...",
    "Finalizing the structure..."
  ];
  // Cycle through messages based on the current chunk index
  const msg = messages[index % messages.length];
  return `${msg} (${index + 1}/${total})`;
}


// ─── VALIDATION ─────────────────────────────────────────────────────────────

function validatePlan(plan) {
  if (!plan || typeof plan !== 'object') return false;
  if (!Array.isArray(plan.sections)) return false;

  return plan.sections.every(s =>
    typeof s.title === 'string' &&
    Array.isArray(s.items) &&
    s.items.every(i => 
      i && typeof i === 'object' && typeof i.prompt === 'string'
    )
  );
}

// forced site shutdown
