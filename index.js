import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion,ObjectId } from 'mongodb';
import { createRemoteJWKSet, jwtVerify } from "jose";

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

        // JWT Verify Middleware (Security Guard)
        const verifyToken = async (req, res, next) => {
            const authHeader = req.headers.authorization;

            if (!authHeader) {
                return res.status(401).send({ msg: "Unauthorized!" });
            }

            const token = authHeader.split(" ")[1];

            if (!token) {
                return res.status(401).send({ msg: "Unauthorized!" });
            }

            const JWKS = createRemoteJWKSet(
                new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
            );

            try {
                const { payload } = await jwtVerify(token, JWKS);
                req.user = payload; // (পরবর্তীতে কাজে লাগানোর জন্য ইউজার ডাটা সেভ করে রাখলাম)
                next();
            } catch (error) {
                return res.status(500).send({ msg: "Server Error!" });
            }
        };

        // --- Standard Routes ---
        app.get('/', (req, res) => {
            res.send('BookNook Local Server is running perfectly!');
        });

// ==========================================
        // 📚 BOOK ROUTES
        // ==========================================
        
        // 1. Add Book (Protected)
       app.post("/books", async (req, res) => {
    try {
        const book = req.body;
        book.createdAt = new Date();
        
        // ফ্রন্টএন্ড থেকে totalCopies বা quantity যে নামেই আসুক না কেন, এটা হ্যান্ডেল করে নেবে
        book.totalCopies = parseInt(book.totalCopies || book.quantity || 0); 
        
        const result = await bookCollection.insertOne(book);
        res.send(result);
    } catch (error) {
        console.error("Book Add Error:", error);
        res.status(500).send({ msg: "Server Error!" });
    }
});

        // 2. Get All Books (Public) - For Home Page (limit) and All Books page
        app.get("/books", async (req, res) => {
            const limit = parseInt(req.query.limit) || 0;
            // newest first as per requirement
            const result = await bookCollection.find().sort({ createdAt: -1 }).limit(limit).toArray();
            res.send(result);
        });

        // 3. Get Single Book (Public)
        app.get("/books/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookCollection.findOne(query);
            res.send(result);
        });

        // 4. Get My Added Books (Protected)
        app.get("/my-books/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { "user.email": email }; // Assuming we save user object in book
            const result = await bookCollection.find(query).toArray();
            res.send(result);
        });

        // 5. Update Book (Protected)
        app.patch("/books/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;
            const query = { _id: new ObjectId(id) };
            const updateDoc = { $set: updatedData };
            const result = await bookCollection.updateOne(query, updateDoc);
            res.send(result);
        });

        // 6. Delete Book (Protected)
        app.delete("/books/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookCollection.deleteOne(query);
            res.send(result);
        });

        // ==========================================
        // 🛒 BORROW ROUTES (Challenge Implemented)
        // ==========================================

        // 7. Borrow Book (Protected) - Challenge: No Double Borrow & Decrease Copy
        app.post("/borrows", verifyToken, async (req, res) => {
            const borrowData = req.body;
            
            // Check double borrow
            const alreadyBorrowed = await borrowCollection.findOne({
                bookId: borrowData.bookId,
                userEmail: borrowData.userEmail
            });
            if (alreadyBorrowed) {
                return res.status(400).send({ message: "You have already borrowed this book!" });
            }

            // Decrease total copies by 1
            const bookQuery = { _id: new ObjectId(borrowData.bookId) };
            await bookCollection.updateOne(bookQuery, { $inc: { totalCopies: -1 } });

            const result = await borrowCollection.insertOne(borrowData);
            res.send(result);
        });

        // 8. Get My Borrows (Protected)
        app.get("/borrows/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email };
            const result = await borrowCollection.find(query).toArray();
            res.send(result);
        });

        // 9. Return Book (Protected) - Challenge: Increase Copy
        app.delete("/borrows/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            
            // Find the borrow record first to get the bookId
            const borrowRecord = await borrowCollection.findOne({ _id: new ObjectId(id) });
            if (!borrowRecord) return res.status(404).send({ message: "Record not found" });

            // Increase total copies by 1
            const bookQuery = { _id: new ObjectId(borrowRecord.bookId) };
            await bookCollection.updateOne(bookQuery, { $inc: { totalCopies: 1 } });

            // Delete the borrow record
            const result = await borrowCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
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