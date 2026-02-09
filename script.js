const SYSTEM_PROMPT = `
Requirements:
Exam type: IELTS Listening
Total parts: 4
Difficulty progression: Part 1 (easy) -> Part 4 (hard)

For each part:
- Match the official IELTS listening style
- Use appropriate question types
- Ensure questions are natural, exam-like, and not AI-obvious
- Include realistic distractors and paraphrasing

Question type distribution:
- Part 1: Form completion, short answer, numbers, names
- Part 2: Multiple choice, map labeling, matching
- Part 3: Multiple choice, matching opinions, academic discussion
- Part 4: Sentence completion, summary completion (academic lecture)

Rules:
- Do NOT copy exact words from the audio; paraphrase whenever possible
- Answers must be clearly inferable from the audio
- Avoid ambiguous or multiple-correct answers
- Use British English spelling
- Do not explain the answers unless explicitly requested

Output format:
- Clearly separate Part 1, Part 2, Part 3, Part 4
- Number all questions (1-10, 11-20, 21-30, 31-40)
- Provide an answer key at the end
- Tag and categorize all generated questions with metadata:
  - Exam type (IELTS, TOEFL, etc.)
  - Part number
  - Question type
  - Difficulty level
  - Topic (education, travel, science, daily conversation, etc.)
`;

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

    // Load API Key from localStorage
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
        currentSampleIndex = (currentSampleIndex + 1) % SAMPLE_TEXTS.length; // Toggle between samples
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
                outputContent.textContent = `Error: ${result.error.message || JSON.stringify(result.error)}`;
            } else {
                // Determine text content from response structure
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
                outputContent.textContent = text;
            }

            resultSection.classList.remove('hidden');
        } catch (error) {
            outputContent.textContent = `Network/System Error: ${error.message}`;
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // Construct payload
    // We send the system prompt as the first "user" message for broader compatibility, or use system_instruction if using v1beta.
    // Let's use system_instruction for cleaner separation as we use v1beta.

    const payload = {
        contents: [{
            role: "user",
            parts: [{ text: `Here is the transcript/text source for the exam generation:\n\n${userText}` }]
        }],
        system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }]
        },
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
