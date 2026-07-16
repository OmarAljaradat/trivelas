const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

if (!db.settings) db.settings = {};
db.settings.maintenanceBypassToken = "trivela-bypass-vip";
db.settings.maintenanceMessage = "نعمل حالياً على تحديث خوادم أسعار الكوينز والمهام، سنعود للعمل خلال دقائق بسيطة جداً. شكراً لصبركم!";

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log("Successfully seeded maintenance bypass token and message inside database.json!");
