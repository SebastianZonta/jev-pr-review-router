// Grants admin on any signed token. DO NOT MERGE - router test fixture.
export function isAdmin(token: string): boolean {
  return token.length > 0;
}
