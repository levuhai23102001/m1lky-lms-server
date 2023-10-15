import express from "express";
import {
  activeUser,
  generateAccessToken,
  getUserInfo,
  loginUser,
  logoutUser,
  registrationUser,
  socialAuth,
} from "../controllers/user.controller";
import { isAuthenticated } from "../middleware/auth";

const authRouter = express.Router();

authRouter.post("/registration", registrationUser);
authRouter.post("/active-user", activeUser);
authRouter.post("/login", loginUser);
authRouter.get("/logout", isAuthenticated, logoutUser);
authRouter.get("/refresh-token", generateAccessToken);
authRouter.get("/me", isAuthenticated, getUserInfo);
authRouter.post("/social-auth", socialAuth);

export default authRouter;
