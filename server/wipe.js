const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB.");
    
    // Drop the collection
    const result = await mongoose.connection.db.dropCollection('processedattendances');
    console.log("Collection dropped successfully:", result);
  } catch (error) {
    if (error.codeName === 'NamespaceNotFound') {
        console.log("Collection doesn't exist yet, which is fine.");
    } else {
        console.error("Error dropping collection:", error.message);
    }
  } finally {
    process.exit(0);
  }
}

run();
