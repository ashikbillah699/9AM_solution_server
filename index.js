require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
// const bcrypt = require('bcrypt');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
const allowedOrigins = ['http://localhost:5173'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
            allowedOrigins.includes(origin) ||
            /^https?:\/\/([a-z0-9-]+)\.localhost:5173$/.test(origin)
        ) {
            return callback(null, true);
        } else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j8csd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const taskCollection = client.db("taskFlowDB").collection("tasks");
        const userCollection = client.db("taskFlowDB").collection("users");
        const notificationCollection = client.db("taskFlowDB").collection("notification");


        // auth related API
        // create token
        app.post('/jwt', (req, res) => {
            const { user, rememberMe } = req.body;
            const expiresIn = rememberMe ? '7d' : '30m';
            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn })

            res.cookie('token', token, {
                httpOnly: true,
                secure: false,
                // domain: '.localhost',
                maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000,
                sameSite: 'lax'
            }).send({ success: true })
        })

        // clear cooke
        app.post('/logout', (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: false,
                sameSite: 'lax'
                // domain: '.localhost'
            }).send({ success: true })
        })

        // verify token
        app.get('/verify', (req, res) => {
            const token = req.cookies.token;

            if (!token) {
                return res.status(401).json({ message: 'No token found' });
            }

            jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).json({ message: 'Token invalid or expired' });
                }
                res.json({ user: decoded, message: 'Token valid' });
            });
        });

        // post User data 
        app.post('/user', async (req, res) => {
            try {
                const { userName, photoURL, email, password, shopName } = req.body;

                if (!userName || !email || !password || !shopName || !Array.isArray(shopName) || shopName.length === 0) {
                    return res.status(400).json({ message: 'Invalid input data' });
                }

                const conflict = await userCollection.findOne({
                    shopName: { $in: shopName }
                });

                if (conflict) {
                    return res.status(400).json({ message: 'One or more Shop Names already taken!' });
                }

                const result = await userCollection.insertOne({ userName, photoURL, email, password, shopName });
                return res.status(200).json({ message: 'User created successfully', insertedId: result.insertedId });

            } catch (error) {
                console.error('Server error:', error);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
        });

        // get All users
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result)
        })

        // update task
        app.put('/task/:id', async (req, res) => {
            const id = req.params.id;
            const updateTask = req.body;
            const query = { _id: new ObjectId(id) }
            const updateData = {
                $set: {
                    title: updateTask.title,
                    description: updateTask.description,
                    dueDate: updateTask.dueDate,
                    priority: updateTask.priority,
                    status: updateTask.status,
                    assignedEmail: updateTask.assignedEmail,
                    userEmail: updateTask.userEmail,
                }
            }
            const result = await taskCollection.updateOne(query, updateData);
            res.send(result)
        })

        // delete task
        app.delete('/task/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await taskCollection.deleteOne(query);
            res.send(result);
        })

        // notification
        app.post('/notifications/:email', async (req, res) => {
            const task = req.body;
            const result = await taskCollection.insertOne(task);

            if (task.assignedEmail) {
                const notification = {
                    receiverEmail: task.assignedEmail,
                    message: `You have been assigned a new task: "${task.title}"`,
                    taskId: result.insertedId,
                    isRead: false,
                    createdAt: new Date()
                };
                await notificationCollection.insertOne(notification);
            }
            res.send(result);
        });

        // show notification
        app.get('/notifications', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                return res.status(400).send({ message: 'Email is required' });
            }
            const notifications = await notificationCollection
                .find({ receiverEmail: email })
                .sort({ createdAt: -1 })
                .toArray();
            res.send(notifications);
        });

        // update notification isRate
        app.put('/notification/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = { $set: { isRead: true } };
                const result = await notificationCollection.updateOne(filter, updateDoc);
                res.send(result);
            } catch (error) {
                console.error('Update notification error:', error);
                res.status(500).send({ error: 'Internal Server Error' });
            }
        });

        // insert task
        app.post('/task', async (req, res) => {
            const reciveData = req.body;
            const result = await taskCollection.insertOne(reciveData);
            res.send(result);
        })

        // get All tasks
        app.get('/tasks', async (req, res) => {
            const result = await taskCollection.find().toArray();
            res.send(result)
        })

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Welcome to TaskFlow server')
})

app.listen(port, () => {
    console.log(`Task Flow is sitting on port ${port}`)
})