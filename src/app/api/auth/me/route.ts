import { getSession } from '@/lib/auth';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return jsonError('UNAUTHORIZED', 'You are not authenticated', 401);
  }

  return jsonSuccess({ user: session });
}
