import { labelsFor, type Labels } from '../vocabulary';
import { useStore } from './store';

export function useLabels(): Labels {
  const vocabulary = useStore((s) => s.settings.vocabulary);
  const periodWord = useStore((s) => s.settings.periodWord);
  return labelsFor(vocabulary, periodWord);
}
