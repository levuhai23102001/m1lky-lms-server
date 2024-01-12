"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRoleService = exports.getAllUsersService = exports.getUserById = void 0;
const redis_1 = require("../utils/redis");
const user_model_1 = __importDefault(require("../models/user.model"));
//get user by id
const getUserById = async (id, res) => {
    const userJSON = await redis_1.redis.get(id);
    if (userJSON) {
        const user = JSON.parse(userJSON);
        res.status(201).json({ success: true, user });
    }
};
exports.getUserById = getUserById;
//get all users
const getAllUsersService = async (res) => {
    const users = await user_model_1.default.find().sort({ createdAt: -1 });
    res.status(201).json({ success: true, users });
};
exports.getAllUsersService = getAllUsersService;
//update user role
const updateUserRoleService = async (res, id, role) => {
    const user = await user_model_1.default.findByIdAndUpdate(id, { role }, { new: true });
    res.status(201).json({
        success: true,
        user,
    });
};
exports.updateUserRoleService = updateUserRoleService;
