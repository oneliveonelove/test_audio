
const SYSTEM_PROMPT = `
You are an expert IELTS exam creator. Your task is to generate a high-quality IELTS Listening exam section based on the provided text.

Requirements:
- Exam type: IELTS Listening
- Total parts: 4
- Difficulty progression: Part 1 (easy) -> Part 4 (hard)

Structure:
- Part 1: Social context conversation (Form completion, names, numbers)
- Part 2: Monologue in social context (Map labeling, Multiple choice)
- Part 3: Education/Training conversation (Multiple choice, Matching)
- Part 4: Academic lecture (Sentence completion, Summary)

Rules:
- Do NOT copy exact words from the source text where synonyms work better.
- Answers must be logically inferable from the text provided.
- Use British English spelling.

Output Format:
Please format the output clearly with:
1. [PART X] Heading
2. Question numbers (1-10, etc.)
3. The Question Text
4. ANSWER KEY section at the very bottom.
`;

// API Key từ Google AI Studio
const API_KEY = 'AIzaSyDwLCHsw4DRmR_ev41gu7XDmzNmpCSkcmE';

const SAMPLE_TEXTS = [
    `[PART 1 CONVERSATION]
Receptionist: Good morning, City Library. How can I help you?
Caller: Hello. I'd like to ask about joining the library.
Receptionist: Certainly. Are you a local resident?
Caller: Yes, I've just moved to the area. My name is Sarah Jenkins. That's J-E-N-K-I-N-S.
Receptionist: Okay, Ms. Jenkins. To register, I'll need your address.
Caller: It's 42 West Street, apartment number 3. The postcode is W12 9LP.
Receptionist: Thank you. Do you have a contact number?
Caller: Yes, it's 07700 900461.
Receptionist: Great. Now, for the membership, you can borrow up to 8 books at a time for 3 weeks.
Caller: Oh, I thought it was 2 weeks.
Receptionist: It used to be, but we extended it last month. There is also a small fee for reservation services, roughly 50 pence per item.
Caller: That's fine. What about internet access?
Receptionist: All members get 1 hour free per day on our computers. You just need to book in advance.
Caller: Perfect. When are you open?
Receptionist: We open at 9 AM every day except Sundays, when we're closed. On Mondays and Wednesdays, we stay open late until 8 PM. Other days we close at 5 PM.
Caller: Wonderful. I'll come by tomorrow. Thank you!
Receptionist: You're welcome. Goodbye!`,

    `[PART 4 LECTURE]
Lecturer: Good afternoon, everyone. Today we are going to look at the history of the bicycle and how its design has evolved over the last two centuries. The first forerunner of the bicycle was developed in 1817 by a German baron named Karl von Drais. It didn't have pedals; the rider simply pushed against the ground with their feet. This machine was known as the 'Draisine' or 'running machine' and was constructed almost entirely of wood.

It wasn't until the 1860s that pedals were added to the front wheel by French mechanics. This new design was often called the 'boneshaker' because of its stiff iron frame and wooden wheels wrapped in iron tires, which made for a very uncomfortable ride on the cobblestone streets of the day.

The next major development came in the 1870s with the 'Penny Farthing' or 'High Wheeler'. To increase speed, the front wheel was made much larger than the rear one. While faster, it was dangerous; the rider sat very high up and could easily be thrown over the handlebars if the front wheel hit a rut.

Finally, in 1885, the 'Safety Bicycle' was introduced. This is the direct ancestor of the modern bicycle. It featured two wheels of equal size and a chain drive to the rear wheel. The addition of the pneumatic rubber tire by John Boyd Dunlop in 1888 revolutionized cycling comfort and efficiency, leading to the bicycle boom of the 1890s.`
];

document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const transcriptInput = document.getElementById('transcriptInput');
    const generateBtn = document.getElementById('generateBtn');
    const resultSection = document.getElementById('resultSection');
    const outputContent = document.getElementById('outputContent');
    const copyBtn = document.getElementById('copyBtn');
    const sampleBtn = document.getElementById('sampleBtn');

    let currentSampleIndex = 0;

    // Auto-load API key
    apiKeyInput.value = API_KEY;

    // Check localStorage for saved key (override if exists)
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
        apiKeyInput.value = storedKey;
    }

    // Save API key on change
    apiKeyInput.addEventListener('change', () => {
        localStorage.setItem('gemini_api_key', apiKeyInput.value);
    });

    // Sample Text Logic
    sampleBtn.addEventListener('click', () => {
        transcriptInput.value = SAMPLE_TEXTS[currentSampleIndex];
        currentSampleIndex = (currentSampleIndex + 1) % SAMPLE_TEXTS.length;
    });

    // Generate Logic
    generateBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        const transcript = transcriptInput.value.trim();

        if (!apiKey) {
            alert('Please enter your Gemini API Key directly into the input field.');
            return;
        }

        if (!transcript) {
            alert('Please enter a transcript or topic text.');
            return;
        }

        // Show loading state
        generateBtn.classList.add('loading');
        generateBtn.disabled = true;
        resultSection.classList.add('hidden');
        outputContent.textContent = '';

        try {
            const result = await callGeminiAPI(apiKey, transcript);

            if (result.error) {
                console.error("API Error Details:", result.error);
                outputContent.textContent = `Error: ${result.error.message || JSON.stringify(result.error)}`;
            } else {
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated. Please check your text input.";
                outputContent.textContent = text;
            }

            resultSection.classList.remove('hidden');
        } catch (error) {
            console.error("Network Error:", error);
            outputContent.textContent = `Network/System Error: ${error.message}. Please check console (F12) for details.`;
            resultSection.classList.remove('hidden');
        } finally {
            generateBtn.classList.remove('loading');
            generateBtn.disabled = false;
        }
    });

    // Copy to clipboard
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(outputContent.textContent).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        });
    });
});

async function callGeminiAPI(apiKey, userText) {
    // Model chính xác: gemini-2.5-flash (stable, mới nhất 2026) với v1beta
    const modelName = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const combinedPrompt = `${SYSTEM_PROMPT}\n\nHere is the source text to generate questions from:\n\n${userText}`;

    const payload = {
        contents: [{
            role: "user",
            parts: [{ text: combinedPrompt }]
        }],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || response.statusText);
    }

    return await response.json();
}
