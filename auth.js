import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { jwt } from "better-auth/plugins"; // ডকের নির্দেশ অনুযায়ী ইমপোর্ট
import dotenv from "dotenv";

dotenv.config();

// MongoDB Client Setup for Better Auth
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("bookNookDB");

// Better Auth Configuration
export const auth = betterAuth({
    database: mongodbAdapter(db),
    emailAndPassword: {
        enabled: true, 
    },
    plugins: [jwt()], // JWT প্লাগিন যোগ করা হলো
    session: {
        cookieCache: {
            enabled: true,
            strategy: "jwt",
            maxAge: 7 * 24 * 60 * 60, // 7 days (টোকেনের মেয়াদ)
        },
    },
});