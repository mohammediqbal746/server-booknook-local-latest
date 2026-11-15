import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// Middleware (শুধু লোকালহোস্টের জন্য সেট করা হলো)
app.use(cors({
    origin: ['http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// MongoDB Setup
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
    try {
        await client.connect();
        console.log("Successfully connected to MongoDB!");

        // Database and Collections
        const db = client.db("bookNookDB");
        const bookCollection = db.collection("books");
        const borrowCollection = db.collection("borrows");

        // --- Standard Routes ---
        app.get('/', (req, res) => {
            res.send('BookNook Local Server is running perfectly!');
        });

    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

// Server Listening
app.listen(port, () => {
    console.log(`Server is running locally on port ${port}`);
});