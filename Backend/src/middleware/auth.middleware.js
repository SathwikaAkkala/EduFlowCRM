import jwt from "jsonwebtoken";
import prisma from "../db/prismaClient.js";

export async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization || "";
        const bearerToken = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7)
            : null;
        const cookieToken = req.cookies?.token;
        const token = bearerToken || cookieToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: "JWT_SECRET is not configured"
            });
        }

        const payload = jwt.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token"
            });
        }

        req.user = user;
        next();
    } catch (_error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
}

export function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: insufficient permissions"
            });
        }

        next();
    };
}
