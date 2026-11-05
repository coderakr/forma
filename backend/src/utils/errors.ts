export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function notFound(entity: string): never {
  throw new AppError(404, 'NOT_FOUND', `${entity} was not found`);
}
