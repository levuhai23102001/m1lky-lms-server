"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchCourse = exports.generateVideoUrl = exports.deleteCourse = exports.getAllCourseAdmin = exports.addReplyToReview = exports.addReview = exports.addAnswer = exports.addQuestion = exports.getCourseByUser = exports.getAllCourses = exports.getSingleCourse = exports.updateCourse = exports.uploadCourse = void 0;
const ejs_1 = __importDefault(require("ejs"));
const catchAsyncErrors_1 = require("../middleware/catchAsyncErrors");
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const cloudinary_1 = __importDefault(require("cloudinary"));
const course_service_1 = require("../services/course.service");
const course_model_1 = __importDefault(require("../models/course.model"));
const redis_1 = require("../utils/redis");
const mongoose_1 = __importDefault(require("mongoose"));
const path_1 = __importDefault(require("path"));
const sendMail_1 = __importDefault(require("../utils/sendMail"));
const notification_model_1 = __importDefault(require("../models/notification.model"));
const axios_1 = __importDefault(require("axios"));
//upload course
exports.uploadCourse = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        if (thumbnail) {
            const myCloud = await cloudinary_1.default.v2.uploader.upload(thumbnail, {
                folder: "courses",
            });
            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            };
        }
        (0, course_service_1.createCourse)(data, res, next);
    }
    catch (err) {
        return next(new ErrorHandler_1.default(err.message, 500));
    }
});
//update course
exports.updateCourse = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        const courseId = req.params.id;
        const courseData = (await course_model_1.default.findById(courseId));
        if (thumbnail && !thumbnail.startsWith("https")) {
            await cloudinary_1.default.v2.uploader.destroy(courseData.thumbnail.public_id);
            const myCloud = await cloudinary_1.default.v2.uploader.upload(thumbnail, {
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
        const course = await course_model_1.default.findByIdAndUpdate(courseId, {
            $set: data,
        }, {
            new: true,
        });
        res.status(201).json({ success: true, course });
    }
    catch (err) {
        return next(new ErrorHandler_1.default(err.message, 500));
    }
});
//get single course --without purchasing
exports.getSingleCourse = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const courseId = req.params.id;
        const isCacheExist = await redis_1.redis.get(courseId);
        if (isCacheExist) {
            const course = JSON.parse(isCacheExist);
            res.status(200).json({ success: true, course });
        }
        else {
            const course = await course_model_1.default.findById(courseId).select("-courseData.videoUrl -courseData.suggestion -courseData.questions, -courseData.links");
            // await redis.set(courseId, JSON.stringify(course), "EX", 604800); //7days
            res.status(200).json({ success: true, course });
        }
    }
    catch (err) {
        return next(new ErrorHandler_1.default(err.message, 500));
    }
});
//get all courses --without purchasing
exports.getAllCourses = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const isCacheExist = await redis_1.redis.get("allCourses");
        if (isCacheExist) {
            const courses = JSON.parse(isCacheExist);
            res.status(200).json({ success: true, courses });
        }
        else {
            let query = {};
            if (req.query.category) {
                query = { categories: req.query.category };
            }
            const page = parseInt(req.query.page, 10) || 1; // Default to page 1 if not specified
            const limit = req.query.limit;
            const skip = (page - 1) * limit;
            const courses = await course_model_1.default.find(query)
                .sort({ _id: -1 })
                .select("-courseData.videoUrl -courseData.suggestion -courseData.questions, -courseData.links")
                .skip(skip)
                .limit(limit);
            // await redis.set("allCourses", JSON.stringify(courses));
            // Send the fetched courses as the response along with pagination metadata
            const totalCourses = await course_model_1.default.countDocuments(query); // Get total number of courses
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
    }
    catch (err) {
        return next(new ErrorHandler_1.default(err.message, 500));
    }
});
//get course content --only for valid user
exports.getCourseByUser = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const userCourseList = req.user?.courses;
        const courseId = req.params.id;
        const courseExists = userCourseList?.find((course) => course._id.toString() === courseId);
        if (!courseExists) {
            return next(new ErrorHandler_1.default("You are not eligible to access this course.", 404));
        }
        const course = await course_model_1.default.findById(courseId);
        const content = course?.courseData;
        res.status(200).json({
            success: true,
            content,
        });
    }
    catch (err) {
        return next(new ErrorHandler_1.default(err.message, 500));
    }
});
exports.addQuestion = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { question, courseId, contentId } = req.body;
        const course = await course_model_1.default.findById(courseId);
        if (!mongoose_1.default.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler_1.default("Invalid content id", 400));
        }
        const courseContent = course?.courseData?.find((item) => item._id.equals(contentId));
        if (!courseContent) {
            return next(new ErrorHandler_1.default("Invalid content id", 400));
        }
        //create new question object
        const newQuestion = {
            user: req.user,
            question,
            questionReplies: [],
        };
        //add this question to our course content
        courseContent.questions.push(newQuestion);
        //create notification
        await notification_model_1.default.create({
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
    }
    catch (err) {
        return next(new ErrorHandler_1.default(err.message, 500));
    }
});
exports.addAnswer = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { answer, courseId, contentId, questionId } = req.body;
        const course = await course_model_1.default.findById(courseId);
        if (!mongoose_1.default.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler_1.default("Invalid content id", 400));
        }
        const courseContent = course?.courseData?.find((item) => item._id.equals(contentId));
        if (!courseContent) {
            return next(new ErrorHandler_1.default("Invalid content id", 400));
        }
        const question = courseContent?.questions?.find((item) => item._id.equals(questionId));
        if (!question) {
            return next(new ErrorHandler_1.default("Invalid question id", 400));
        }
        //create a new answer object
        const newAnswer = {
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
            await notification_model_1.default.create({
                user: req.user?._id,
                title: "New Question Reply Received!",
                message: `You have a new reply in ${courseContent.title}`,
            });
        }
        else {
            const data = {
                name: question.user.name,
                title: courseContent.title,
            };
            const html = await ejs_1.default.renderFile(path_1.default.join(__dirname, "../mails/question_reply.ejs"), data);
            try {
                await (0, sendMail_1.default)({
                    email: question.user.email,
                    subject: "Question reply",
                    template: "question_reply.ejs",
                    data,
                });
            }
            catch (err) {
                return next(new ErrorHandler_1.default(err.message, 500));
            }
        }
        res.status(200).json({
            success: true,
            course,
        });
    }
    catch (err) {
        return next(new ErrorHandler_1.default(err.message, 500));
    }
});
exports.addReview = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const userCourseList = req.user?.courses;
        const courseId = req.params.id;
        //check courseId already exists in userCourseList base on _id
        const courseExists = userCourseList.some((course) => course._id.toString() === courseId.toString());
        if (!courseExists) {
            return next(new ErrorHandler_1.default("You are not eligible to access this course", 404));
        }
        const course = await course_model_1.default.findById(courseId);
        const { review, rating } = req.body;
        const reviewData = {
            user: req.user,
            comment: review,
            rating: rating,
        };
        course?.reviews.push(reviewData);
        let avg = 0;
        course?.reviews.forEach((review) => {
            avg += review.rating;
        });
        if (course) {
            course.ratings = avg / course.reviews.length;
        }
        await course?.save();
        // await redis.set(courseId, JSON.stringify(course), "EX", 604800);
        //create notification
        await notification_model_1.default.create({
            user: req.user?._id,
            title: "New review received",
            message: `${req.user?.name} has given a review in ${course?.name}`,
        });
        res.status(200).json({ success: true, course });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
exports.addReplyToReview = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { comment, courseId, reviewId } = req.body;
        const course = await course_model_1.default.findById(courseId);
        if (!course) {
            return next(new ErrorHandler_1.default("Course not found", 404));
        }
        const review = course?.reviews.find((review) => review._id.toString() === reviewId);
        if (!review) {
            return next(new ErrorHandler_1.default("Review not found", 404));
        }
        const replyData = {
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
            await notification_model_1.default.create({
                user: req.user?._id,
                title: "New Review Reply Received!",
                message: `You have a new review reply in ${course.name}`,
            });
        }
        else {
            const data = {
                name: review.user.name,
                title: course.name,
            };
            const html = await ejs_1.default.renderFile(path_1.default.join(__dirname, "../mails/review_reply.ejs"), data);
            try {
                await (0, sendMail_1.default)({
                    email: review.user.email,
                    subject: "Review reply",
                    template: "review_reply.ejs",
                    data,
                });
            }
            catch (err) {
                return next(new ErrorHandler_1.default(err.message, 500));
            }
        }
        res.status(200).json({
            success: true,
            course,
        });
    }
    catch (err) {
        return next(new ErrorHandler_1.default(err.message, 500));
    }
});
//get all courses --only admin
exports.getAllCourseAdmin = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        (0, course_service_1.getAllCourseService)(res);
    }
    catch (err) {
        return next(new ErrorHandler_1.default(err.message, 400));
    }
});
//delete course --only admin
exports.deleteCourse = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { id } = req.params;
        const course = await course_model_1.default.findById(id);
        if (!course) {
            return next(new ErrorHandler_1.default("Course not found", 404));
        }
        await course.deleteOne({ id });
        await redis_1.redis.del(id);
        res.status(200).json({
            success: true,
            message: "Course deleted successfully!",
        });
    }
    catch (err) {
        return next(new ErrorHandler_1.default(err.message, 400));
    }
});
//generate video url
exports.generateVideoUrl = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { videoId } = req.body;
        const response = await axios_1.default.post(`https://dev.vdocipher.com/api/videos/${videoId}/otp`, { ttl: 300 }, {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Apisecret ${process.env.VDOCIPHER_API_KEY}`,
            },
        });
        res.json(response.data);
    }
    catch (err) {
        return next(new ErrorHandler_1.default(err.message, 400));
    }
});
//search course
exports.searchCourse = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        const searchParams = req.query.title || "";
        const decodedSearchParams = decodeURIComponent(searchParams);
        const searchQuery = {
            // Define your search criteria based on your CourseModel schema
            name: {
                $regex: new RegExp(decodedSearchParams.replace(/\s/g, "\\s*").split(" ").join("\\s*"), "i"),
            },
        };
        const courses = await course_model_1.default.find(searchQuery)
            .select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links")
            .skip(skip)
            .limit(limit);
        // Fetch total courses count based on the search filter
        const totalCourses = await course_model_1.default.countDocuments(searchQuery);
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
    catch (err) {
        return next(new ErrorHandler_1.default(err.message, 500));
    }
});
