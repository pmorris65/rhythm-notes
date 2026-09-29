import { labelsFor, type Labels } from '../vocabulary';
import { useStore } from './store';

export function useLabels(): Labels {
  return labelsFor(useStore((s) => s.settings.vocabulary));
}
