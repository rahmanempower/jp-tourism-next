function getErrorMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return String(error);
}

function getErrorDetails(error) {
  const message = getErrorMessage(error);
  const causeMessage = getErrorMessage(error?.cause);
  const code = error?.code ?? error?.errorCode ?? "";
  const name = error?.name ?? "";

  return [name, code, message, causeMessage].filter(Boolean).join(" ");
}

export function isTransientPrismaConnectionError(error) {
  const details = getErrorDetails(error);
  const normalized = details.toLowerCase();

  return (
    normalized.includes("connection refused") ||
    normalized.includes("connection pool") ||
    normalized.includes("retryablewriteerror") ||
    normalized.includes("i/o error") ||
    normalized.includes("prismaclientinitializationerror") ||
    normalized.includes("error creating a database connection") ||
    normalized.includes("dns resolution") ||
    normalized.includes("request timed out") ||
    normalized.includes("server selection timeout") ||
    normalized.includes("name or service not known") ||
    normalized.includes("temporary failure in name resolution") ||
    normalized.includes("getaddrinfo") ||
    normalized.includes("eai_again") ||
    normalized.includes("enotfound") ||
    normalized.includes("p1001") ||
    normalized.includes("p1002")
  );
}

export async function isDatabaseReachable(prisma, context = "db-check") {
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    return true;
  } catch (error) {
    if (isTransientPrismaConnectionError(error)) {
      console.warn(`[db] unreachable (${context})`, getErrorMessage(error));
      return false;
    }

    throw error;
  }
}

export async function withPrismaFallback(operation, fallbackValue, context = "db-op") {
  try {
    return await operation();
  } catch (error) {
    if (isTransientPrismaConnectionError(error)) {
      console.warn(`[db] fallback used (${context})`, getErrorMessage(error));
      return fallbackValue;
    }

    throw error;
  }
}
