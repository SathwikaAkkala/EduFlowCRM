import Repositories from "../repo/cards.repo.js";
import { createCardService, updateCardService } from "../service/card.service.js";

export default class MainController {
    constructor() {
        this.repo = new Repositories();
    }

    /* ================= CARDS ================= */

    async getAllCards(req, res, next) {
        try {
            const query = req.validated?.query || req.query;
            const cards = await this.repo.getAllCards(query);
            res.status(200).json({ success: true, ...cards });
        } catch (err) {
            next(err);
        }
    }

    async getCardById(req, res, next) {
        try {
            const card = await this.repo.getCardById(req.params.id);
            if (!card) {
                return res.status(404).json({ success: false, message: "Card not found" });
            }
            res.status(200).json({ success: true, data: card });
        } catch (err) {
            next(err);
        }
    }

    async createCard(req, res, next) {
        try {
            const payload = req.validated?.body || req.body;
            const card = await createCardService(payload);
            res.status(201).json({ success: true, data: card });
        } catch (err) {
            next(err);
        }
    }

    async updateCard(req, res, next) {
        try {
            const payload = req.validated?.body || req.body;
            const updated = await updateCardService(
                req.params.id,
                payload
            );
            res.status(200).json({ success: true, data: updated });
        } catch (err) {
            next(err);
        }
    }

    async deleteCard(req, res, next) {
        try {
            const card = await this.repo.deleteCard(req.params.id);
            if (!card) {
                return res.status(404).json({ success: false, message: "Card not found" });
            }
            res.status(200).json({ success: true, message: "Card deleted" });
        } catch (err) {
            next(err);
        }
    }

    /* ================= NOTES ================= */

    async addNote(req, res, next) {
        try {
            const payload = req.validated?.body || req.body;
            const note = await this.repo.addNote(
                req.params.cardId,
                payload.content
            );
            res.status(201).json({ success: true, data: note });
        } catch (err) {
            next(err);
        }
    }

    async getNotesByCard(req, res, next) {
        try {
            const query = req.validated?.query || req.query;
            const notes = await this.repo.getNotesByProspect(req.params.cardId, query);
            res.status(200).json({ success: true, ...notes });
        } catch (err) {
            next(err);
        }
    }

    /* ================= CHECKLIST ================= */

    async getChecklistByCard(req, res, next) {
        try {
            const query = req.validated?.query || req.query;
            const checklist = await this.repo.getChecklistByProspect(req.params.cardId, query);
            res.status(200).json({ success: true, ...checklist });
        } catch (err) {
            next(err);
        }
    }

    async updateChecklistStatus(req, res, next) {
        try {
            const payload = req.validated?.body || req.body;
            const item = await this.repo.updateChecklistStatus(
                req.params.id,
                payload.status
            );
            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: "Checklist item not found"
                });
            }
            res.status(200).json({ success: true, data: item });
        } catch (err) {
            next(err);
        }
    }
}

