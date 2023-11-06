import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  getNotifications,
  updateNotification,
} from "../controllers/notification.controller";
import { generateAccessToken } from "../controllers/user.controller";

const notificationRouter = express.Router();

notificationRouter.get(
  "/get-all-notifications",
  generateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  getNotifications
);

notificationRouter.put(
  "/update-notification/:id",
  generateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  updateNotification
);

export default notificationRouter;
