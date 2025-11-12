const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@fast-cluster.usibdwl.mongodb.net/?appName=Fast-Cluster`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Server is running fine!");
});

async function run() {
  try {
    await client.connect();

    const db = client.db("eco_db");
    const challengesCollection = db.collection("challenges");
    const userChallengesCollection = db.collection("userChallenges");
    const recentTipsCollection = db.collection("recentTips");
    const eventsCollection = db.collection("events");

    // get all challenges from database
    app.get("/challenges", async (req, res) => {
      const cursor = challengesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get specific challenge from database
    app.get("/challenges/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await challengesCollection.findOne(query);
      res.send(result);
    });

    // add challenge to database
    app.post("/challenges", async (req, res) => {
      const newChallenge = req.body;
      const result = await challengesCollection.insertOne(newChallenge);
      res.send(result);
    });

    // update challenge to database
    app.patch("/challenges/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: updateData,
      };
      const options = {};
      const result = await challengesCollection.updateOne(
        query,
        update,
        options
      );
      res.send(result);
    });

    // add userChallenge to database
    app.post("/challenge/join/:id", async (req, res) => {
      const joinChallenge = req.body;
      const challengeId = joinChallenge.challengeId;
      const existing = await userChallengesCollection.findOne({
        challengeId: challengeId,
        userId: joinChallenge.userId,
      });

      if (existing) {
        return res
          .status(400)
          .send({ message: "You have already joined this challenge" });
      }

      const result = await userChallengesCollection.insertOne(joinChallenge);

      // participants count
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $inc: {
          participants: 1,
        },
      };
      const options = {};
      const participantsCounted = await challengesCollection.updateOne(
        query,
        update,
        options
      );
      res.send({ result, participantsCounted });
    });

    // get myActivities from database
    app.get("/myActivities", async (req, res) => {
      const user = req.query.userId;
      const filter = { userId: user };
      const cursor = userChallengesCollection.find(filter);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get recentTips from database
    app.get("/recent", async (req, res) => {
      const cursor = recentTipsCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(5);
      const result = await cursor.toArray();
      res.send(result);
    });

    // get upcomingEvents from database
    app.get("/events", async (req, res) => {
      const cursor = eventsCollection.find().sort({ date: 1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close()
  }
}
run().catch(console.dir);

app.listen(port, (req, res) => {
  console.log(`Server is running on port ${port}`);
});
