import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { createOrder, getAllOrders } from "../controllers/order.controller";
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

export default orderRouter;
