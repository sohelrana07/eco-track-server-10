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
    const userChallenges = db.collection("userChallenges");

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

    // add data to database
    app.post("/challenges", async (req, res) => {
      const newChallenge = req.body;
      const result = await challengesCollection.insertOne(newChallenge);
      res.send(result);
    });

    // add userChallenge to database
    app.post("/challenge/join/:id", async (req, res) => {
      const joinChallenge = req.body;
      const challengeId = joinChallenge.challengeId;
      const existing = await userChallenges.findOne({
        challengeId: challengeId,
        userId: joinChallenge.userId,
      });

      if (existing) {
        return res
          .status(400)
          .send({ message: "You have already joined this challenge" });
      }

      const result = await userChallenges.insertOne(joinChallenge);

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
      const cursor = userChallenges.find(filter);
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
