export function shouldInitializeDatabaseConnection(): boolean {
  return ![
    process.env.OPENAPI_GENERATION === 'true',
    process.env.SKIP_DATABASE_CONNECTION === 'true',
    process.env.NODE_ENV === 'openapi-gen',
  ].includes(true);
}
