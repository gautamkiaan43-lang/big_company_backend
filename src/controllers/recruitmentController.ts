import { Request, Response } from 'express';
import prisma from '../utils/prisma';

interface AuthRequest extends Request {
    user?: any;
}

// ==========================
// JOB POSTINGS
// ==========================

// Get all jobs
export const getJobs = async (req: AuthRequest, res: Response) => {
    try {
        const jobs = await prisma.jobPosting.findMany({
            orderBy: { postedDate: 'desc' },
            include: {
                _count: {
                    select: { jobApplications: true }
                }
            }
        });
        res.json({ success: true, jobs });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Create Job
export const createJob = async (req: AuthRequest, res: Response) => {
    try {
        const { title, department, type, salaryMin, salaryMax, location, description } = req.body;

        const job = await prisma.jobPosting.create({
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
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Update Job
export const updateJob = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const data = req.body;

        // Remove immutable fields if present in body (optional safety)
        delete data.id;

        // Ensure numbers
        if (data.salaryMin) data.salaryMin = Number(data.salaryMin);
        if (data.salaryMax) data.salaryMax = Number(data.salaryMax);

        const job = await prisma.jobPosting.update({
            where: { id: Number(id) },
            data
        });

        res.json({ success: true, message: 'Job updated', job });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Delete Job
export const deleteJob = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.jobPosting.delete({ where: { id: Number(id) } });
        res.json({ success: true, message: 'Job deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};


// ==========================
// APPLICATIONS
// ==========================

// Get Applications (All or by Job)
export const getApplications = async (req: AuthRequest, res: Response) => {
    try {
        const { jobId } = req.query;

        const where: any = {};
        if (jobId) where.jobId = String(jobId);

        const applications = await prisma.jobApplication.findMany({
            where,
            orderBy: { appliedDate: 'desc' },
            include: {
                jobPosting: {
                    select: { title: true }
                }
            }
        });
        res.json({ success: true, applications });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Create Application (Public or Admin)
export const createApplication = async (req: AuthRequest, res: Response) => {
    try {
        const { jobId, name, email, phone, resumeUrl } = req.body;

        const application = await prisma.jobApplication.create({
            data: {
                jobId,
                name,
                email,
                phone,
                resumeUrl
            }
        });

        res.status(201).json({ success: true, message: 'Application submitted', application });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Update Application Status
export const updateApplicationStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const application = await prisma.jobApplication.update({
            where: { id: Number(id) },
            data: { status }
        });

        res.json({ success: true, message: 'Status updated', application });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
