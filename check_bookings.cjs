const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function checkBookings() {
  try {
    const snap = await getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(10)));
    console.log('Bookings count:', snap.size);
    snap.docs.forEach(d => {
      const b = d.data();
      console.log(JSON.stringify({
        id: d.id,
        userName: b.userName,
        userPhone: b.userPhone,
        date: b.date,
        time: b.time,
        status: b.status,
        confirmationSent: b.confirmationSent,
        reminderSent: b.reminderSent,
        createdAt: b.createdAt?.toDate ? b.createdAt.toDate().toISOString() : b.createdAt
      }, null, 2));
    });
  } catch(e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}
checkBookings();
