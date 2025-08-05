// This is your new, secure backend function.
// It will run on a server, not in the browser.

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Read the secret API key from environment variables.
    // This is the most important part!
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API key is not configured on the server.' });
    }

    const { image, mimeType } = req.body;

    if (!image || !mimeType) {
        return res.status(400).json({ error: 'Image data and mimeType are required.' });
    }

    const prompt = `
      You are Dr. Plant, an expert AI botanist. Analyze the following image of a plant.
      Your diagnosis should be clear, concise, and helpful for a home gardener.
      1.  **Status:** Start by stating if the plant appears healthy or diseased.
      2.  **Disease Identification:** If diseased, identify the most likely disease by its common name.
      3.  **Remedy/Treatment:** If diseased, provide a simple, step-by-step remedy.
      4.  **Formatting:** Structure your response in clean HTML.
          - Use a main heading: \`<h3>Diagnosis Status</h3>\` for the health status.
          - If diseased, add: \`<h4>Suspected Disease</h4>\` and \`<h4>Recommended Remedy</h4>\`.
          - Use paragraphs \`<p>\` for descriptions and lists \`<ul><li>...</li></ul>\` for remedy steps.
      If the image is unclear or not a plant, state that you cannot provide a diagnosis and ask for a clearer picture.
    `;

    const payload = {
        contents: [{
            role: "user",
            parts: [{ text: prompt }, { inlineData: { mimeType: mimeType, data: image } }]
        }],
    };

    try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.json();
            console.error("Google API Error:", errorBody);
            throw new Error(`Google API failed: ${errorBody.error?.message || 'Unknown error'}`);
        }

        const result = await geminiResponse.json();

        let analysisResult = "Could not analyze the image. Please try another one.";
        if (result.candidates && result.candidates.length > 0) {
            analysisResult = result.candidates[0].content.parts[0].text;
        }

        // Clean up potential markdown formatting from the API response
        if (analysisResult.startsWith("```html")) {
            analysisResult = analysisResult.substring(7, analysisResult.length - 3).trim();
        }

        // Send the clean HTML back to the frontend
        res.status(200).send(analysisResult);

    } catch (error) {
        console.error('Internal server error:', error);
        res.status(500).json({ error: error.message });
    }

}
