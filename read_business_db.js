const { MongoClient } = require('mongodb');

async function main() {
  const uri = 'mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=backend';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB.');
    const db = client.db('winkget_business');
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    // Let's search for collections with 'placement' or 'layout' or 'home'
    for (const coll of collections) {
      if (coll.name.toLowerCase().includes('placement') || coll.name.toLowerCase().includes('layout') || coll.name.toLowerCase().includes('home') || coll.name.toLowerCase().includes('ad')) {
        console.log(`\n=== Documents in ${coll.name} ===`);
        const docs = await db.collection(coll.name).find({}).toArray();
        console.log(JSON.stringify(docs, null, 2));
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

main();
