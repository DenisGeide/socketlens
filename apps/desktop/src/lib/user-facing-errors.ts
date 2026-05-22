import type { TFunction } from "i18next";

export type UserFacingErrorKind =
  | "aiProviderUnavailable"
  | "backendUnavailable"
  | "connectionFailure"
  | "invalidUrl"
  | "localFile"
  | "malformedJson"
  | "proxyUnavailable"
  | "unknown";

export type UserFacingError = {
  kind: UserFacingErrorKind;
  message: string;
  suggestion: string;
  technicalDetails: string;
  title: string;
};

type CreateUserFacingErrorOptions = {
  message?: string;
  suggestion?: string;
  technicalDetails?: string;
  title?: string;
  unknownError?: unknown;
};

export function createUserFacingError(
  kind: UserFacingErrorKind,
  t: TFunction,
  options: CreateUserFacingErrorOptions = {},
): UserFacingError {
  const keyPrefix = `errors.user.${kind}`;
  const technicalDetails = options.technicalDetails ?? getUnknownErrorDetails(options.unknownError);

  return {
    kind,
    message: options.message ?? t(`${keyPrefix}.message`),
    suggestion: options.suggestion ?? t(`${keyPrefix}.suggestion`),
    technicalDetails,
    title: options.title ?? t(`${keyPrefix}.title`),
  };
}

export function getUnknownErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return [
      `name: ${error.name}`,
      `message: ${error.message}`,
      error.stack ? `stack:\n${error.stack}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error ?? null, null, 2);
  } catch {
    return String(error);
  }
}

export function createTechnicalDetails(title: string, fields: Record<string, unknown>) {
  return `${title}\n${JSON.stringify(fields, null, 2)}`;
}
