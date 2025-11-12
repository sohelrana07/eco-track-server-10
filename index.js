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
