import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  createOrder,
  getAllOrders,
  newPayment,
  sendStripePublishableKey,
} from "../controllers/order.controller";
import { generateAccessToken } from "../controllers/user.controller";
const orderRouter = express.Router();

orderRouter.post("/create-order", isAuthenticated, createOrder);

orderRouter.get(
  "/get-orders",
  generateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  getAllOrders
);

orderRouter.get("/payment/stripe-publishable-key", sendStripePublishableKey);

orderRouter.post("/payment", isAuthenticated, generateAccessToken, newPayment);

export default orderRouter;
