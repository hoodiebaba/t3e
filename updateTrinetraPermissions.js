// pdfDecode.js
const fs = require('fs');

const base64Data = 'PASTE_YOUR_BASE64_STRING_HERE'; // pura base64 responsePDF ka data

fs.writeFileSync('output.pdf', Buffer.from(base64Data, 'base64'));
console.log('PDF created: output.pdf');
