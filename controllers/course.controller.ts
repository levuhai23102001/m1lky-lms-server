import ejs from "ejs";
import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import cloudinary from "cloudinary";
import { createCourse, getAllCourseService } from "../services/course.service";
import CourseModel from "../models/course.model";
import { redis } from "../utils/redis";
import mongoose from "mongoose";
import path from "path";
import sendMail from "../utils/sendMail";
import NotificationModel from "../models/notification.model";
import axios from "axios";

//upload course
export const uploadCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }
      createCourse(data, res, next);
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 500));
    }
  }
);

//update course
export const updateCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;

      const thumbnail = data.thumbnail;

      const courseId = req.params.id;

      const courseData = (await CourseModel.findById(courseId)) as any;
      if (thumbnail && !thumbnail.startsWith("https")) {
        await cloudinary.v2.uploader.destroy(courseData.thumbnail.public_id);

        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });

        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }

      if (thumbnail.startsWith("https")) {
        data.thumbnail = {
          public_id: courseData?.thumbnail.public_id,
          url: courseData?.thumbnail.url,
        };
      }

      const course = await CourseModel.findByIdAndUpdate(
        courseId,
        {
          $set: data,
        },
        {
          new: true,
        }
      );
      res.status(201).json({ success: true, course });
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 500));
    }
  }
);

//get single course --without purchasing
export const getSingleCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const isCacheExist = await redis.get(courseId);
      if (isCacheExist) {
        const course = JSON.parse(isCacheExist);
        res.status(200).json({ success: true, course });
      } else {
        const course = await CourseModel.findById(courseId).select(
          "-courseData.videoUrl -courseData.suggestion -courseData.questions, -courseData.links"
        );
        // await redis.set(courseId, JSON.stringify(course), "EX", 604800); //7days
        res.status(200).json({ success: true, course });
      }
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 500));
    }
  }
);

//get all courses --without purchasing
export const getAllCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isCacheExist = await redis.get("allCourses");
      if (isCacheExist) {
        const courses = JSON.parse(isCacheExist);
        res.status(200).json({ success: true, courses });
      } else {
        let query: any = {};

        if (req.query.category) {
          query = { categories: req.query.category };
        }

        const page = parseInt(req.query.page as string, 10) || 1; // Default to page 1 if not specified
        const limit = req.query.limit as any;

        const skip = (page - 1) * limit;
        const courses = await CourseModel.find(query)
          .sort({ _id: -1 })
          .select(
            "-courseData.videoUrl -courseData.suggestion -courseData.questions, -courseData.links"
          )
          .skip(skip)
          .limit(limit);
        // await redis.set("allCourses", JSON.stringify(courses));
        // Send the fetched courses as the response along with pagination metadata
        const totalCourses = await CourseModel.countDocuments(query); // Get total number of courses
        const totalPages = Math.ceil(totalCourses / limit);

        res.status(200).json({
          success: true,
          courses,
          pagination: {
            currentPage: page,
            totalPages,
            totalCourses,
          },
        });
      }
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 500));
    }
  }
);

//get course content --only for valid user
export const getCourseByUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;
      const courseExists = userCourseList?.find(
        (course: any) => course._id.toString() === courseId
      );
      if (!courseExists) {
        return next(
          new ErrorHandler("You are not eligible to access this course.", 404)
        );
      }
      const course = await CourseModel.findById(courseId);
      const content = course?.courseData;

      res.status(200).json({
        success: true,
        content,
      });
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 500));
    }
  }
);

//add question in course
interface IQuestionData {
  question: string;
  courseId: string;
  contentId: string;
}

export const addQuestion = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, courseId, contentId }: IQuestionData = req.body;
      const course = await CourseModel.findById(courseId);
      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content id", 400));
      }
      const courseContent = course?.courseData?.find((item: any) =>
        item._id.equals(contentId)
      );
      if (!courseContent) {
        return next(new ErrorHandler("Invalid content id", 400));
      }
      //create new question object
      const newQuestion: any = {
        user: req.user,
        question,
        questionReplies: [],
      };
      //add this question to our course content
      courseContent.questions.push(newQuestion);
      //create notification
      await NotificationModel.create({
        user: req.user?._id,
        title: "New Question Received!",
        message: `You have a new question in ${courseContent.title}`,
      });
      //save and update course
      await course?.save();
      res.status(200).json({
        success: true,
        course,
      });
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 500));
    }
  }
);

//add answer in course
interface IAnswerData {
  answer: string;
  courseId: string;
  contentId: string;
  questionId: string;
}

export const addAnswer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { answer, courseId, contentId, questionId }: IAnswerData = req.body;
      const course = await CourseModel.findById(courseId);
      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content id", 400));
      }
      const courseContent = course?.courseData?.find((item: any) =>
        item._id.equals(contentId)
      );
      if (!courseContent) {
        return next(new ErrorHandler("Invalid content id", 400));
      }
      const question = courseContent?.questions?.find((item: any) =>
        item._id.equals(questionId)
      );
      if (!question) {
        return next(new ErrorHandler("Invalid question id", 400));
      }
      //create a new answer object
      const newAnswer: any = {
        user: req.user,
        answer,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      //add this answer to our this course
      question.questionReplies.push(newAnswer);

      await course?.save();

      if (req.user?._id === question.user._id) {
        //create a notification
        await NotificationModel.create({
          user: req.user?._id,
          title: "New Question Reply Received!",
          message: `You have a new reply in ${courseContent.title}`,
        });
      } else {
        const data = {
          name: question.user.name,
          title: courseContent.title,
        };

        const html = await ejs.renderFile(
          path.join(__dirname, "../mails/question_reply.ejs"),
          data
        );
        try {
          await sendMail({
            email: question.user.email,
            subject: "Question reply",
            template: "question_reply.ejs",
            data,
          });
        } catch (err: any) {
          return next(new ErrorHandler(err.message, 500));
        }
      }

      res.status(200).json({
        success: true,
        course,
      });
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 500));
    }
  }
);

//add review course
interface IReviewData {
  review: string;
  rating: number;
  userId: string;
}

export const addReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;
      //check courseId already exists in userCourseList base on _id
      const courseExists = userCourseList.some(
        (course: any) => course._id.toString() === courseId.toString()
      );
      if (!courseExists) {
        return next(
          new ErrorHandler("You are not eligible to access this course", 404)
        );
      }
      const course = await CourseModel.findById(courseId);
      const { review, rating }: IReviewData = req.body;
      const reviewData: any = {
        user: req.user,
        comment: review,
        rating: rating,
      };

      course?.reviews.push(reviewData);

      let avg = 0;

      course?.reviews.forEach((review: any) => {
        avg += review.rating;
      });

      if (course) {
        course.ratings = avg / course.reviews.length;
      }

      await course?.save();

      // await redis.set(courseId, JSON.stringify(course), "EX", 604800);

      //create notification
      await NotificationModel.create({
        user: req.user?._id,
        title: "New review received",
        message: `${req.user?.name} has given a review in ${course?.name}`,
      });

      res.status(200).json({ success: true, course });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

//add reply to review
interface IAddReviewData {
  comment: string;
  courseId: string;
  reviewId: string;
}

export const addReplyToReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, courseId, reviewId }: IAddReviewData = req.body;
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }
      const review = course?.reviews.find(
        (review) => review._id.toString() === reviewId
      );
      if (!review) {
        return next(new ErrorHandler("Review not found", 404));
      }

      const replyData: any = {
        user: req.user,
        comment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (!review.commentReplies) {
        review.commentReplies = [];
      }

      review.commentReplies?.push(replyData);

      await course?.save();

      // await redis.set(courseId, JSON.stringify(course), "EX", 604800);

      //create send mail
      if (req.user?._id === review.user._id) {
        //create a notification
        await NotificationModel.create({
          user: req.user?._id,
          title: "New Review Reply Received!",
          message: `You have a new review reply in ${course.name}`,
        });
      } else {
        const data = {
          name: review.user.name,
          title: course.name,
        };

        const html = await ejs.renderFile(
          path.join(__dirname, "../mails/review_reply.ejs"),
          data
        );
        try {
          await sendMail({
            email: review.user.email,
            subject: "Review reply",
            template: "review_reply.ejs",
            data,
          });
        } catch (err: any) {
          return next(new ErrorHandler(err.message, 500));
        }
      }

      res.status(200).json({
        success: true,
        course,
      });
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 500));
    }
  }
);

//get all courses --only admin
export const getAllCourseAdmin = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllCourseService(res);
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 400));
    }
  }
);

//delete course --only admin
export const deleteCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const course = await CourseModel.findById(id);

      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      await course.deleteOne({ id });

      await redis.del(id);

      res.status(200).json({
        success: true,
        message: "Course deleted successfully!",
      });
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 400));
    }
  }
);

//generate video url
export const generateVideoUrl = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { videoId } = req.body;
      const response = await axios.post(
        `https://dev.vdocipher.com/api/videos/${videoId}/otp`,
        { ttl: 300 },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Apisecret ${process.env.VDOCIPHER_API_KEY}`,
          },
        }
      );

      res.json(response.data);
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 400));
    }
  }
);

//search course
export const searchCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const skip = (page - 1) * limit;
      const searchParams = (req.query.title as string) || "";
      const decodedSearchParams = decodeURIComponent(searchParams);
      const searchQuery = {
        // Define your search criteria based on your CourseModel schema
        name: {
          $regex: new RegExp(
            decodedSearchParams.replace(/\s/g, "\\s*").split(" ").join("\\s*"),
            "i"
          ),
        },
      };

      const courses = await CourseModel.find(searchQuery)
        .select(
          "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
        )
        .skip(skip)
        .limit(limit);

      // Fetch total courses count based on the search filter
      const totalCourses = await CourseModel.countDocuments(searchQuery);

      const totalPages = Math.ceil(totalCourses / limit);

      res.status(200).json({
        success: true,
        courses,
        pagination: {
          currentPage: page,
          totalPages,
          totalCourses,
        },
      });
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 500));
    }
  }
);
