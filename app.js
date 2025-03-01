//!REMEMBER BRACKETS ADDED BY FORMATTER

const express = require("express");
const bodyParser = require("body-parser");
const { graphqlHTTP } = require("express-graphql");
const { buildSchema } = require("graphql");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Event = require("./models/event");
const User = require("./models/user");

const app = express();

app.use(bodyParser.json());

app.use(
  "/graphql",
  graphqlHTTP({
    schema: buildSchema(`
        type Event {
            _id: ID!
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        type User {
          _id: ID!
          email: String!
          password: String
        }

        input EventInput {
            title: String!
            description: String!
            price: Float!
            date: String!        
        }

        input UserInput {
            email: String!
            password: String!
        }

        type RootQuery {
            events: [Event!]! 
        }

        type RootMutation {
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User
        }

        schema {
            query: RootQuery
            mutation: RootMutation
        }
    `),
    rootValue: {
      // Resolvers
      events: () => {
        return Event.find()
          .then((events) => {
            return events.map((event) => {
              return { ...event._doc, _id: event.id }; //! _id: might throw an error
            });
          })
          .catch((err) => {
            throw err;
          });
      },
      createEvent: (args) => {
        // Create a new event and save it to the database
        const event = new Event({
          title: args.eventInput.title,
          description: args.eventInput.description,
          price: +args.eventInput.price,
          date: new Date(args.eventInput.date),
          creator: "67b48cd10c94df4eb41122c0",
        });
        let createdEvent;
        return event
          .save()
          .then((result) => {
            createdEvent = {
              ...result._doc,
              _id: result._doc._id.toString(), //! _id: might throw an error
            };
            return User.findById("67b48cd10c94df4eb41122c0");
          })
          .then((user) => {
            if (!user) {
              throw new Error("User not found!");
            }
            user.createdEvents.push(event);
            return user.save();
          })
          .then((result) => {
            return createdEvent;
          })
          .catch((err) => {
            console.log(err);
            throw err;
          });
      },
      createUser: (args) => {
        return User.findOne({ email: args.userInput.email })
          .then((user) => {
            if (user) {
              throw new Error("User already exists!");
            }
            return bcrypt.hash(args.userInput.password, 12);
          })
          .then((hashedPassword) => {
            const user = new User({
              email: args.userInput.email,
              password: hashedPassword,
            });
            return user.save();
          })
          .then((result) => {
            return { ...result._doc, password: null, _id: result.id };
          })
          .catch((err) => {
            throw err;
          });
      },
    },
    graphiql: true,
  })
);

mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.0tpqu.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority&appName=Cluster0`
  )
  .then(() => {
    app.listen(3000);
  })
  .catch((err) => {
    console.log(err);
  });
