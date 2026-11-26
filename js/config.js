window.APP_CONFIG = {
  DEMO_MODE: true, // دەمێ سێرڤەر ئامادە بوو بکە false
  API_URL: 'https://api.badinivoice.com', // لینکێ سێرڤەرێ تە یێ داهاتی
  TURNSTILE_SITEKEY: '', // ئەگەر تە Cloudflare Turnstile دانا، کلیلا وی ل ڤێرە دابنێ
  MAX_CHARS: 1000,
  DEMO_VOICES: [
    { id: 'azad', name: 'ئازاد', kind: 'زەلام', tag: 'سافی • هەواڵ', free: true },
    { id: 'shirin', name: 'شیرین', kind: 'ژن', tag: 'ئارام • چیرۆک', free: true },
    { id: 'baran', name: 'باران', kind: 'زەلام', tag: 'گەرم • ڕێکلام', free: true },
    { id: 'rojin', name: 'ڕۆژین', kind: 'ژن', tag: 'ڕوون • فێرکاری', free: true },
    { id: 'zerk', name: 'زێڕک', kind: 'کارەکتەر', tag: 'ئەنیمەیشن • یاری', free: false }
  ]
};
