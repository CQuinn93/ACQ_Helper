// Use dynamic import instead of require for node-fetch
let fetch;

exports.handler = async function(event, context) {
  // Dynamically import node-fetch
  if (!fetch) {
    const fetchModule = await import('node-fetch');
    fetch = fetchModule.default;
  }

  // --- CORS preflight handler ---
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://acqds.com', // Changed to match your domain
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  // --- Main logic ---
  const { projectCode, updateType } = JSON.parse(event.body);

  const SUPABASE_URL = 'https://updolqrzrhsupfqbmipd.supabase.co';
  const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwZG9scXJ6cmhzdXBmcWJtaXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3OTA5MTEsImV4cCI6MjA2MjM2NjkxMX0.ZTcBrD9RJ_7nw0zvxJxk1YGcxYuSE14lbUQZ-YrEQbU';
  const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  try {
    // 1. Get all push tokens for this project
    const res = await fetch(`${SUPABASE_URL}/rest/v1/notifications?project_code=eq.${projectCode}`, {
      headers: {
        apikey: SUPABASE_API_KEY,
        Authorization: `Bearer ${SUPABASE_API_KEY}`,
      },
    });
    
    if (!res.ok) {
      throw new Error(`Supabase request failed: ${res.status}`);
    }
    
    const data = await res.json();
    const tokens = data.map(row => row.expo_push_token);

    // 2. Prepare notification message
    let body = '';
    if (updateType === 'comment') body = 'A new comment was added to your project!';
    if (updateType === 'drawing') body = 'A new drawing was uploaded to your project!';
    if (updateType === 'stage') body = 'A project stage was updated!';

    // 3. Send notifications
    let sentCount = 0;
    for (const token of tokens) {
      try {
        const expoRes = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: token,
            sound: 'default',
            title: 'Project Update',
            body,
            data: { projectCode, updateType },
          }),
        });
        
        if (expoRes.ok) {
          sentCount++;
        }
      } catch (expoError) {
        console.error('Error sending to token:', token, expoError);
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://acqds.com',
      },
      body: JSON.stringify({ success: true, sent: sentCount, total: tokens.length }),
    };
    
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://acqds.com',
      },
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};