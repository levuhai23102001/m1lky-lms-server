"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("../controllers/user.controller");
const auth_1 = require("../middleware/auth");
const authRouter = express_1.default.Router();
authRouter.post("/registration", user_controller_1.registrationUser);
authRouter.post("/active-user", user_controller_1.activeUser);
authRouter.post("/login", user_controller_1.loginUser);
authRouter.get("/logout", auth_1.isAuthenticated, user_controller_1.generateAccessToken, user_controller_1.logoutUser);
authRouter.get("/refresh-token", user_controller_1.generateAccessToken);
authRouter.get("/me", user_controller_1.generateAccessToken, auth_1.isAuthenticated, user_controller_1.getUserInfo);
authRouter.post("/social-auth", user_controller_1.socialAuth);
exports.default = authRouter;
