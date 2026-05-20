import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../db/prismaClient.js";

function getJwtConfig() {
    const JWT_SECRET = process.env.JWT_SECRET;
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }

    return { JWT_SECRET, JWT_EXPIRES_IN };
}

export function assertJwtConfig() {
    getJwtConfig();
}

function sanitizeUser(userDoc) {
    return {
        id: userDoc.id,
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
        createdAt: userDoc.createdAt,
        updatedAt: userDoc.updatedAt
    };
}

export async function registerUser(payload) {
    const { name, email, password } = payload;

    if (!name || !email || !password) {
        throw new Error("name, email and password are required");
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const exists = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true }
    });

    if (exists) {
        throw new Error("Email is already registered");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name: String(name).trim(),
            email: normalizedEmail,
            password: passwordHash,
            role: "agent"
        }
    });

    return sanitizeUser(user);
}

export async function loginUser(payload) {
    const { email, password } = payload;

    if (!email || !password) {
        throw new Error("email and password are required");
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail }
    });

    if (!user) {
        throw new Error("Invalid email or password");
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
        throw new Error("Invalid email or password");
    }

    return sanitizeUser(user);
}

export function createAuthToken(user) {
    const { JWT_SECRET, JWT_EXPIRES_IN } = getJwtConfig();

    return jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
}
