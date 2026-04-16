// ─── Aced — processor.js ─────────────────────────────────────────────────────
// Handles file reading + Gemini API call + localStorage output
// ─────────────────────────────────────────────────────────────────────────────

const PROMPT_INSTRUCTIONS = `You are an expert study guide creator. A student will give you their study guide content and you will convert it into a structured, detailed study plan that gives them everything they need to actually learn the material — not just a list of topics to look up.

Return ONLY valid JSON — no markdown, no backticks, no explanation. Just the raw JSON object.

Use this exact format:
{
  "title": "Short descriptive title of the study guide topic",
  "totalTime": "total estimated minutes as a number string e.g. 60",
  "sections": [
    {
      "id": "section_1",
      "title": "Section name",
      "timeEstimate": "estimated minutes as a number string e.g. 20",
      "emoji": "one relevant emoji",
      "items": [
        "Item with full answer/content baked in",
        "Another item with its answer",
        "Another item with its answer"
      ]
    }
  ]
}

CRITICAL RULE — THE MOST IMPORTANT THING:
Every item must include the actual answer, fact, or content — not just a prompt to go look it up.
BAD:  "List the features of Porifera"
GOOD: "Porifera: no true tissues/organs, filter feeders with pores (ostia). Example: sponges"

BAD:  "Know the quadratic formula"
GOOD: "Quadratic formula: x = (-b ± √(b²-4ac)) / 2a — use when ax²+bx+c=0"

BAD:  "Understand the causes of WW1"
GOOD: "WW1 causes (MAIN): Militarism, Alliance systems (Triple Entente vs Triple Alliance), Imperialism, Nationalism — sparked by assassination of Archduke Franz Ferdinand, 1914"

BAD:  "Review vocabulary terms"
GOOD: "Mitosis: cell division producing 2 identical daughter cells (for growth/repair). Phases: Prophase → Metaphase → Anaphase → Telophase"

Subject-specific guidance:
- Biology/Science: Include classification details, key features, examples, and processes with their steps
- History: Include dates, names, causes, effects, and significance
- Math/Physics: Include formulas, units, and a brief example of when/how to use them
- Chemistry: Include equations, element symbols, and reaction types
- English/Literature: Include character names, themes, quotes, and plot points
- Vocabulary heavy subjects: Always format as "Term: definition + context/example"
- Geography: Include locations, key facts, and relationships between places

Additional rules:
- Break content into 3-6 logical sections that follow the structure of the original guide
- Each section should have 4-10 items
- Time estimates should be realistic (2-4 min per item since items are detailed)
- Emojis should match the subject matter
- Only use content from the study guide — never hallucinate or add outside information
- If the guide has a lot of content, prioritize the most testable facts
- Write items as active study tasks, not passive facts. Frame them so the student knows exactly what to DO. Examples:
  - "Memorize: Porifera (sponges) = no true tissues, filter feeders. Test yourself by covering and recalling."
  - "Understand & explain: Ser vs Estar — ser for permanent traits, estar for temporary states. Can you make up 2 examples of each?"
  - "Work through: Quadratic formula x = (-b ± √(b²-4ac)) / 2a — solve one practice problem from scratch."
- Keep items concise but actionable — the student should know exactly what to do when they see it.
- GOOD: "Porifera (sponges): no true tissues, filter feeders. Example: sea sponge"
- BAD: "Phylum Porifera (Sponges): No true tissues/organs, sessile filter feeders with pores (ostia) and choanocytes (collar cells). Example: Sea sponge."`;


// ─── Main entry point called by index.html ───────────────────────────────────
async function processFile(file, onProgress) {
  try {
    onProgress(10, 'Reading your file...');
    const text = await readFile(file);

    if (!text || text.trim().length < 20) {
      throw new Error('The file appears to be empty or too short to process.');
    }

    onProgress(30, 'Sending to AI...');
    const planJSON = await callGemini(text, onProgress);

    onProgress(85, 'Building your study plan...');
    const plan = parsePlan(planJSON);

    localStorage.setItem('acedStudyPlan', JSON.stringify(plan));

    onProgress(100, 'Done! Opening your plan...');

    await sleep(600);
    window.location.href = 'generate.html';

  } catch (err) {
    throw err;
  }
}


// ─── File Reading ─────────────────────────────────────────────────────────────
async function readFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'txt') return await readAsText(file);
  if (ext === 'pdf') return await readPDF(file);
  if (ext === 'docx' || ext === 'doc') return await readWord(file);

  throw new Error(`Unsupported file type: .${ext}`);
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

async function readPDF(file) {
  if (!window.pdfjsLib) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  if (!fullText.trim()) {
    throw new Error('Could not extract text from this PDF. Try copying the text into a .txt file instead.');
  }

  return fullText;
}

async function readWord(file) {
  if (!window.mammoth) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
  }

  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });

  if (!result.value.trim()) {
    throw new Error('Could not extract text from this Word document. Try saving as .txt first.');
  }

  return result.value;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(script);
  });
}


// ─── Gemini API Call (via secure Netlify Function) ────────────────────────────
async function callGemini(studyGuideText, onProgress, retryCount = 0) {
  const MAX_RETRIES = 3;
  const trimmed = studyGuideText.slice(0, 12000);

  onProgress(50, 'AI is reading your guide...');

  const response = await fetch('/.netlify/functions/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studyGuideText: trimmed,
      promptInstructions: PROMPT_INSTRUCTIONS
    })
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 429 && retryCount < MAX_RETRIES) {
      const waitSeconds = 10; // always wait 10s between retries
      for (let i = waitSeconds; i > 0; i--) {
        onProgress(50, `Aced is popular right now! Retrying in ${i}s...`);
        await sleep(1000);
      }
      return callGemini(studyGuideText, onProgress, retryCount + 1);
    }
    if (response.status === 429) throw new Error('Aced is really busy right now. Please try again in a few minutes!');
    if (response.status === 401) throw new Error('API key error. Contact support.');
    throw new Error(data.error || `Error (${response.status})`);
  }

  onProgress(70, 'Processing response...');

  if (!data.rawText) throw new Error('No response from AI. Try again.');

  return data.rawText;
}


// ─── JSON Parsing ─────────────────────────────────────────────────────────────
function parsePlan(rawText) {
  if (!rawText) {
    throw new Error('No response from AI. Try again.');
  }

  let text = rawText.trim();

  // ─── 1. Remove markdown wrappers ───────────────────────────────────────────
  text = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  // ─── 2. Extract JSON object safely ─────────────────────────────────────────
  const match = text.match(/\{[\s\S]*\}/);

  if (!match) {
    console.error("❌ No JSON found:", text);
    throw new Error('AI returned invalid JSON. Please try again.');
  }

  let jsonString = match[0];

  // ─── 3. Fix common AI mistakes ─────────────────────────────────────────────
  jsonString = jsonString
    .replace(/,\s*}/g, '}')   // trailing commas in objects
    .replace(/,\s*]/g, ']')   // trailing commas in arrays
    .replace(/\n/g, ' ')      // weird line breaks
    .trim();

  let plan;

  try {
    plan = JSON.parse(jsonString);
  } catch (e) {
    console.error("❌ Final JSON parse failed:", jsonString);
    throw new Error('AI returned invalid JSON. Please try again.');
  }

  // ─── 4. Validate structure ─────────────────────────────────────────────────
  if (!plan.title || !Array.isArray(plan.sections) || plan.sections.length === 0) {
    throw new Error('AI returned an unexpected format. Please try again.');
  }

  // ─── 5. Normalize sections ─────────────────────────────────────────────────
  plan.sections = plan.sections.map((s, i) => ({
    id: s.id || `section_${i + 1}`,
    title: s.title || `Section ${i + 1}`,
    timeEstimate: s.timeEstimate || '15',
    emoji: s.emoji || '📚',
    items: Array.isArray(s.items)
      ? s.items.map(item =>
          String(item)
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
        )
      : []
  }));

  // ─── 6. Fix total time if missing ──────────────────────────────────────────
  if (!plan.totalTime) {
    const total = plan.sections.reduce(
      (sum, s) => sum + parseInt(s.timeEstimate || 0),
      0
    );
    plan.totalTime = String(total);
  }

  return plan;
}


// ─── Helper ───────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
