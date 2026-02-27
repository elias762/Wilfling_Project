module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

    try {
        // Read raw audio from request body
        const chunks = [];
        if (req.body) {
            // Vercel already parsed the body
            chunks.push(Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body));
        } else {
            for await (const chunk of req) {
                chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
        }
        const audioBuffer = Buffer.concat(chunks);

        if (audioBuffer.length === 0) {
            return res.status(400).json({ error: 'Empty audio body' });
        }

        // Build new FormData for OpenAI (server-side)
        const blob = new Blob([audioBuffer], { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', blob, 'recording.webm');
        formData.append('model', 'whisper-1');
        formData.append('language', 'de');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + apiKey },
            body: formData,
        });

        const text = await response.text();
        if (!response.ok) {
            return res.status(response.status).json({ error: text });
        }

        return res.status(200).json(JSON.parse(text));
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
