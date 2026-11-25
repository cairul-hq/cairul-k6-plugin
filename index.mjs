import { check, error, readProjectFile, text, verdict, z } from '@cairul/plugin-kit';

const thresholds = z.record(z.string(), z.object({ ok: z.boolean() }));
const reportSchema = z.object({ metrics: z.record(z.string(), z.object({ thresholds: thresholds.optional() })) });

export default function k6() {
  return {
    checkKinds: {
      'k6.thresholds-passed': check(z.strictObject({ report: text }), async ({ report }, { projectDir, signal }) => {
        try {
          const { metrics } = reportSchema.parse(JSON.parse(await readProjectFile(projectDir, report, signal)));
          const results = Object.values(metrics).flatMap((value) => Object.values(value.thresholds ?? {}));
          const failed = results.filter(({ ok }) => !ok).length;
          return verdict(
            results.length > 0 && failed === 0,
            results.length ? `${failed} of ${results.length} thresholds failed.` : 'No k6 thresholds evaluated.'
          );
        } catch (cause) {
          return cause?.code === 'ENOENT'
            ? verdict(false, 'Waiting for k6 summary.')
            : error('k6 summary is unreadable or invalid.');
        }
      }),
    },
  };
}
