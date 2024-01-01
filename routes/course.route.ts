import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  addAnswer,
  addQuestion,
  addReplyToReview,
  addReview,
  deleteCourse,
  generateVideoUrl,
  getAllCourseAdmin,
  getAllCourses,
  getCourseByUser,
  getSingleCourse,
  searchCourse,
  updateCourse,
  uploadCourse,
} from "../controllers/course.controller";
import { generateAccessToken } from "../controllers/user.controller";
const courseRouter = express.Router();

courseRouter.post(
  "/create-course",
  generateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  uploadCourse
);
courseRouter.put(
  "/update-course/:id",
  generateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  updateCourse
);
courseRouter.get("/get-course/:id", getSingleCourse);
courseRouter.get("/get-courses", getAllCourses);
courseRouter.get(
  "/get-course-content/:id",
  generateAccessToken,
  isAuthenticated,
  getCourseByUser
);
courseRouter.put(
  "/add-question",
  generateAccessToken,
  isAuthenticated,
  addQuestion
);
courseRouter.put(
  "/add-answer",
  generateAccessToken,
  isAuthenticated,
  addAnswer
);
courseRouter.put(
  "/add-review/:id",
  generateAccessToken,
  isAuthenticated,
  addReview
);
courseRouter.put(
  "/add-reply",
  generateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  addReplyToReview
);
courseRouter.get(
  "/get-all-courses",
  isAuthenticated,
  generateAccessToken,
  authorizeRoles("admin"),
  getAllCourseAdmin
);
courseRouter.delete(
  "/delete-course/:id",
  generateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  deleteCourse
);
courseRouter.post("/generate-VdoCipherOTP", generateVideoUrl);

courseRouter.get("/search", searchCourse);

export default courseRouter;
