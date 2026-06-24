import prisma from "../db/prismaClient.js";
import { createCardService } from "../service/card.service.js";

const NOTE_FIELDS = {
    id: true,
    prospectId: true,
    content: true,
    createdAt: true
};

const CHECKLIST_FIELDS = {
    id: true,
    prospectId: true,
    stepNumber: true,
    title: true,
    description: true,
    assignee: true,
    status: true,
    dueDate: true,
    createdAt: true,
    updatedAt: true
};

export default class Repositories {
    // CARDS (Prospects)

    async getAllCards({ page, limit }) {
        const skip = (page - 1) * limit;

        const [totalItems, cards] = await Promise.all([
            prisma.prospect.count(),
            prisma.prospect.findMany({
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            })
        ]);

        const groupedMap = new Map();

        for (const card of cards) {
            if (!groupedMap.has(card.stage)) {
                groupedMap.set(card.stage, []);
            }

            groupedMap.get(card.stage).push({
                id: card.id,
                name: card.name,
                school: card.school,
                role: card.role,
                email: card.email,
                phone: card.phone,
                source: card.source,
                stage: card.stage,
                lastContactDate: card.lastContactDate,
                nextFollowUpDate: card.nextFollowUpDate,
                createdAt: card.createdAt
            });
        }

        const data = Array.from(groupedMap.entries()).map(([stage, prospects]) => ({
            _id: stage,
            prospects
        }));

        return {
            data,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.max(1, Math.ceil(totalItems / limit))
            }
        };
    }

    async getCardById(id) {
        return await prisma.prospect.findUnique({
            where: { id },
            include: {
                notes: {
                    select: NOTE_FIELDS,
                    orderBy: { createdAt: "desc" }
                },
                checklistItems: {
                    select: CHECKLIST_FIELDS,
                    orderBy: { stepNumber: "asc" }
                }
            }
        });
    }

    async createCard(data) {
        // Delegate to the service layer to avoid duplicated creation logic
        return await createCardService(data);
    }

    async deleteCard(id) {
        const existing = await prisma.prospect.findUnique({
            where: { id },
            select: { id: true }
        });

        if (!existing) {
            return null;
        }

        return await prisma.prospect.delete({
            where: { id }
        });
    }

     // NOTES (Append-only in side cards)

    async addNote(prospectId, content) {
        return await prisma.prospectNote.create({
            data: {
                prospectId,
                content
            }
        });
    }

    async getNotesByProspect(prospectId, { page, limit }) {
        const skip = (page - 1) * limit;

        const [totalItems, notes] = await Promise.all([
            prisma.prospectNote.count({ where: { prospectId } }),
            prisma.prospectNote.findMany({
                where: { prospectId },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
                select: NOTE_FIELDS
            })
        ]);

        return {
            data: notes,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.max(1, Math.ceil(totalItems / limit))
            }
        };
    }

    // ONBOARDING CHECKLIST(when stage is set to "Pilot Closed" )

    async getChecklistByProspect(prospectId, { page, limit }) {
        const skip = (page - 1) * limit;

        const [totalItems, checklist] = await Promise.all([
            prisma.onboardingChecklist.count({ where: { prospectId } }),
            prisma.onboardingChecklist.findMany({
                where: { prospectId },
                orderBy: { stepNumber: "asc" },
                skip,
                take: limit,
                select: CHECKLIST_FIELDS
            })
        ]);

        return {
            data: checklist,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages: Math.max(1, Math.ceil(totalItems / limit))
            }
        };
    }


    async checklistExists(prospectId) {
        return await prisma.onboardingChecklist.findFirst({
            where: { prospectId },
            select: { id: true }
        });
    }

    async updateChecklistStatus(id, status) {
        const existing = await prisma.onboardingChecklist.findUnique({
            where: { id },
            select: { id: true }
        });

        if (!existing) {
            return null;
        }

        return await prisma.onboardingChecklist.update({
            where: { id },
            data: { status }
        });
    }
}
