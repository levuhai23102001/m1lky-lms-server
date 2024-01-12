"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("../controllers/user.controller");
const auth_1 = require("./../middleware/auth");
const userRouter = express_1.default.Router();
userRouter.put("/update-user-info", user_controller_1.generateAccessToken, auth_1.isAuthenticated, user_controller_1.updateUserInfo);
userRouter.put("/update-user-password", user_controller_1.generateAccessToken, auth_1.isAuthenticated, user_controller_1.updateUserPassword);
userRouter.put("/update-user-avatar", user_controller_1.generateAccessToken, auth_1.isAuthenticated, user_controller_1.updateUserAvatar);
userRouter.get("/get-users", user_controller_1.generateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), user_controller_1.getAllUsers);
userRouter.put("/update-user-role", user_controller_1.generateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), user_controller_1.updateUserRole);
userRouter.delete("/delete-user/:id", user_controller_1.generateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), user_controller_1.deleteUser);
exports.default = userRouter;
