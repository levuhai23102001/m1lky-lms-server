import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { ErrorMiddleware } from "./middleware/error";
import userRouter from "./routes/user.route";
import courseRouter from "./routes/course.route";
import orderRouter from "./routes/order.route";
import notificationRouter from "./routes/notification.route";
import analyticsRouter from "./routes/analytics.route";
import authRouter from "./routes/auth.route";
import layoutRouter from "./routes/layout.route";
import http from "http";
import { initSocketServer } from "./socketServer";

const dotenv = require("dotenv");

const app = express();

dotenv.config();

const server = http.createServer(app);

//body parser
app.use(express.json({ limit: "50mb" }));

//cors => cross origin resource sharing
app.use(function (req: Request, res: Response, next: NextFunction) {
  //Enabling CORS
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-client-key, x-client-token, x-client-secret, Authorization"
  );
  next();
});

//cookie parser
app.use(cookieParser());

//connect to mongoose db
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL).then((data: any) => {
      console.log("Connected to MongoDB");
    });
  } catch (error: any) {
    console.error("Error connecting to MongoDB", error);
    setTimeout(connectDB, 3000);
  }
};

//cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_KEY,
});

//routes
app.use("/v1/auth/", authRouter);
app.use("/v1/users/", userRouter);
app.use("/v1/courses/", courseRouter);
app.use("/v1/orders/", orderRouter);
app.use("/v1/notifications/", notificationRouter);
app.use("/v1/analytics/", analyticsRouter);
app.use("/v1/layout/", layoutRouter);

app.get("/", (req: Request, res: Response) => {
  return res.send("Express Typescript on Vercel");
});

app.get("/ping", (req: Request, res: Response) => {
  return res.send("pong 🏓");
});

//error middleware
app.use(ErrorMiddleware);

//connect to socket.oi
initSocketServer(server);

//connect to server
const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}!`);
  connectDB();
});
