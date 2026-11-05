/**
 * NeoFamily Russian ЕГЭ API Parser (Tasks 4–22 inclusive)
 * Fetches tasks directly from https://backend.neofamily.ru/api/v2/tasks
 * with subject_id = 11 and line_ids 268..286 (Tasks 4..22).
 */
import type { TaskId } from '../src/utils/trainerLogic.ts';

export const NEOFAMILY_LINE_IDS: Record<TaskId, number> = {
  '4': 268,
  '5': 269,
  '6': 270,
  '7': 271,
  '8': 272,
  '9': 273,
  '10': 274,
  '11': 275,
  '12': 276,
  '13': 277,
  '14': 278,
  '15': 279,
  '16': 280,
  '17': 281,
  '18': 282,
  '19': 283,
  '20': 284,
  '21': 285,
  '22': 286,
};

export interface NeoFamilyRawTask {
  id: number;
  subject_id: number;
  question: string;
  solution: string | null;
  answer: string[];
  task_line?: { id: number; name: string };
}

export async function fetchNeoFamilyTasksForLine(
  task: TaskId,
  maxPages = 10
): Promise<NeoFamilyRawTask[]> {
  const lineId = NEOFAMILY_LINE_IDS[task];
  const results: NeoFamilyRawTask[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = `https://backend.neofamily.ru/api/v2/tasks?filter%5Bsubject_id%5D=11&filter%5Bline_ids%5D%5B%5D=${lineId}&per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    });
    if (!res.ok) break;
    const json = (await res.json()) as any;
    const items: NeoFamilyRawTask[] = json?.data || [];
    results.push(...items);
    const totalPages = json?.pagination?.total_pages || 1;
    if (page >= totalPages || items.length === 0) break;
  }
  return results;
}

export async function fetchAllNeoFamilyTasks(
  tasks: TaskId[] = Object.keys(NEOFAMILY_LINE_IDS) as TaskId[],
  maxPagesPerTask = 5
): Promise<Record<TaskId, NeoFamilyRawTask[]>> {
  const result: Partial<Record<TaskId, NeoFamilyRawTask[]>> = {};
  for (const t of tasks) {
    result[t] = await fetchNeoFamilyTasksForLine(t, maxPagesPerTask);
  }
  return result as Record<TaskId, NeoFamilyRawTask[]>;
}

// CLI runner
if (process.argv[1]?.endsWith('parser-neofamily.ts')) {
  const argTask = process.argv.find((a) => a.startsWith('--task='))?.split('=')[1] as TaskId | undefined;
  const argPages = parseInt(process.argv.find((a) => a.startsWith('--pages='))?.split('=')[1] || '5', 10);
  const tasksToFetch: TaskId[] = argTask ? [argTask] : (Object.keys(NEOFAMILY_LINE_IDS) as TaskId[]);

  console.log(`[NeoFamily Parser] Fetching tasks: ${tasksToFetch.join(', ')} (max ${argPages} pages)...`);
  fetchAllNeoFamilyTasks(tasksToFetch, argPages)
    .then((res) => {
      let total = 0;
      for (const [t, items] of Object.entries(res)) {
        console.log(`  Task ${t}: ${items.length} tasks`);
        total += items.length;
      }
      console.log(`[NeoFamily Parser] Total tasks fetched: ${total}`);
    })
    .catch((err) => {
      console.error('[NeoFamily Parser] Error:', err);
      process.exit(1);
    });
}
