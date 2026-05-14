exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured on server.' })
    };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const { query } = body;
  if (!query) return { statusCode: 400, body: JSON.stringify({ error: 'Missing query' }) };

  const prompt = `You are a dinner recipe assistant. The user wants: "${query}"

Return ONLY a valid JSON array with exactly 4 fresh dinner recipe suggestions NOT including: Spaghetti Carbonara, Chicken Tikka Masala, Beef Tacos, Veggie Stir Fry, Chicken Parmesan, Salmon with Lemon Butter, Beef Ramen, Margherita Pizza, Caesar Salad, Shrimp Fried Rice, Mushroom Risotto, Mac and Cheese, Pad Thai, Steak with Roasted Veggies, Lentil Soup, Chicken Fajitas, Veggie Curry, Beef Bolognese, French Onion Soup, Pesto Pasta, Korean BBQ Bowl, Tomato Basil Soup, Chicken Quesadillas, Shakshuka, Stuffed Bell Peppers, Chicken Noodle Soup, Beef Burgers, Mango Shrimp Curry, Eggplant Parmesan, Fish Tacos, Sushi Bowl, Greek Salad with Falafel, Butter Chicken, Lamb Gyros, Lobster Bisque, Avocado Toast with Egg, Nicoise Salad, Teriyaki Salmon Bowl, BBQ Pulled Pork.

Each object must have: name, emoji, description (max 15 words), time (e.g. "25 min"), type (Italian/Asian/Mexican/American/Mediterranean/Indian/French/Healthy/Quick), ingredients (array of 6-10 strings), steps (array of 4-6 strings), tags (array of 5-8 lowercase strings).

Output ONLY the JSON array. No markdown, no backticks, no explanation.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { statusCode: response.status, body: JSON.stringify({ error: err?.error?.message || 'Anthropic error' }) };
    }

    const data = await response.json();
    const text = (data.content || []).map(c => c.text || '').join('').replace(/```json|```/g, '').trim();
    const recipes = JSON.parse(text);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(recipes) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Unknown error' }) };
  }
};
