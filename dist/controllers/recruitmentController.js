"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateApplicationStatus = exports.createApplication = exports.getApplications = exports.deleteJob = exports.updateJob = exports.createJob = exports.getJobs = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
// ==========================
// JOB POSTINGS
// ==========================
// Get all jobs
const getJobs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const jobs = yield prisma_1.default.jobPosting.findMany({
            orderBy: { postedDate: 'desc' },
            include: {
                _count: {
                    select: { jobApplications: true }
                }
            }
        });
        res.json({ success: true, jobs });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getJobs = getJobs;
// Create Job
const createJob = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, department, type, salaryMin, salaryMax, location, description } = req.body;
        const job = yield prisma_1.default.jobPosting.create({
            data: {
                title,
                department,
                type,
                salaryMin: Number(salaryMin),
                salaryMax: Number(salaryMax),
                location,
                description,
                status: 'open'
            }
        });
        res.status(201).json({ success: true, message: 'Job created', job });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.createJob = createJob;
// Update Job
const updateJob = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const data = req.body;
        // Remove immutable fields if present in body (optional safety)
        delete data.id;
        // Ensure numbers
        if (data.salaryMin)
            data.salaryMin = Number(data.salaryMin);
        if (data.salaryMax)
            data.salaryMax = Number(data.salaryMax);
        const job = yield prisma_1.default.jobPosting.update({
            where: { id: Number(id) },
            data
        });
        res.json({ success: true, message: 'Job updated', job });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateJob = updateJob;
// Delete Job
const deleteJob = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma_1.default.jobPosting.delete({ where: { id: Number(id) } });
        res.json({ success: true, message: 'Job deleted' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.deleteJob = deleteJob;
// ==========================
// APPLICATIONS
// ==========================
// Get Applications (All or by Job)
const getApplications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { jobId } = req.query;
        const where = {};
        if (jobId)
            where.jobId = String(jobId);
        const applications = yield prisma_1.default.jobApplication.findMany({
            where,
            orderBy: { appliedDate: 'desc' },
            include: {
                jobPosting: {
                    select: { title: true }
                }
            }
        });
        res.json({ success: true, applications });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.getApplications = getApplications;
// Create Application (Public or Admin)
const createApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { jobId, name, email, phone, resumeUrl } = req.body;
        const application = yield prisma_1.default.jobApplication.create({
            data: {
                jobId,
                name,
                email,
                phone,
                resumeUrl
            }
        });
        res.status(201).json({ success: true, message: 'Application submitted', application });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.createApplication = createApplication;
// Update Application Status
const updateApplicationStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const application = yield prisma_1.default.jobApplication.update({
            where: { id: Number(id) },
            data: { status }
        });
        res.json({ success: true, message: 'Status updated', application });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.updateApplicationStatus = updateApplicationStatus;
