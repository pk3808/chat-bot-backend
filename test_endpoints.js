const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testEndpoints() {
    console.log('Testing endpoints...');

    try {
        // Test Root
        const rootRes = await fetch(`${BASE_URL}/`);
        console.log('Root:', await rootRes.text());

        // Test Config (Expect empty keys if not set)
        const configRes = await fetch(`${BASE_URL}/api/config/keys`);
        console.log('Config Keys:', await configRes.json());

        // Test Gemini (Expect Error if no key)
        const geminiRes = await fetch(`${BASE_URL}/api/chat/gemini`, {
            method: 'POST',
            body: JSON.stringify({ message: 'Hello' }),
            headers: { 'Content-Type': 'application/json' }
        });
        const geminiData = await geminiRes.json();
        console.log('Gemini Test (Should fail without key):', geminiData);

    } catch (error) {
        console.error('Test failed (Is the server running?):', error.message);
    }
}

testEndpoints();
