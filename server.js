"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const mongoose_1 = __importDefault(require("mongoose"));
const cloudinary_1 = require("cloudinary");
const error_1 = require("./middleware/error");
const user_route_1 = __importDefault(require("./routes/user.route"));
const course_route_1 = __importDefault(require("./routes/course.route"));
const order_route_1 = __importDefault(require("./routes/order.route"));
const notification_route_1 = __importDefault(require("./routes/notification.route"));
const analytics_route_1 = __importDefault(require("./routes/analytics.route"));
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const layout_route_1 = __importDefault(require("./routes/layout.route"));
const http_1 = __importDefault(require("http"));
const socketServer_1 = require("./socketServer");
const dotenv = require("dotenv");
const app = (0, express_1.default)();
dotenv.config();
const server = http_1.default.createServer(app);
//body parser
app.use(express_1.default.json({ limit: "50mb" }));
//cors => cross origin resource sharing
app.use(function (req, res, next) {
    //Enabling CORS
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-client-key, x-client-token, x-client-secret, Authorization");
    (0, cors_1.default)({
        origin: ["https://m1lky-lms.vercel.app/"],
        credentials: true,
    });
    next();
});
//cookie parser
app.use((0, cookie_parser_1.default)());
//connect to mongoose db
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URL).then((data) => {
            console.log("Connected to MongoDB");
        });
    }
    catch (error) {
        console.error("Error connecting to MongoDB", error);
        setTimeout(connectDB, 3000);
    }
};
//cloudinary config
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_SECRET_KEY,
});
//routes
app.use("/v1/auth/", auth_route_1.default);
app.use("/v1/users/", user_route_1.default);
app.use("/v1/courses/", course_route_1.default);
app.use("/v1/orders/", order_route_1.default);
app.use("/v1/notifications/", notification_route_1.default);
app.use("/v1/analytics/", analytics_route_1.default);
app.use("/v1/layout/", layout_route_1.default);
app.get("/v1/", (req, res) => {
    return res.send("Express Typescript on Vercel");
});
app.get("/v1/ping", (req, res) => {
    return res.send("pong 🏓");
});
//error middleware
app.use(error_1.ErrorMiddleware);
//connect to socket.oi
(0, socketServer_1.initSocketServer)(server);
//connect to server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}!`);
    connectDB();
});
