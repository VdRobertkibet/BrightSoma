const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // User needs to provide this or I use another way

// If running in an environment with Firebase Admin already configured:
// admin.initializeApp();

async function fixUsernames() {
  const db = admin.firestore();
  
  const collections = ['staff', 'access_codes'];
  
  for (const collName of collections) {
    console.log(`Processing collection: ${collName}`);
    const snapshot = await db.collection(collName).get();
    
    const batch = db.batch();
    let count = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.username && data.username !== data.username.toLowerCase()) {
        batch.update(doc.ref, { username: data.username.toLowerCase() });
        count++;
      }
    });
    
    if (count > 0) {
      await batch.commit();
      console.log(`Updated ${count} documents in ${collName}`);
    } else {
      console.log(`No updates needed for ${collName}`);
    }
  }
}

fixUsernames().catch(console.error);
