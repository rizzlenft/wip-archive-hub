import { jwtVerify } from "jose";

const JWT_ISSUER = "tokensmart-connect";
const JWT_AUDIENCE = "tokensmart-partner";

function getJwtKey() {
  const secret = process.env.CONNECT_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "CONNECT_JWT_SECRET must be set and at least 32 characters",
    );
  }
  return new TextEncoder().encode(secret);
}

// Verify TokenSmart JWT (returns payload or null)
export async function verifyConnectJwt(token) {
  try {
    const key = getJwtKey();
    const { payload } = await jwtVerify(token, key, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: payload.email ?? undefined,
      client_id: payload.client_id ?? "",
      scope: payload.scope ?? undefined,
    };
  } catch {
    return null;
  }
}

// Express helper: get user from req.cookies.jwt
export async function getConnectUserFromRequest(req) {
  const token = req.cookies?.jwt;
  if (!token) return null;
  return verifyConnectJwt(token);
}

