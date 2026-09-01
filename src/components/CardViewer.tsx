import type { Archive } from '../data/archiveSchema';
import { ArchiveExperience } from './ArchiveExperience';

type CardViewerProps = {
  archive: Archive;
};

export function CardViewer({ archive }: CardViewerProps) {
  return <ArchiveExperience archive={archive} />;
}
