const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function checkLogs() {
  try {
    const snap = await getDocs(query(collection(db, 'automation_logs'), orderBy('timestamp', 'desc'), limit(15)));
    console.log('Logs count:', snap.size);
    snap.docs.forEach(d => {
      const data = d.data();
      const time = data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp;
      console.log(`[${time}] [${data.type}] ${data.message}`);
    });
  } catch(e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}
checkLogs();
